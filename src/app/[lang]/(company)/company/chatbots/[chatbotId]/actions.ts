'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import type { ChatbotFlow } from '@/types/chatbot';

export async function updateChatbotFlow(chatbotId: string, flowJson: ChatbotFlow) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    // Validate flow structure
    if (!flowJson.startNodeId || !flowJson.nodes || !flowJson.nodes[flowJson.startNodeId]) {
        return 'Error: El flujo debe tener un nodo inicial válido.';
    }

    // Clean up and validate all node references
    for (const [nodeId, node] of Object.entries(flowJson.nodes)) {
        if (node.id !== nodeId) {
            return `Error: El nodo "${nodeId}" tiene un id inconsistente.`;
        }
        if (node.options) {
            // Filter out unconnected options (empty nextNodeId)
            node.options = node.options.filter(opt => opt.nextNodeId);
            for (const option of node.options) {
                if (!flowJson.nodes[option.nextNodeId]) {
                    return `Error: La opcion "${option.label}" en el nodo "${nodeId}" apunta a un nodo inexistente.`;
                }
            }
        }
    }

    try {
        await prisma.chatbot.update({
            where: { id: chatbotId, companyId: session.user.companyId },
            data: {
                flowJson: flowJson as unknown as Prisma.InputJsonValue,
            },
        });

        revalidatePath(`/[lang]/company/chatbots/${chatbotId}`, 'page');
        return 'Success: Flujo guardado correctamente.';
    } catch (error) {
        console.error('Failed to update chatbot flow:', error);
        return 'Error: No se pudo guardar el flujo.';
    }
}
