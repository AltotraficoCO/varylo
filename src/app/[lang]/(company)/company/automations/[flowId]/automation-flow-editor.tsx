'use client';

import { useState, useCallback, useTransition, useMemo, useRef } from 'react';
import {
    ReactFlowProvider,
    useNodesState, useEdgesState, useReactFlow,
    type Node, type Edge, type Connection, type NodeTypes, type OnConnect,
    MarkerType, Panel,
} from '@xyflow/react';
import { FlowCanvasShell, dagreLayout } from '@/components/flow/flow-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, ArrowLeft, Plus, GitBranch, Bot, Copy, Check, Trash2, X, RefreshCw, History, LayoutGrid, Code2, Clock, FlaskConical, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { AutomationGraph, AutomationFlowNode } from '@/types/automation';
import { AutomationNode, type AutomationNodeData } from './automation-node';
import { saveAutomationGraph, setAutomationStatus, regenerateWebhookSecret, testAutomationFlow, type TestFlowResult } from '../actions';

type AgentOpt = { id: string; name: string };
type ChannelOpt = { id: string; label: string };

function newId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).substring(2, 8)}`;
}

function graphToReactFlow(
    graph: AutomationGraph,
    agents: AgentOpt[],
): { nodes: Node<AutomationNodeData>[]; edges: Edge[] } {
    const ids = Object.keys(graph.nodes);
    const nodes: Node<AutomationNodeData>[] = ids.map((id, i) => {
        const fn = graph.nodes[id];
        return {
            id,
            type: 'automationNode',
            position: fn.position || { x: i * 280, y: 100 },
            data: { flowNode: fn, agentName: agents.find(a => a.id === fn.agentId)?.name },
        };
    });

    const edges: Edge[] = [];
    const edge = (source: string, sourceHandle: string | undefined, target: string, color: string) => ({
        id: `${source}-${sourceHandle || 'out'}-${target}`,
        source, sourceHandle, target,
        type: 'smoothstep', animated: true,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
    });
    ids.forEach(id => {
        const fn = graph.nodes[id];
        if (fn.type === 'trigger' && fn.next && graph.nodes[fn.next]) edges.push(edge(id, undefined, fn.next, '#6366F1'));
        if (fn.type === 'cron' && fn.next && graph.nodes[fn.next]) edges.push(edge(id, undefined, fn.next, '#059669'));
        if (fn.type === 'code' && fn.next && graph.nodes[fn.next]) edges.push(edge(id, undefined, fn.next, '#475569'));
        if (fn.type === 'condition') {
            (fn.cases || []).forEach((c, i) => {
                if (c.next && graph.nodes[c.next]) edges.push(edge(id, `case-${i}`, c.next, '#F59E0B'));
            });
            if (fn.elseNext && graph.nodes[fn.elseNext]) edges.push(edge(id, 'else', fn.elseNext, '#9CA3AF'));
        }
    });
    return { nodes, edges };
}

function FlowCanvas({ flowId, initialGraph, initialStatus, secret: initialSecret, agents, channels, backHref }: {
    flowId: string;
    initialGraph: AutomationGraph;
    initialStatus: string;
    secret: string;
    agents: AgentOpt[];
    channels: ChannelOpt[];
    backHref: string;
}) {
    const { fitView } = useReactFlow();
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isPending, startTransition] = useTransition();
    const [graph, setGraph] = useState<AutomationGraph>(initialGraph);
    const [status, setStatus] = useState(initialStatus);
    const [secret, setSecret] = useState(initialSecret);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/automations/${flowId}/trigger`
        : `/api/automations/${flowId}/trigger`;

    const updateNode = useCallback((id: string, updates: Partial<AutomationFlowNode>) => {
        setGraph(prev => ({ ...prev, nodes: { ...prev.nodes, [id]: { ...prev.nodes[id], ...updates } } }));
    }, []);

    const deleteNode = useCallback((id: string) => {
        setGraph(prev => {
            if (prev.nodes[id]?.type === 'trigger') return prev;
            const nodes = { ...prev.nodes };
            delete nodes[id];
            // clean dangling references
            Object.values(nodes).forEach(n => {
                if (n.next === id) n.next = undefined;
                if (n.elseNext === id) n.elseNext = undefined;
                if (n.cases) n.cases = n.cases.map(c => (c.next === id ? { ...c, next: '' } : c));
            });
            return { ...prev, nodes };
        });
        setSelectedId(cur => (cur === id ? null : cur));
    }, []);

    const { nodes: rfNodes, edges: rfEdges } = useMemo(() => graphToReactFlow(graph, agents), [graph, agents]);
    const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);
    useMemo(() => { setNodes(rfNodes); setEdges(rfEdges); }, [rfNodes, rfEdges, setNodes, setEdges]);

    const onConnect: OnConnect = useCallback((conn: Connection) => {
        if (!conn.source || !conn.target) return;
        const src = graph.nodes[conn.source];
        if (!src) return;
        if (src.type === 'trigger' || src.type === 'code' || src.type === 'cron') {
            updateNode(conn.source, { next: conn.target });
        } else if (src.type === 'condition') {
            if (conn.sourceHandle === 'else') {
                updateNode(conn.source, { elseNext: conn.target });
            } else if (conn.sourceHandle?.startsWith('case-')) {
                const idx = parseInt(conn.sourceHandle.replace('case-', ''), 10);
                const cases = [...(src.cases || [])];
                if (cases[idx]) { cases[idx] = { ...cases[idx], next: conn.target }; updateNode(conn.source, { cases }); }
            }
        }
    }, [graph, updateNode]);

    const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
        updateNode(node.id, { position: { x: node.position.x, y: node.position.y } });
    }, [updateNode]);

    const addNode = useCallback((type: 'condition' | 'dispatch_agent' | 'code' | 'cron') => {
        const id = newId(type === 'condition' ? 'cond' : type === 'code' ? 'code' : type === 'cron' ? 'cron' : 'agent');
        // place to the right of the rightmost node (flow runs left → right)
        const rightmost = Object.values(graph.nodes).reduce((a, b) => ((b.position?.x ?? 0) > (a.position?.x ?? 0) ? b : a), graph.nodes[graph.startNodeId]);
        const position = { x: (rightmost.position?.x ?? 0) + 280, y: rightmost.position?.y ?? 100 };
        const node: AutomationFlowNode =
            type === 'condition' ? { id, type, field: 'source', cases: [{ value: '', next: '' }], position }
            : type === 'code' ? { id, type, code: '// Recibe `input` (el payload) y devuelve el nuevo objeto.\nreturn input;', position }
            : type === 'cron' ? { id, type, intervalMinutes: 60, position }
            : { id, type, agentId: agents[0]?.id, template: { name: '', language: 'es' }, position };
        setGraph(prev => ({ ...prev, nodes: { ...prev.nodes, [id]: node } }));
        setShowAddMenu(false);
        setTimeout(() => { setSelectedId(id); fitView({ padding: 0.3, duration: 300 }); }, 50);
    }, [graph, agents, fitView]);

    const autoLayout = useCallback(() => {
        const positions = dagreLayout(nodes, edges, { width: 220, height: 110, direction: 'LR' });
        setGraph(prev => {
            const n = { ...prev.nodes };
            Object.keys(n).forEach(id => { if (positions[id]) n[id] = { ...n[id], position: positions[id] }; });
            return { ...prev, nodes: n };
        });
        setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50);
    }, [nodes, edges, fitView]);

    const handleSave = () => {
        startTransition(async () => {
            try {
                await saveAutomationGraph(flowId, graph);
                toast.success('Flujo guardado');
            } catch {
                toast.error('No se pudo guardar');
            }
        });
    };

    const togglePublish = () => {
        const next = status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
        if (next === 'PUBLISHED') {
            const problems = validateGraph(graph);
            if (problems.length) { toast.error(problems[0]); return; }
        }
        startTransition(async () => {
            try {
                await saveAutomationGraph(flowId, graph);
                await setAutomationStatus(flowId, next);
                setStatus(next);
                toast.success(next === 'PUBLISHED' ? 'Flujo publicado' : 'Flujo en borrador');
            } catch {
                toast.error('No se pudo cambiar el estado');
            }
        });
    };

    const regenSecret = () => {
        if (!confirm('¿Regenerar el secret? El anterior dejará de funcionar.')) return;
        startTransition(async () => {
            const s = await regenerateWebhookSecret(flowId);
            setSecret(s);
            toast.success('Secret regenerado');
        });
    };

    // Test mode: persist the current graph first so the dry-run reflects the canvas.
    const onTest = useCallback(async (payloadJson: string): Promise<TestFlowResult> => {
        await saveAutomationGraph(flowId, graph);
        return testAutomationFlow(flowId, payloadJson);
    }, [flowId, graph]);

    const nodeTypes: NodeTypes = useMemo(() => ({ automationNode: AutomationNode }), []);
    const selected = selectedId ? graph.nodes[selectedId] : null;

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            <div className="lg:hidden flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-sm text-muted-foreground max-w-xs">El editor de flujos requiere pantalla grande. Ábrelo desde tu computadora.</p>
                <Link href={backHref}><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
            </div>

            <div className="hidden lg:flex flex-col h-full">
                {/* Top bar */}
                <div className="flex items-center justify-between py-3 px-4 border-b bg-background z-10">
                    <Link href={backHref}><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
                    <div className="flex items-center gap-2">
                        <Link href={`${backHref}/${flowId}/runs`}>
                            <Button variant="ghost" size="sm"><History className="mr-2 h-4 w-4" />Ejecuciones</Button>
                        </Link>
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                        </span>
                        <Button onClick={handleSave} disabled={isPending} variant="outline" size="sm"><Save className="mr-2 h-4 w-4" />Guardar</Button>
                        <Button onClick={togglePublish} disabled={isPending} size="sm" variant={status === 'PUBLISHED' ? 'destructive' : 'default'}>
                            {status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                        </Button>
                    </div>
                </div>

                {/* Hint: webhook details live in the Webhook node */}
                <div className="px-4 py-1.5 border-b bg-muted/30 text-[11px] text-muted-foreground">
                    Haz clic en el nodo <span className="font-medium text-foreground">Webhook</span> para ver su URL, secret y el modo de prueba.
                </div>

                {/* Canvas + panel */}
                <div className="flex-1 flex relative">
                    <div ref={canvasRef} className={`flex-1 transition-all ${selected ? 'mr-[360px]' : ''}`}>
                        <FlowCanvasShell
                            nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            onConnect={onConnect} onNodeDragStop={onNodeDragStop}
                            onNodeClick={(_, n) => setSelectedId(n.id)}
                            onPaneClick={() => { setSelectedId(null); setShowAddMenu(false); }}
                            nodeTypes={nodeTypes}
                        >
                            <Panel position="bottom-center">
                                <div className="flex items-center">
                                <div className="relative">
                                    {showAddMenu && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border rounded-xl shadow-xl p-2 w-[220px] space-y-1">
                                            <button onClick={() => addNode('cron')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted text-left">
                                                <Clock className="h-4 w-4 text-[#059669]" /><span>Cron (programado)</span>
                                            </button>
                                            <button onClick={() => addNode('condition')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted text-left">
                                                <GitBranch className="h-4 w-4 text-[#F59E0B]" /><span>Condición</span>
                                            </button>
                                            <button onClick={() => addNode('code')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted text-left">
                                                <Code2 className="h-4 w-4 text-[#475569]" /><span>Código JS</span>
                                            </button>
                                            <button onClick={() => addNode('dispatch_agent')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted text-left">
                                                <Bot className="h-4 w-4 text-[#8B5CF6]" /><span>Despachar a Agente IA</span>
                                            </button>
                                        </div>
                                    )}
                                    <Button onClick={() => setShowAddMenu(v => !v)} className="shadow-lg"><Plus className="mr-2 h-4 w-4" />Agregar nodo</Button>
                                </div>
                                <Button onClick={autoLayout} variant="outline" className="shadow-lg bg-background ml-2"><LayoutGrid className="mr-2 h-4 w-4" />Auto-organizar</Button>
                                </div>
                            </Panel>
                        </FlowCanvasShell>
                    </div>

                    {selected && selectedId && (
                        <NodeConfigPanel
                            node={selected}
                            agents={agents}
                            channels={channels}
                            webhookUrl={webhookUrl}
                            secret={secret}
                            onRegenSecret={regenSecret}
                            onTest={onTest}
                            onUpdate={(u) => updateNode(selectedId, u)}
                            onDelete={() => deleteNode(selectedId)}
                            onClose={() => setSelectedId(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function validateGraph(graph: AutomationGraph): string[] {
    const problems: string[] = [];
    const trigger = graph.nodes[graph.startNodeId];
    const hasCronEntry = Object.values(graph.nodes).some(n => n.type === 'cron' && n.next);
    if (!trigger?.next && !hasCronEntry) problems.push('Conecta el Webhook (o un nodo Cron) a algo antes de publicar.');
    Object.values(graph.nodes).forEach(n => {
        if (n.type === 'dispatch_agent') {
            if (!n.agentId) problems.push('Un nodo de Agente IA no tiene agente seleccionado.');
            if (!n.template?.name) problems.push('Un nodo de Agente IA no tiene plantilla.');
        }
        if (n.type === 'condition' && !n.field) problems.push('Una Condición no tiene campo definido.');
    });
    return problems;
}

function NodeConfigPanel({ node, agents, channels, webhookUrl, secret, onRegenSecret, onTest, onUpdate, onDelete, onClose }: {
    node: AutomationFlowNode;
    agents: AgentOpt[];
    channels: ChannelOpt[];
    webhookUrl: string;
    secret: string;
    onRegenSecret: () => void;
    onTest: (payloadJson: string) => Promise<TestFlowResult>;
    onUpdate: (u: Partial<AutomationFlowNode>) => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const [copied, setCopied] = useState<string | null>(null);
    const [testPayload, setTestPayload] = useState('{\n  "phone": "573001234567",\n  "name": "Prueba",\n  "source": "ads_form"\n}');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestFlowResult | null>(null);

    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        toast.success('Copiado');
        setTimeout(() => setCopied(null), 1500);
    };

    const runTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            setTestResult(await onTest(testPayload));
        } catch {
            setTestResult({ status: 'ERROR', path: [], error: 'Error al probar.' });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="absolute right-0 top-0 bottom-0 w-[360px] border-l bg-background shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">
                    {node.type === 'trigger' ? 'Webhook (entrada)'
                        : node.type === 'cron' ? 'Cron (programado)'
                        : node.type === 'condition' ? 'Condición'
                        : node.type === 'code' ? 'Código JS'
                        : 'Despachar a Agente IA'}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>

            <div className="p-4 space-y-4">
                {node.type === 'trigger' && (
                    <>
                        <p className="text-xs text-muted-foreground">
                            Punto de entrada. Tu app envía el lead a esta URL (POST, con el header del secret) y el flujo arranca aquí.
                        </p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">URL del webhook</Label>
                            <div className="flex gap-2">
                                <Input value={webhookUrl} readOnly className="h-9 text-[11px] font-mono bg-muted/40" />
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => copyText(webhookUrl, 'url')}>
                                    {copied === 'url' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Secret (header <code className="text-[10px]">x-automation-secret</code>)</Label>
                            <div className="flex gap-2">
                                <Input value={secret} readOnly className="h-9 text-[11px] font-mono bg-muted/40" />
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => copyText(secret, 'secret')}>
                                    {copied === 'secret' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={onRegenSecret} title="Regenerar secret">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                            <Label className="text-xs flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5" />Modo prueba</Label>
                            <p className="text-[11px] text-muted-foreground">Corre el flujo con este payload sin enviar nada real. Guarda el flujo automáticamente.</p>
                            <Textarea value={testPayload} onChange={e => setTestPayload(e.target.value)} spellCheck={false}
                                className="font-mono text-[11px] min-h-[120px]" />
                            <Button type="button" size="sm" className="w-full" onClick={runTest} disabled={testing}>
                                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                                Probar flujo
                            </Button>
                            {testResult && (
                                <div className={`rounded-md border px-3 py-2 text-[11px] space-y-1 ${testResult.status === 'SUCCESS' ? 'border-green-200 bg-green-50' : testResult.status === 'NO_MATCH' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                                    <p className="font-medium">
                                        {testResult.status === 'SUCCESS' ? '✅ Llegaría al agente' : testResult.status === 'NO_MATCH' ? '⚠️ Ninguna rama coincidió' : '❌ Error'}
                                    </p>
                                    {testResult.dispatch && (
                                        <p>→ <span className="font-medium">{testResult.dispatch.agentName}</span>{testResult.dispatch.template ? ` · plantilla "${testResult.dispatch.template}"` : ''}</p>
                                    )}
                                    {testResult.error && <p className="opacity-90">{testResult.error}</p>}
                                    {testResult.path.length > 0 && <p className="opacity-70">camino: {testResult.path.join(' → ')}</p>}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {node.type === 'cron' && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Ejecutar cada (minutos)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" min={5} step={5}
                                    value={node.intervalMinutes ?? 60}
                                    onChange={e => onUpdate({ intervalMinutes: Math.max(5, parseInt(e.target.value || '0', 10) || 0), schedule: undefined })}
                                    className="h-9 text-[13px] w-28"
                                />
                                <span className="text-sm text-muted-foreground">minutos</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {[15, 30, 60, 360, 720, 1440].map(m => (
                                <button key={m} onClick={() => onUpdate({ intervalMinutes: m, schedule: undefined })}
                                    className="text-[11px] px-2 py-1 rounded-md border hover:bg-muted">
                                    {m < 60 ? `${m} min` : m < 1440 ? `${m / 60} h` : `${m / 1440} día`}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Arranca el flujo cada N minutos (precisión ~5 min, mínimo 5). Útil con un nodo de Código que genere o traiga los datos.
                        </p>
                    </>
                )}

                {node.type === 'condition' && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Campo del payload a evaluar</Label>
                            <Input value={node.field || ''} onChange={e => onUpdate({ field: e.target.value })} placeholder="source" className="h-9 text-[13px]" />
                            <p className="text-[11px] text-muted-foreground">Ej: si tu app manda {`{ "source": "ads_form" }`}, pon <code>source</code>.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Ramas (valor = nodo destino)</Label>
                            {(node.cases || []).map((c, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">=</span>
                                    <Input value={c.value} onChange={e => {
                                        const cases = [...(node.cases || [])];
                                        cases[i] = { ...cases[i], value: e.target.value };
                                        onUpdate({ cases });
                                    }} placeholder="ads_form" className="h-9 text-[13px]" />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                        const cases = (node.cases || []).filter((_, j) => j !== i);
                                        onUpdate({ cases });
                                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" className="w-full" onClick={() => onUpdate({ cases: [...(node.cases || []), { value: '', next: '' }] })}>
                                <Plus className="mr-2 h-3.5 w-3.5" />Agregar rama
                            </Button>
                            <p className="text-[11px] text-muted-foreground">Conecta cada rama (y el “else”) a un nodo arrastrando desde su punto a la derecha.</p>
                        </div>
                    </>
                )}

                {node.type === 'code' && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Código JavaScript</Label>
                            <Textarea
                                value={node.code || ''}
                                onChange={e => onUpdate({ code: e.target.value })}
                                spellCheck={false}
                                className="font-mono text-[12px] min-h-[220px] leading-relaxed"
                                placeholder={'// Recibe `input` (el payload) y devuelve el nuevo objeto.\nreturn { ...input, vip: input.monto > 1000 };'}
                            />
                        </div>
                        <div className="text-[11px] text-muted-foreground space-y-1">
                            <p>Recibes el payload en <code>input</code> y debes <code>return</code> el nuevo objeto, que pasa al siguiente nodo.</p>
                            <p>Corre aislado (sin internet, archivos ni acceso al servidor), con límite de 1s y 16&nbsp;MB.</p>
                        </div>
                    </>
                )}

                {node.type === 'dispatch_agent' && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Agente IA</Label>
                            <select value={node.agentId || ''} onChange={e => onUpdate({ agentId: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]">
                                <option value="">Selecciona…</option>
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Canal (opcional)</Label>
                            <select value={node.channelId || ''} onChange={e => onUpdate({ channelId: e.target.value || undefined })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]">
                                <option value="">WhatsApp por defecto</option>
                                {channels.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Plantilla de apertura (Meta)</Label>
                            <Input value={node.template?.name || ''} onChange={e => onUpdate({ template: { name: e.target.value, language: node.template?.language || 'es', body: node.template?.body } })}
                                placeholder="apertura_ads" className="h-9 text-[13px]" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Idioma de la plantilla</Label>
                            <Input value={node.template?.language || 'es'} onChange={e => onUpdate({ template: { name: node.template?.name || '', language: e.target.value, body: node.template?.body } })}
                                placeholder="es" className="h-9 text-[13px]" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">La plantilla debe estar aprobada en Meta. El agente toma la charla cuando el lead responde.</p>
                    </>
                )}

                {node.type !== 'trigger' && (
                    <Button variant="outline" size="sm" className="w-full text-destructive" onClick={onDelete}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" />Eliminar nodo
                    </Button>
                )}
            </div>
        </div>
    );
}

export function AutomationFlowEditor(props: {
    flowId: string;
    initialGraph: AutomationGraph;
    initialStatus: string;
    secret: string;
    agents: AgentOpt[];
    channels: ChannelOpt[];
    backHref: string;
}) {
    return (
        <ReactFlowProvider>
            <FlowCanvas {...props} />
        </ReactFlowProvider>
    );
}
