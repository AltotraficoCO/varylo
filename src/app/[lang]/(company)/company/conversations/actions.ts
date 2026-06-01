'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { analyzeConversation } from '@/jobs/ai';
import { sendChannelMessage } from '@/lib/channel-sender';

export async function toggleConversationTag(conversationId: string, tagId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        throw new Error("Unauthorized");
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, companyId: session.user.companyId },
        include: { tags: true }
    });

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    // Verify tag ownership (optional but good practice)
    const tag = await prisma.tag.findUnique({
        where: { id: tagId, companyId: session.user.companyId }
    });
    if (!tag) {
        throw new Error("Tag not found");
    }

    const hasTag = conversation.tags.some(t => t.id === tagId);

    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            tags: hasTag
                ? { disconnect: { id: tagId } }
                : { connect: { id: tagId } }
        }
    });

    revalidatePath('/[lang]/company/conversations', 'page');
    revalidatePath('/[lang]/agent', 'page');
}

export async function toggleConversationAgent(conversationId: string, agentId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        throw new Error("Unauthorized");
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, companyId: session.user.companyId },
        include: { assignedAgents: true }
    });

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    // Verify agent belongs to same company
    const agent = await prisma.user.findFirst({
        where: {
            id: agentId,
            companyId: session.user.companyId,
            role: { in: [Role.AGENT, Role.SUPERVISOR, Role.COMPANY_ADMIN] },
        },
    });
    if (!agent) {
        throw new Error("Agent not found");
    }

    const isAssigned = conversation.assignedAgents.some(a => a.id === agentId);

    await prisma.conversation.update({
        where: { id: conversationId, companyId: session.user.companyId },
        data: {
            assignedAgents: isAssigned
                ? { disconnect: { id: agentId } }
                : { connect: { id: agentId } }
        }
    });

    revalidatePath('/[lang]/company/conversations', 'page');
    revalidatePath('/[lang]/agent', 'page');
}

/**
 * Hand the conversation back to the AI: re-assign an active AI agent, drop any
 * human takeover, and trigger an immediate reply to the last customer message.
 * Useful when the AI went quiet (e.g. a human jumped in, or an error/timeout).
 */
export async function resumeAiAgent(conversationId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        throw new Error("Unauthorized");
    }

    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, companyId: session.user.companyId },
        select: { id: true, channelId: true, handledByAiAgentId: true },
    });
    if (!conversation) {
        return { success: false, message: "Conversation not found" };
    }

    // Prefer the agent already tied to the conversation; otherwise pick an active
    // AI agent assigned to this channel.
    let aiAgentId = conversation.handledByAiAgentId;
    if (!aiAgentId) {
        const aiAgent = await prisma.aiAgent.findFirst({
            where: {
                companyId: session.user.companyId,
                active: true,
                channels: { some: { id: conversation.channelId } },
            },
            select: { id: true },
        });
        if (!aiAgent) {
            return { success: false, message: "No hay un agente IA activo asignado a este canal." };
        }
        aiAgentId = aiAgent.id;
    }

    await prisma.conversation.update({
        where: { id: conversationId, companyId: session.user.companyId },
        data: {
            handledByAiAgentId: aiAgentId,
            assignedAgents: { set: [] },
            status: 'OPEN',
        },
    });

    // Trigger an immediate reply to the latest inbound message (no buffer wait).
    try {
        const lastInbound = await prisma.message.findFirst({
            where: { conversationId, direction: 'INBOUND' },
            orderBy: { createdAt: 'desc' },
            select: { content: true },
        });
        const { handleAiAgentResponse } = await import('@/jobs/ai-agent');
        await handleAiAgentResponse(conversationId, lastInbound?.content || '', { skipBuffer: true });
    } catch (e) {
        console.error('[resumeAiAgent] reply failed:', e);
        // Reassignment still succeeded — the AI will answer the next message.
    }

    revalidatePath('/[lang]/company/conversations', 'page');
    revalidatePath('/[lang]/agent', 'page');
    return { success: true };
}

export async function updatePriority(conversationId: string, priority: 'LOW' | 'MEDIUM' | 'HIGH') {
    const session = await auth();
    if (!session?.user?.companyId) {
        throw new Error("Unauthorized");
    }

    await prisma.conversation.update({
        where: { id: conversationId, companyId: session.user.companyId },
        data: { priority }
    });

    revalidatePath('/[lang]/company/conversations', 'page');
    revalidatePath('/[lang]/agent', 'page');
}

export async function sendMessage(conversationId: string, content: string) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) {
        return { success: false, message: "Unauthorized" };
    }

    try {
        await sendChannelMessage({
            conversationId,
            companyId: session.user.companyId,
            content,
            fromName: session.user.name || 'Agent',
            senderId: session.user.id,
        });

        // Fire-and-forget AI analysis
        analyzeConversation(conversationId).catch((err) =>
            console.error('[AI] sendMessage analysis error:', err)
        );

        revalidatePath('/[lang]/company/conversations', 'page');
        revalidatePath('/[lang]/agent', 'page');
        return { success: true };
    } catch (error) {
        console.error("Error sending message:", error);
        const msg = error instanceof Error ? error.message : '';
        if (msg.startsWith('WINDOW_EXPIRED:')) {
            return { success: false, message: msg.replace('WINDOW_EXPIRED: ', ''), windowExpired: true };
        }
        return { success: false, message: "Error al enviar el mensaje. Intenta de nuevo." };
    }
}

export async function sendMediaMessage(
    conversationId: string,
    content: string,
    mediaUrl: string,
    mediaType: string,
    mimeType: string,
    fileName: string,
) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) {
        return { success: false, message: "Unauthorized" };
    }

    try {
        await sendChannelMessage({
            conversationId,
            companyId: session.user.companyId,
            content: content || (mediaType === 'audio' ? '' : `[${mediaType}]`),
            fromName: session.user.name || 'Agent',
            mediaUrl,
            mediaType,
            mimeType,
            fileName,
            senderId: session.user.id,
        });

        revalidatePath('/[lang]/company/conversations', 'page');
        revalidatePath('/[lang]/agent', 'page');
        return { success: true };
    } catch (error) {
        console.error("Error sending media message:", error);
        const msg = error instanceof Error ? error.message : '';
        if (msg.startsWith('WINDOW_EXPIRED:')) {
            return { success: false, message: msg.replace('WINDOW_EXPIRED: ', ''), windowExpired: true };
        }
        return { success: false, message: "Error al enviar el archivo. Intenta de nuevo." };
    }
}

export async function reanalyzeConversation(conversationId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: "Unauthorized" };
    }

    // Verify ownership
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, companyId: session.user.companyId },
    });

    if (!conversation) {
        return { success: false, message: "Conversation not found" };
    }

    const result = await analyzeConversation(conversationId);

    revalidatePath('/[lang]/company/conversations', 'page');
    return { success: !!result };
}

export async function closeConversation(conversationId: string) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) {
        return { success: false, message: "Unauthorized" };
    }

    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId, companyId: session.user.companyId },
        });

        if (!conversation) {
            return { success: false, message: "Conversation not found" };
        }

        // Send farewell message through the channel (skip if window expired)
        try {
            await sendChannelMessage({
                conversationId,
                companyId: session.user.companyId,
                content: 'Esta conversación ha sido finalizada. Si necesita más ayuda, no dude en escribirnos nuevamente.',
                fromName: session.user.name || 'Sistema',
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (!msg.startsWith('WINDOW_EXPIRED:')) throw err;
            // Window expired — close silently without farewell message
        }

        // Mark as resolved
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'RESOLVED' },
        });

        revalidatePath('/[lang]/company/conversations', 'page');
        revalidatePath('/[lang]/agent', 'page');
        return { success: true };
    } catch (error) {
        console.error("Error closing conversation:", error);
        return { success: false, message: "Error al cerrar la conversación." };
    }
}

export async function reopenConversation(conversationId: string) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) {
        return { success: false, message: "Unauthorized" };
    }

    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId, companyId: session.user.companyId },
        });

        if (!conversation) {
            return { success: false, message: "Conversation not found" };
        }

        if (conversation.status !== 'RESOLVED') {
            return { success: false, message: "Conversation is not resolved" };
        }

        await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'OPEN' },
        });

        revalidatePath('/[lang]/company/conversations', 'page');
        revalidatePath('/[lang]/agent', 'page');
        return { success: true };
    } catch (error) {
        console.error("Error reopening conversation:", error);
        return { success: false, message: "Error al reabrir la conversación." };
    }
}

export async function deleteConversation(conversationId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: "Unauthorized" };
    }

    if (session.user.role !== Role.COMPANY_ADMIN) {
        return { success: false, message: "Only company admins can delete conversations" };
    }

    try {
        await prisma.conversation.delete({
            where: { id: conversationId, companyId: session.user.companyId }
        });

        revalidatePath('/[lang]/company/conversations', 'page');
        revalidatePath('/[lang]/agent', 'page');
        return { success: true };
    } catch (error) {
        console.error("Error deleting conversation:", error);
        return { success: false, message: "Failed to delete conversation" };
    }
}

export async function deleteConversations(conversationIds: string[]) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: "Unauthorized" };
    }

    if (session.user.role !== Role.COMPANY_ADMIN) {
        return { success: false, message: "Only company admins can delete conversations" };
    }

    if (!conversationIds.length) {
        return { success: false, message: "No conversations selected" };
    }

    try {
        await prisma.conversation.deleteMany({
            where: {
                id: { in: conversationIds },
                companyId: session.user.companyId,
            }
        });

        revalidatePath('/[lang]/company/conversations', 'page');
        revalidatePath('/[lang]/agent', 'page');
        return { success: true, count: conversationIds.length };
    } catch (error) {
        console.error("Error deleting conversations:", error);
        return { success: false, message: "Failed to delete conversations" };
    }
}
