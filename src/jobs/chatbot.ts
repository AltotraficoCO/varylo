import { prisma } from '@/lib/prisma';
import { sendChannelMessage } from '@/lib/channel-sender';
import { assignAgent } from '@/lib/assign-agent';
import type { ChatbotFlow } from '@/types/chatbot';

interface ChatbotResult {
    handled: boolean;
    transferToHuman?: boolean;
    transferToAi?: boolean;
}

export async function handleChatbotResponse(conversationId: string, inboundMessage: string): Promise<ChatbotResult> {
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { channel: true },
        });

        if (!conversation) {
            return { handled: false };
        }

        // Check for active chatbot session
        let session = await prisma.chatbotSession.findFirst({
            where: {
                conversationId,
                completed: false,
            },
            include: { chatbot: true },
        });

        if (session) {
            // Continue existing session
            return await processNode(session, inboundMessage, conversationId, conversation.companyId);
        }

        // No active session — check if there's a chatbot for this channel
        const chatbot = await prisma.chatbot.findFirst({
            where: {
                companyId: conversation.companyId,
                active: true,
                channels: { some: { id: conversation.channelId } },
            },
            orderBy: { priority: 'desc' },
        });

        if (!chatbot) {
            console.log(`[Chatbot] No active chatbot found for channel ${conversation.channelId} (type: ${conversation.channel?.type}), company ${conversation.companyId}`);
            return { handled: false };
        }

        console.log(`[Chatbot] Found chatbot "${chatbot.name}" (${chatbot.id}) for channel ${conversation.channelId}`);

        const flow = chatbot.flowJson as unknown as ChatbotFlow;
        if (!flow?.startNodeId || !flow.nodes?.[flow.startNodeId]) {
            return { handled: false };
        }

        // Mark any previous sessions for this chatbot+conversation as completed
        await prisma.chatbotSession.updateMany({
            where: {
                chatbotId: chatbot.id,
                conversationId,
                completed: false,
            },
            data: { completed: true },
        });

        // Create a new session
        session = await prisma.chatbotSession.create({
            data: {
                chatbotId: chatbot.id,
                conversationId,
                currentNodeId: flow.startNodeId,
            },
            include: { chatbot: true },
        });

        // Send the initial node message
        const startNode = flow.nodes[flow.startNodeId];
        await sendChannelMessage({
            conversationId,
            companyId: conversation.companyId,
            content: formatNodeMessage(startNode.message, startNode.options),
            fromName: chatbot.name,
        });

        // Check if start node has an action
        if (startNode.action) {
            return await handleAction(startNode.action.type, session.id, conversationId, conversation.companyId);
        }

        return { handled: true };
    } catch (error) {
        console.error(`[Chatbot] Error handling conversation ${conversationId}:`, error);
        return { handled: false };
    }
}

async function processNode(
    session: { id: string; chatbot: { flowJson: unknown; name: string }; currentNodeId: string },
    userMessage: string,
    conversationId: string,
    companyId: string
): Promise<ChatbotResult> {
    const flow = session.chatbot.flowJson as unknown as ChatbotFlow;
    const currentNode = flow.nodes[session.currentNodeId];

    if (!currentNode) {
        await prisma.chatbotSession.update({
            where: { id: session.id },
            data: { completed: true },
        });
        return { handled: false };
    }

    // If node has no options, it's a terminal node
    if (!currentNode.options || currentNode.options.length === 0) {
        await prisma.chatbotSession.update({
            where: { id: session.id },
            data: { completed: true },
        });
        return { handled: false };
    }

    // Try to match user's response
    const lowerMessage = userMessage.toLowerCase().trim();
    const matchedOption = currentNode.options.find(opt =>
        opt.match.some(m => {
            const lowerMatch = m.toLowerCase();
            // Exact comparison for pure numbers (e.g. "1", "2")
            if (/^\d+$/.test(lowerMatch)) {
                return lowerMessage === lowerMatch;
            }
            // For text keywords, exact match first, then includes as fallback
            return lowerMessage === lowerMatch || lowerMessage.includes(lowerMatch);
        })
    );

    if (!matchedOption) {
        // Send "didn't understand" message with options again
        await sendChannelMessage({
            conversationId,
            companyId,
            content: `No entendí tu respuesta. Por favor elige una opción:\n\n${formatOptions(currentNode.options)}`,
            fromName: session.chatbot.name,
        });
        return { handled: true };
    }

    // Navigate to next node
    const nextNode = flow.nodes[matchedOption.nextNodeId];
    if (!nextNode) {
        await prisma.chatbotSession.update({
            where: { id: session.id },
            data: { completed: true },
        });
        return { handled: false };
    }

    // Update session to new node
    await prisma.chatbotSession.update({
        where: { id: session.id },
        data: { currentNodeId: matchedOption.nextNodeId },
    });

    // Send next node message
    await sendChannelMessage({
        conversationId,
        companyId,
        content: formatNodeMessage(nextNode.message, nextNode.options),
        fromName: session.chatbot.name,
    });

    // Handle action if present
    if (nextNode.action) {
        return await handleAction(nextNode.action.type, session.id, conversationId, companyId);
    }

    return { handled: true };
}

async function handleAction(
    actionType: string,
    sessionId: string,
    conversationId: string,
    companyId: string
): Promise<ChatbotResult> {
    await prisma.chatbotSession.update({
        where: { id: sessionId },
        data: { completed: true },
    });

    if (actionType === 'transfer_to_human') {
        await transferToHuman(conversationId, companyId);
        return { handled: true, transferToHuman: true };
    }

    if (actionType === 'transfer_to_ai_agent') {
        return { handled: false, transferToAi: true };
    }

    if (actionType === 'end_conversation') {
        return { handled: true };
    }

    return { handled: true };
}

async function transferToHuman(conversationId: string, companyId: string) {
    const agentId = await assignAgent(companyId);

    const data: any = { handledByAiAgentId: null };
    if (agentId) {
        data.assignedAgents = { connect: { id: agentId } };
    }

    await prisma.conversation.update({
        where: { id: conversationId },
        data,
    });
}

function formatNodeMessage(message: string, options?: { label: string }[]): string {
    if (!options || options.length === 0) return message;
    return `${message}\n\n${formatOptions(options)}`;
}

function formatOptions(options: { label: string }[]): string {
    return options.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n');
}
