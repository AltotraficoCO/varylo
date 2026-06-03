'use client';

/**
 * Shared node-canvas shell used by both the chatbot flow editor and the
 * automation flow editor. It owns the @xyflow/react surface (ReactFlow +
 * Background/Controls/MiniMap) and the Dagre auto-layout helper — the generic,
 * domain-agnostic parts. Each editor keeps its own graph↔reactflow conversion,
 * node components, connection semantics, and side panels.
 */
import {
    ReactFlow, Background, Controls, MiniMap,
    type Node, type Edge, type NodeTypes,
    type OnNodesChange, type OnEdgesChange, type OnConnect,
    type NodeMouseHandler, type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import type { ReactNode } from 'react';

export function FlowCanvasShell<NodeT extends Node = Node, EdgeT extends Edge = Edge>({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    onNodeClick,
    onPaneClick,
    nodeTypes,
    children,
}: {
    nodes: NodeT[];
    edges: EdgeT[];
    onNodesChange: OnNodesChange<NodeT>;
    onEdgesChange: OnEdgesChange<EdgeT>;
    onConnect: OnConnect;
    onNodeDragStop?: OnNodeDrag<NodeT>;
    onNodeClick?: NodeMouseHandler<NodeT>;
    onPaneClick?: () => void;
    nodeTypes: NodeTypes;
    children?: ReactNode;
}) {
    return (
        <ReactFlow<NodeT, EdgeT>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { strokeWidth: 2 } }}
            proOptions={{ hideAttribution: true }}
        >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={3} className="!bg-muted/50 !border-border" />
            {children}
        </ReactFlow>
    );
}

/** Dagre top-to-bottom layout → returns top-left positions keyed by node id. */
export function dagreLayout(
    nodes: { id: string }[],
    edges: { source: string; target: string }[],
    opts?: { width?: number; height?: number },
): Record<string, { x: number; y: number }> {
    const width = opts?.width ?? 280;
    const height = opts?.height ?? 200;
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });
    nodes.forEach(n => g.setNode(n.id, { width, height }));
    edges.forEach(e => g.setEdge(e.source, e.target));
    Dagre.layout(g);

    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(n => {
        const p = g.node(n.id);
        positions[n.id] = { x: p.x - width / 2, y: p.y - height / 2 };
    });
    return positions;
}
