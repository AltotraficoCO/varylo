'use client';

import { useState, useCallback, useTransition, useMemo, useRef } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
    type Node,
    type Edge,
    type Connection,
    type NodeTypes,
    type OnConnect,
    MarkerType,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft, AlertCircle, CheckCircle2, Plus, MessageCircle, User, Bot, XCircle } from 'lucide-react';
import { updateChatbotFlow } from './actions';
import Link from 'next/link';
import type { ChatbotFlow, ChatbotFlowNode, ChatbotFlowOption } from '@/types/chatbot';
import { ChatbotNode } from './chatbot-node';
import { NodeEditPanel } from './node-edit-panel';

function generateId() {
    return `paso_${Math.random().toString(36).substring(2, 8)}`;
}

interface FlowNodeData extends Record<string, unknown> {
    flowNode: ChatbotFlowNode;
    isStart: boolean;
    label: string;
    allNodes: { id: string; label: string }[];
    onUpdate: (nodeId: string, updates: Partial<ChatbotFlowNode>) => void;
    onDelete: (nodeId: string) => void;
    onSelect: (nodeId: string) => void;
}

function chatbotFlowToReactFlow(
    flow: ChatbotFlow,
    nodeLabels: Record<string, string>,
    onUpdate: (nodeId: string, updates: Partial<ChatbotFlowNode>) => void,
    onDelete: (nodeId: string) => void,
    onSelect: (nodeId: string) => void,
    existingPositions?: Record<string, { x: number; y: number }>,
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
    const nodeIds = Object.keys(flow.nodes);
    const allNodes = nodeIds.map(id => ({ id, label: nodeLabels[id] || id }));

    const nodes: Node<FlowNodeData>[] = nodeIds.map((nodeId, index) => {
        const pos = existingPositions?.[nodeId] || {
            x: 250 + (index % 3) * 350,
            y: Math.floor(index / 3) * 300,
        };
        if (nodeId === flow.startNodeId && !existingPositions?.[nodeId]) {
            pos.x = 400;
            pos.y = 0;
        }

        return {
            id: nodeId,
            type: 'chatbotNode',
            position: pos,
            data: {
                flowNode: flow.nodes[nodeId],
                isStart: nodeId === flow.startNodeId,
                label: nodeLabels[nodeId] || nodeId,
                allNodes,
                onUpdate,
                onDelete,
                onSelect,
            },
        };
    });

    const edges: Edge[] = [];
    nodeIds.forEach(nodeId => {
        const node = flow.nodes[nodeId];
        if (node.options) {
            node.options.forEach((option, i) => {
                if (!option.nextNodeId || !flow.nodes[option.nextNodeId]) return;
                edges.push({
                    id: `${nodeId}-opt${i}-${option.nextNodeId}`,
                    source: nodeId,
                    sourceHandle: `option-${i}`,
                    target: option.nextNodeId,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#16a34a', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#16a34a' },
                });
            });
        }
    });

    return { nodes, edges };
}

function reactFlowToChatbotFlow(
    nodes: Node<FlowNodeData>[],
    startNodeId: string,
): ChatbotFlow {
    const flowNodes: Record<string, ChatbotFlowNode> = {};
    nodes.forEach(node => {
        flowNodes[node.id] = node.data.flowNode;
    });
    return { startNodeId, nodes: flowNodes };
}

const NODE_TEMPLATES: {
    type: string;
    label: string;
    icon: typeof MessageCircle;
    defaultLabel: string;
    create: (id: string) => ChatbotFlowNode;
}[] = [
    {
        type: 'message',
        label: 'Mensaje con opciones',
        icon: MessageCircle,
        defaultLabel: 'Nuevo paso',
        create: (id) => ({ id, message: '', options: [] }),
    },
    {
        type: 'transfer_human',
        label: 'Transferir a agente',
        icon: User,
        defaultLabel: 'Transferir a agente',
        create: (id) => ({ id, message: '', action: { type: 'transfer_to_human' } }),
    },
    {
        type: 'transfer_ai',
        label: 'Transferir a IA',
        icon: Bot,
        defaultLabel: 'Transferir a IA',
        create: (id) => ({ id, message: '', action: { type: 'transfer_to_ai_agent' } }),
    },
    {
        type: 'end',
        label: 'Finalizar conversacion',
        icon: XCircle,
        defaultLabel: 'Fin conversacion',
        create: (id) => ({ id, message: '', action: { type: 'end_conversation' } }),
    },
];

// --- Inner canvas component (has access to useReactFlow) ---

function FlowCanvas({
    chatbotId,
    initialFlow,
    backHref,
}: {
    chatbotId: string;
    initialFlow: ChatbotFlow;
    backHref: string;
}) {
    const { screenToFlowPosition } = useReactFlow();
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isPending, startTransition] = useTransition();
    const [saveResult, setSaveResult] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [flow, setFlow] = useState<ChatbotFlow>(initialFlow);
    const [nodeLabels, setNodeLabels] = useState<Record<string, string>>(() => {
        const labels: Record<string, string> = {};
        Object.keys(initialFlow.nodes).forEach((id, i) => {
            if (id === initialFlow.startNodeId) {
                labels[id] = 'Bienvenida';
            } else {
                const node = initialFlow.nodes[id];
                if (node.action?.type === 'transfer_to_human') labels[id] = 'Transferir a agente';
                else if (node.action?.type === 'transfer_to_ai_agent') labels[id] = 'Transferir a IA';
                else if (node.action?.type === 'end_conversation') labels[id] = 'Fin conversacion';
                else labels[id] = node.message?.substring(0, 30) || `Paso ${i + 1}`;
            }
        });
        return labels;
    });
    const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

    const handleUpdateNode = useCallback((nodeId: string, updates: Partial<ChatbotFlowNode>) => {
        setFlow(prev => ({
            ...prev,
            nodes: {
                ...prev.nodes,
                [nodeId]: { ...prev.nodes[nodeId], ...updates },
            },
        }));
    }, []);

    const handleDeleteNode = useCallback((nodeId: string) => {
        if (nodeId === initialFlow.startNodeId) return;
        setFlow(prev => {
            const newNodes = { ...prev.nodes };
            delete newNodes[nodeId];
            Object.values(newNodes).forEach(node => {
                if (node.options) {
                    node.options = node.options.filter(opt => opt.nextNodeId !== nodeId);
                }
            });
            return { ...prev, nodes: newNodes };
        });
        setNodeLabels(prev => {
            const newLabels = { ...prev };
            delete newLabels[nodeId];
            return newLabels;
        });
        if (selectedNodeId === nodeId) setSelectedNodeId(null);
    }, [initialFlow.startNodeId, selectedNodeId]);

    const handleSelectNode = useCallback((nodeId: string) => {
        setSelectedNodeId(nodeId);
    }, []);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => chatbotFlowToReactFlow(flow, nodeLabels, handleUpdateNode, handleDeleteNode, handleSelectNode, nodePositions),
        [flow, nodeLabels, handleUpdateNode, handleDeleteNode, handleSelectNode, nodePositions],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useMemo(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const onConnect: OnConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return;
            const sourceNode = flow.nodes[connection.source];
            if (!sourceNode || sourceNode.action) return;

            if (connection.sourceHandle?.startsWith('option-')) {
                const optIndex = parseInt(connection.sourceHandle.replace('option-', ''), 10);
                const options = [...(sourceNode.options || [])];
                if (options[optIndex]) {
                    options[optIndex] = { ...options[optIndex], nextNodeId: connection.target };
                    handleUpdateNode(connection.source, { options });
                    return;
                }
            }

            const newOption: ChatbotFlowOption = {
                label: `Opcion ${(sourceNode.options?.length || 0) + 1}`,
                match: [String((sourceNode.options?.length || 0) + 1)],
                nextNodeId: connection.target,
            };
            handleUpdateNode(connection.source, {
                options: [...(sourceNode.options || []), newOption],
            });
        },
        [flow, handleUpdateNode],
    );

    const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
        setNodePositions(prev => ({
            ...prev,
            [node.id]: { x: node.position.x, y: node.position.y },
        }));
    }, []);

    const addNode = useCallback((templateIndex: number) => {
        const template = NODE_TEMPLATES[templateIndex];
        const id = generateId();
        const newNode = template.create(id);

        // Position at center of current viewport
        const canvasEl = canvasRef.current;
        let centerPos = { x: 400, y: 300 };
        if (canvasEl) {
            const rect = canvasEl.getBoundingClientRect();
            centerPos = screenToFlowPosition({
                x: rect.left + rect.width / 2 - 140,
                y: rect.top + rect.height / 2 - 80,
            });
        }

        setFlow(prev => ({
            ...prev,
            nodes: { ...prev.nodes, [id]: newNode },
        }));
        setNodeLabels(prev => ({ ...prev, [id]: template.defaultLabel }));
        setNodePositions(prev => ({ ...prev, [id]: centerPos }));
        setShowAddMenu(false);
        // Auto-select the new node
        setTimeout(() => setSelectedNodeId(id), 50);
    }, [screenToFlowPosition]);

    const handleSave = () => {
        setSaveResult(null);
        const currentFlow = reactFlowToChatbotFlow(nodes, initialFlow.startNodeId);
        startTransition(async () => {
            const result = await updateChatbotFlow(chatbotId, currentFlow);
            setSaveResult(result);
            setTimeout(() => setSaveResult(null), 3000);
        });
    };

    const nodeTypes: NodeTypes = useMemo(() => ({ chatbotNode: ChatbotNode }), []);

    const selectedNode = selectedNodeId ? flow.nodes[selectedNodeId] : null;
    const allNodesList = Object.keys(flow.nodes).map(id => ({ id, label: nodeLabels[id] || id }));

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between py-3 px-4 border-b bg-background z-10">
                <Link href={backHref}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    {saveResult && (
                        <div className={`flex items-center gap-1.5 text-sm ${saveResult.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                            {saveResult.startsWith('Error') ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            <span className="hidden sm:inline">{saveResult.replace('Success: ', '').replace('Error: ', '')}</span>
                        </div>
                    )}
                    <Button onClick={handleSave} disabled={isPending} size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        {isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </div>

            {/* Canvas + Edit panel */}
            <div className="flex-1 flex relative">
                <div ref={canvasRef} className={`flex-1 transition-all ${selectedNode ? 'mr-[380px]' : ''}`}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeDragStop={onNodeDragStop}
                        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                        onPaneClick={() => { setSelectedNodeId(null); setShowAddMenu(false); }}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { strokeWidth: 2 },
                        }}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background gap={20} size={1} />
                        <Controls showInteractive={false} />
                        <MiniMap
                            nodeStrokeWidth={3}
                            className="!bg-muted/50 !border-border"
                        />
                        <Panel position="bottom-center">
                            <div className="relative">
                                {showAddMenu && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border rounded-xl shadow-xl p-2 w-[220px] space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">Tipo de paso</p>
                                        {NODE_TEMPLATES.map((tpl, i) => {
                                            const Icon = tpl.icon;
                                            return (
                                                <button
                                                    key={tpl.type}
                                                    onClick={() => addNode(i)}
                                                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left"
                                                >
                                                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span>{tpl.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <Button onClick={() => setShowAddMenu(prev => !prev)} className="shadow-lg">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar paso
                                </Button>
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {selectedNode && selectedNodeId && (
                    <NodeEditPanel
                        nodeId={selectedNodeId}
                        node={selectedNode}
                        label={nodeLabels[selectedNodeId] || ''}
                        isStart={selectedNodeId === initialFlow.startNodeId}
                        allNodes={allNodesList}
                        onUpdateNode={handleUpdateNode}
                        onUpdateLabel={(label) => setNodeLabels(prev => ({ ...prev, [selectedNodeId]: label }))}
                        onDelete={() => handleDeleteNode(selectedNodeId)}
                        onClose={() => setSelectedNodeId(null)}
                    />
                )}
            </div>
        </div>
    );
}

// --- Wrapper with provider ---

export function FlowEditor(props: {
    chatbotId: string;
    initialFlow: ChatbotFlow;
    backHref: string;
}) {
    return (
        <ReactFlowProvider>
            <FlowCanvas {...props} />
        </ReactFlowProvider>
    );
}
