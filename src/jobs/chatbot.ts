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
            content: formatNodeMessage(startNode.message, startNode.options, startNode.dataCapture),
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

    // If this is a data capture node, save the user's response and move on
    if (currentNode.dataCapture) {
        const capture = currentNode.dataCapture;

        // Validate if needed
        if (capture.validation) {
            const isValid = validateCapture(userMessage, capture.validation);
            if (!isValid) {
                const hints: Record<string, string> = {
                    email: 'un correo valido (ej: nombre@correo.com)',
                    phone: 'un numero de telefono valido',
                    number: 'un numero valido',
                    text: 'una respuesta valida',
                };
                await sendChannelMessage({
                    conversationId,
                    companyId,
                    content: `Por favor ingresa ${hints[capture.validation] || 'una respuesta valida'}.`,
                    fromName: session.chatbot.name,
                });
                return { handled: true };
            }
        }

        // Save captured data and update contact if applicable
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { contactId: true },
        });
        const trimmedValue = userMessage.trim();

        // Upsert: if this contact already has this field captured, overwrite it
        const existingCapture = conversation?.contactId
            ? await prisma.capturedData.findFirst({
                where: {
                    contactId: conversation.contactId,
                    fieldName: capture.fieldName,
                    companyId,
                },
            })
            : null;

        if (existingCapture) {
            await prisma.capturedData.update({
                where: { id: existingCapture.id },
                data: {
                    fieldValue: trimmedValue,
                    conversationId,
                    source: 'chatbot',
                },
            });
        } else {
            await prisma.capturedData.create({
                data: {
                    companyId,
                    conversationId,
                    contactId: conversation?.contactId || null,
                    fieldName: capture.fieldName,
                    fieldValue: trimmedValue,
                    source: 'chatbot',
                },
            });
        }

        // Auto-update contact with known fields
        if (conversation?.contactId) {
            const contactUpdate = mapFieldToContact(capture.fieldName, trimmedValue);
            if (contactUpdate) {
                await prisma.contact.update({
                    where: { id: conversation.contactId },
                    data: contactUpdate,
                });
            }
        }

        // Navigate to next node
        const nextNode = flow.nodes[capture.nextNodeId];
        if (!nextNode) {
            await prisma.chatbotSession.update({
                where: { id: session.id },
                data: { completed: true },
            });
            return { handled: false };
        }

        await prisma.chatbotSession.update({
            where: { id: session.id },
            data: { currentNodeId: capture.nextNodeId },
        });

        await sendChannelMessage({
            conversationId,
            companyId,
            content: formatNodeMessage(nextNode.message, nextNode.options, nextNode.dataCapture),
            fromName: session.chatbot.name,
        });

        if (nextNode.action) {
            return await handleAction(nextNode.action.type, session.id, conversationId, companyId);
        }
        return { handled: true };
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
            if (/^\d+$/.test(lowerMatch)) {
                return lowerMessage === lowerMatch;
            }
            return lowerMessage === lowerMatch || lowerMessage.includes(lowerMatch);
        })
    );

    if (!matchedOption) {
        await sendChannelMessage({
            conversationId,
            companyId,
            content: `No entendi tu respuesta. Por favor elige una opcion:\n\n${formatOptions(currentNode.options)}`,
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
        content: formatNodeMessage(nextNode.message, nextNode.options, nextNode.dataCapture),
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

function formatNodeMessage(message: string, options?: { label: string }[], dataCapture?: { fieldLabel: string } | null): string {
    if (dataCapture) {
        return message || `Por favor ingresa tu ${dataCapture.fieldLabel}:`;
    }
    if (!options || options.length === 0) return message;
    return `${message}\n\n${formatOptions(options)}`;
}

function formatOptions(options: { label: string }[]): string {
    return options.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n');
}

function mapFieldToContact(fieldName: string, value: string): Record<string, string> | null {
    const key = fieldName.toLowerCase().replace(/\s+/g, '_');
    const mapping: Record<string, string> = {
        nombre: 'name',
        name: 'name',
        nombre_completo: 'name',
        email: 'email',
        correo: 'email',
        correo_electronico: 'email',
        celular: 'phone',
        telefono: 'phone',
        phone: 'phone',
        empresa: 'companyName',
        company: 'companyName',
        ciudad: 'city',
        city: 'city',
        pais: 'country',
        country: 'country',
    };
    const contactField = mapping[key];
    if (!contactField) return null;
    return { [contactField]: value };
}

function validateCapture(value: string, type: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    switch (type) {
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
        case 'phone':
            return /^[\d\s\+\-\(\)]{7,20}$/.test(trimmed);
        case 'number':
            return /^\d+$/.test(trimmed);
        default:
            return trimmed.length > 0;
    }
}
