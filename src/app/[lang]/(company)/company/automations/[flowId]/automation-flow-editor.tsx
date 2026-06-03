'use client';

import { useState, useCallback, useTransition, useMemo, useRef } from 'react';
import {
    ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
    useNodesState, useEdgesState, useReactFlow,
    type Node, type Edge, type Connection, type NodeTypes, type OnConnect,
    MarkerType, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, ArrowLeft, Plus, GitBranch, Bot, Copy, Check, Trash2, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { AutomationGraph, AutomationFlowNode } from '@/types/automation';
import { AutomationNode, type AutomationNodeData } from './automation-node';
import { saveAutomationGraph, setAutomationStatus, regenerateWebhookSecret } from '../actions';

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
            position: fn.position || { x: 300, y: i * 180 },
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
    const [copied, setCopied] = useState<string | null>(null);

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
        if (src.type === 'trigger') {
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

    const addNode = useCallback((type: 'condition' | 'dispatch_agent') => {
        const id = newId(type === 'condition' ? 'cond' : 'agent');
        const lowest = Object.values(graph.nodes).reduce((a, b) => ((b.position?.y ?? 0) > (a.position?.y ?? 0) ? b : a), graph.nodes[graph.startNodeId]);
        const position = { x: (lowest.position?.x ?? 300) + (type === 'condition' ? 0 : 340), y: (lowest.position?.y ?? 0) + 220 };
        const node: AutomationFlowNode = type === 'condition'
            ? { id, type, field: 'source', cases: [{ value: '', next: '' }], position }
            : { id, type, agentId: agents[0]?.id, template: { name: '', language: 'es' }, position };
        setGraph(prev => ({ ...prev, nodes: { ...prev.nodes, [id]: node } }));
        setShowAddMenu(false);
        setTimeout(() => { setSelectedId(id); fitView({ padding: 0.3, duration: 300 }); }, 50);
    }, [graph, agents, fitView]);

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

    const copy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        toast.success('Copiado');
        setTimeout(() => setCopied(null), 1500);
    };

    const regenSecret = () => {
        if (!confirm('¿Regenerar el secret? El anterior dejará de funcionar.')) return;
        startTransition(async () => {
            const s = await regenerateWebhookSecret(flowId);
            setSecret(s);
            toast.success('Secret regenerado');
        });
    };

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
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                        </span>
                        <Button onClick={handleSave} disabled={isPending} variant="outline" size="sm"><Save className="mr-2 h-4 w-4" />Guardar</Button>
                        <Button onClick={togglePublish} disabled={isPending} size="sm" variant={status === 'PUBLISHED' ? 'destructive' : 'default'}>
                            {status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                        </Button>
                    </div>
                </div>

                {/* Webhook info */}
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs">
                    <span className="text-muted-foreground shrink-0">Webhook:</span>
                    <code className="truncate font-mono text-[11px]">{webhookUrl}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copy(webhookUrl, 'url')}>
                        {copied === 'url' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <span className="text-muted-foreground shrink-0 ml-2">Secret:</span>
                    <code className="truncate font-mono text-[11px]">{secret.slice(0, 14)}…</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copy(secret, 'secret')}>
                        {copied === 'secret' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={regenSecret} title="Regenerar secret">
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                    <span className="ml-auto text-muted-foreground shrink-0">Envíalo en el header <code>x-automation-secret</code></span>
                </div>

                {/* Canvas + panel */}
                <div className="flex-1 flex relative">
                    <div ref={canvasRef} className={`flex-1 transition-all ${selected ? 'mr-[360px]' : ''}`}>
                        <ReactFlow
                            nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            onConnect={onConnect} onNodeDragStop={onNodeDragStop}
                            onNodeClick={(_, n) => setSelectedId(n.id)}
                            onPaneClick={() => { setSelectedId(null); setShowAddMenu(false); }}
                            nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.3 }}
                            defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { strokeWidth: 2 } }}
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background gap={20} size={1} />
                            <Controls showInteractive={false} />
                            <MiniMap nodeStrokeWidth={3} className="!bg-muted/50 !border-border" />
                            <Panel position="bottom-center">
                                <div className="relative">
                                    {showAddMenu && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border rounded-xl shadow-xl p-2 w-[220px] space-y-1">
                                            <button onClick={() => addNode('condition')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted text-left">
                                                <GitBranch className="h-4 w-4 text-[#F59E0B]" /><span>Condición</span>
                                            </button>
                                            <button onClick={() => addNode('dispatch_agent')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted text-left">
                                                <Bot className="h-4 w-4 text-[#8B5CF6]" /><span>Despachar a Agente IA</span>
                                            </button>
                                        </div>
                                    )}
                                    <Button onClick={() => setShowAddMenu(v => !v)} className="shadow-lg"><Plus className="mr-2 h-4 w-4" />Agregar nodo</Button>
                                </div>
                            </Panel>
                        </ReactFlow>
                    </div>

                    {selected && selectedId && (
                        <NodeConfigPanel
                            node={selected}
                            agents={agents}
                            channels={channels}
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
    if (!trigger?.next) problems.push('Conecta el nodo Webhook a algo antes de publicar.');
    Object.values(graph.nodes).forEach(n => {
        if (n.type === 'dispatch_agent') {
            if (!n.agentId) problems.push('Un nodo de Agente IA no tiene agente seleccionado.');
            if (!n.template?.name) problems.push('Un nodo de Agente IA no tiene plantilla.');
        }
        if (n.type === 'condition' && !n.field) problems.push('Una Condición no tiene campo definido.');
    });
    return problems;
}

function NodeConfigPanel({ node, agents, channels, onUpdate, onDelete, onClose }: {
    node: AutomationFlowNode;
    agents: AgentOpt[];
    channels: ChannelOpt[];
    onUpdate: (u: Partial<AutomationFlowNode>) => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    return (
        <div className="absolute right-0 top-0 bottom-0 w-[360px] border-l bg-background shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">
                    {node.type === 'trigger' ? 'Webhook (entrada)' : node.type === 'condition' ? 'Condición' : 'Despachar a Agente IA'}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>

            <div className="p-4 space-y-4">
                {node.type === 'trigger' && (
                    <p className="text-xs text-muted-foreground">
                        Este es el punto de entrada. Tu app envía el lead a la URL del webhook (arriba) y el flujo arranca aquí.
                        Conéctalo a una Condición o directo a un Agente IA arrastrando desde el punto inferior.
                    </p>
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
