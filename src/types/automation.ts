// Shared shape of an automation flow graph (lead router).
// Authored on the canvas (UI) and traversed by the one-pass engine.

export type AutomationNodeType = 'trigger' | 'condition' | 'dispatch_agent' | 'code' | 'cron';

export interface AutomationConditionCase {
    value: string;
    next: string; // node id to go to when payload[field] === value
}

export interface AutomationDispatchTemplate {
    name: string;
    language: string;
    components?: unknown[];
    body?: string;
}

export interface AutomationFlowNode {
    id: string;
    type: AutomationNodeType;

    // trigger / cron / code — single output
    next?: string;

    // cron (scheduled trigger). `schedule` is a standard cron expression.
    schedule?: string;

    // condition (switch on a payload field)
    field?: string;
    cases?: AutomationConditionCase[];
    elseNext?: string;

    // dispatch_agent
    agentId?: string;
    channelId?: string;
    template?: AutomationDispatchTemplate;

    // code (runs user JS in a sandbox; transforms the payload). Single output via `next`.
    code?: string;

    // canvas-only
    position?: { x: number; y: number };
    label?: string;
}

export interface AutomationGraph {
    startNodeId: string;
    nodes: Record<string, AutomationFlowNode>;
}
