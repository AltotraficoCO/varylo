import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { dispatchLead } from '@/lib/lead-dispatch';
import type { AutomationGraph, AutomationFlowNode } from '@/types/automation';

const MAX_STEPS = 50; // guard against accidental cycles

export interface RunFlowResult {
    status: 'SUCCESS' | 'NO_MATCH' | 'ERROR';
    path: string[];
    error?: string;
    conversationId?: string;
}

/**
 * One-pass interpreter for an automation flow: starting at the trigger, it
 * walks the graph evaluating condition nodes against the incoming lead payload
 * until it reaches a dispatch_agent node (which hands the lead to dispatchLead).
 * Every run is recorded as an AutomationRun for observability.
 */
export async function runAutomationFlow(
    flow: { id: string; companyId: string; graphJson: unknown },
    payload: Record<string, unknown>,
): Promise<RunFlowResult> {
    const graph = (flow.graphJson || {}) as AutomationGraph;
    const path: string[] = [];
    let result: RunFlowResult;

    try {
        if (!graph.startNodeId || !graph.nodes || !graph.nodes[graph.startNodeId]) {
            result = { status: 'ERROR', path, error: 'El flujo no tiene nodo inicial.' };
        } else {
            result = { status: 'ERROR', path, error: 'El flujo no llegó a ningún nodo de acción.' };
            let currentId: string | undefined = graph.startNodeId;
            let steps = 0;

            while (currentId && steps < MAX_STEPS) {
                steps++;
                const node: AutomationFlowNode | undefined = graph.nodes[currentId];
                if (!node) {
                    result = { status: 'ERROR', path, error: `Nodo "${currentId}" no existe en el flujo.` };
                    break;
                }
                path.push(currentId);

                if (node.type === 'trigger') {
                    currentId = node.next;
                    if (!currentId) {
                        result = { status: 'ERROR', path, error: 'El nodo de inicio no está conectado a nada.' };
                    }
                    continue;
                }

                if (node.type === 'condition') {
                    const fieldVal = node.field ? payload?.[node.field] : undefined;
                    const match = (node.cases || []).find(c => String(c.value) === String(fieldVal ?? ''));
                    currentId = match ? match.next : node.elseNext;
                    if (!currentId) {
                        result = {
                            status: 'NO_MATCH',
                            path,
                            error: `Ninguna rama coincidió para ${node.field}="${String(fieldVal ?? '')}".`,
                        };
                        break;
                    }
                    continue;
                }

                if (node.type === 'dispatch_agent') {
                    if (!node.agentId || !node.template?.name || !node.template?.language) {
                        result = { status: 'ERROR', path, error: 'El nodo de agente no tiene agente o plantilla configurados.' };
                        break;
                    }
                    const phone = payload?.phone;
                    if (!phone) {
                        result = { status: 'ERROR', path, error: 'El payload no trae "phone".' };
                        break;
                    }
                    const dispatched = await dispatchLead({
                        companyId: flow.companyId,
                        agentId: node.agentId,
                        channelId: node.channelId,
                        phone: String(phone),
                        name: payload?.name != null ? String(payload.name) : undefined,
                        source: payload?.source != null ? String(payload.source) : undefined,
                        metadata: payload,
                        template: node.template,
                    });
                    result = dispatched.ok
                        ? { status: 'SUCCESS', path, conversationId: dispatched.conversationId }
                        : { status: 'ERROR', path, error: dispatched.error };
                    break;
                }

                result = { status: 'ERROR', path, error: `Tipo de nodo desconocido: ${(node as { type?: string }).type}` };
                break;
            }

            if (steps >= MAX_STEPS) {
                result = { status: 'ERROR', path, error: 'Se excedió el máximo de pasos (posible ciclo en el flujo).' };
            }
        }
    } catch (e) {
        result = { status: 'ERROR', path, error: e instanceof Error ? e.message : 'Error desconocido.' };
    }

    // Record the run (best-effort — never let observability break the dispatch).
    await prisma.automationRun
        .create({
            data: {
                flowId: flow.id,
                companyId: flow.companyId,
                payload: payload as Prisma.InputJsonValue,
                path: path as Prisma.InputJsonValue,
                status: result.status,
                error: result.error ?? null,
            },
        })
        .catch(() => {});

    return result;
}
