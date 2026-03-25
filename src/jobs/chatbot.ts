import { prisma } from '@/lib/prisma';
import { sendChannelMessage } from '@/lib/channel-sender';
import { assignAgent } from '@/lib/assign-agent';
import { sendWebhook, buildWebhookPayload } from '@/lib/webhook-sender';
import type { ChatbotFlow } from '@/types/chatbot';

interface ChatbotResult {
    handled: boolean;
    transferToHuman?: boolean;
    transferToAi?: boolean;
}

export interface InboundMediaInfo {
    mediaUrl?: string;
    mediaType?: string;
    mimeType?: string;
    fileName?: string;
}

export async function handleChatbotResponse(conversationId: string, inboundMessage: string, media?: InboundMediaInfo): Promise<ChatbotResult> {
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
            return await processNode(session, inboundMessage, conversationId, conversation.companyId, media);
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
            return await handleAction(startNode.action.type, session.id, conversationId, conversation.companyId, flow);
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
    companyId: string,
    media?: InboundMediaInfo,
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
        const isDocumentCapture = capture.validation === 'document';

        // Document capture: need media attachment
        if (isDocumentCapture) {
            // Try to get media from the passed info, or look at the last message in DB
            let docMedia = media;
            if (!docMedia?.mediaUrl) {
                const lastMsg = await prisma.message.findFirst({
                    where: { conversationId, direction: 'INBOUND', mediaUrl: { not: null } },
                    orderBy: { createdAt: 'desc' },
                    select: { mediaUrl: true, mediaType: true, mimeType: true, fileName: true },
                });
                if (lastMsg?.mediaUrl) {
                    docMedia = {
                        mediaUrl: lastMsg.mediaUrl,
                        mediaType: lastMsg.mediaType || undefined,
                        mimeType: lastMsg.mimeType || undefined,
                        fileName: lastMsg.fileName || undefined,
                    };
                }
            }

            if (!docMedia?.mediaUrl) {
                await sendChannelMessage({
                    conversationId,
                    companyId,
                    content: 'Por favor envia un archivo (PDF, imagen o documento).',
                    fromName: session.chatbot.name,
                });
                return { handled: true };
            }

            // Save document URL as captured data
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                select: { contactId: true },
            });

            const docValue = JSON.stringify({
                url: docMedia.mediaUrl,
                mimeType: docMedia.mimeType || null,
                fileName: docMedia.fileName || null,
                mediaType: docMedia.mediaType || null,
            });

            const existingCapture = conversation?.contactId
                ? await prisma.capturedData.findFirst({
                    where: { contactId: conversation.contactId, fieldName: capture.fieldName, companyId },
                })
                : null;

            if (existingCapture) {
                await prisma.capturedData.update({
                    where: { id: existingCapture.id },
                    data: { fieldValue: docValue, conversationId, source: 'chatbot' },
                });
            } else {
                await prisma.capturedData.create({
                    data: {
                        companyId, conversationId,
                        contactId: conversation?.contactId || null,
                        fieldName: capture.fieldName,
                        fieldValue: docValue,
                        source: 'chatbot',
                    },
                });
            }

            // Navigate to next node
            const nextNode = flow.nodes[capture.nextNodeId];
            if (!nextNode) {
                await prisma.chatbotSession.update({ where: { id: session.id }, data: { completed: true } });
                return { handled: false };
            }

            await prisma.chatbotSession.update({ where: { id: session.id }, data: { currentNodeId: capture.nextNodeId } });
            await sendChannelMessage({
                conversationId, companyId,
                content: formatNodeMessage(nextNode.message, nextNode.options, nextNode.dataCapture),
                fromName: session.chatbot.name,
            });

            if (nextNode.action) {
                return await handleAction(nextNode.action.type, session.id, conversationId, companyId, flow);
            }
            return { handled: true };
        }

        // Text-based capture (existing logic)
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
            return await handleAction(nextNode.action.type, session.id, conversationId, companyId, flow);
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
        return await handleAction(nextNode.action.type, session.id, conversationId, companyId, flow);
    }

    return { handled: true };
}

async function handleAction(
    actionType: string,
    sessionId: string,
    conversationId: string,
    companyId: string,
    flow: ChatbotFlow,
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

    if (actionType === 'send_to_webhook') {
        await triggerWebhookSend(conversationId, companyId, flow);
        return { handled: true };
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
        case 'document':
            return false; // Document validation is handled separately via media
        default:
            return trimmed.length > 0;
    }
}

/**
 * Collect all captured data for a conversation and send to the configured webhook.
 */
async function triggerWebhookSend(conversationId: string, companyId: string, flow: ChatbotFlow) {
    const webhookConfig = flow.webhookConfig;
    if (!webhookConfig?.url) {
        console.warn(`[Chatbot] send_to_webhook action but no webhookConfig.url configured`);
        return;
    }

    console.log(`[Chatbot] Triggering webhook send to ${webhookConfig.url} for conversation ${conversationId}`);

    try {
        // Get conversation contact info
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                contact: { select: { id: true, name: true, phone: true, email: true } },
            },
        });

        // Get all captured data for this conversation
        const allCaptured = await prisma.capturedData.findMany({
            where: { conversationId, companyId },
            orderBy: { createdAt: 'asc' },
        });

        // Separate text fields from document fields
        const textFields: { fieldName: string; fieldValue: string }[] = [];
        const documents: { fieldName: string; url: string; mimeType: string | null; fileName: string | null }[] = [];

        for (const item of allCaptured) {
            // Try to parse as document JSON
            try {
                const parsed = JSON.parse(item.fieldValue);
                if (parsed.url && parsed.mediaType) {
                    documents.push({
                        fieldName: item.fieldName,
                        url: parsed.url,
                        mimeType: parsed.mimeType || null,
                        fileName: parsed.fileName || null,
                    });
                    continue;
                }
            } catch {
                // Not JSON — it's a regular text field
            }
            textFields.push({ fieldName: item.fieldName, fieldValue: item.fieldValue });
        }

        const contact = conversation?.contact || { id: null, name: null, phone: null, email: null };
        const payload = buildWebhookPayload(conversationId, contact, textFields, documents);

        const result = await sendWebhook(webhookConfig, payload);

        if (result.ok) {
            console.log(`[Chatbot] Webhook sent successfully for conversation ${conversationId}`);
        } else {
            console.error(`[Chatbot] Webhook failed for conversation ${conversationId}:`, result.error);
        }
    } catch (error) {
        console.error(`[Chatbot] Error triggering webhook for ${conversationId}:`, error);
    }
}
