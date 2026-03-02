import { prisma } from '@/lib/prisma';
import { getOpenAIForCompany } from '@/lib/openai';
import { sendChannelMessage, sendWhatsAppTypingIndicator } from '@/lib/channel-sender';
import { checkCreditBalance, deductCredits, logUsageOnly } from '@/lib/credits';
import { findLeastBusyAgent } from '@/lib/assign-agent';

interface AiAgentResult {
    handled: boolean;
    transferredToHuman?: boolean;
}

export async function handleAiAgentResponse(conversationId: string, inboundMessage: string): Promise<AiAgentResult> {
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                handledByAiAgent: {
                    include: { channels: true },
                },
                assignedAgents: { select: { id: true } },
                channel: true,
                contact: true,
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50,
                },
            },
        });

        if (!conversation) {
            return { handled: false };
        }

        // If there are human agents assigned, the conversation was transferred — don't use AI
        if (conversation.assignedAgents.length > 0 && !conversation.handledByAiAgent) {
            return { handled: false };
        }

        // If the conversation is not handled by an AI agent, check if there's one for this channel
        let aiAgent = conversation.handledByAiAgent;

        if (!aiAgent) {
            // Find an active AI agent assigned to this channel
            aiAgent = await prisma.aiAgent.findFirst({
                where: {
                    companyId: conversation.companyId,
                    active: true,
                    channels: {
                        some: { id: conversation.channelId },
                    },
                },
                include: { channels: true },
            });

            if (!aiAgent) {
                return { handled: false };
            }

            // Assign the AI agent to the conversation
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { handledByAiAgentId: aiAgent.id },
            });
        }

        if (!aiAgent.active) {
            return { handled: false };
        }

        // Check for transfer keywords
        const lowerMessage = inboundMessage.toLowerCase().trim();
        const shouldTransfer = aiAgent.transferKeywords.some(keyword =>
            lowerMessage.includes(keyword.toLowerCase())
        );

        if (shouldTransfer) {
            await transferToHuman(conversationId, conversation.companyId);
            await sendChannelMessage({
                conversationId,
                companyId: conversation.companyId,
                content: 'Te estoy transfiriendo con un agente humano. Un momento por favor.',
                fromName: aiAgent.name,
            });
            return { handled: true, transferredToHuman: true };
        }

        // Build chat history
        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
            {
                role: 'system',
                content: buildSystemPrompt(aiAgent.systemPrompt, aiAgent.contextInfo),
            },
        ];

        for (const msg of conversation.messages) {
            messages.push({
                role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
                content: msg.content,
            });
        }

        // Add the current message (it's already in DB but make sure it's in the history)
        // The last message in the DB should be the inbound one we just received

        // Send typing indicator so the user sees "typing..." in WhatsApp
        if (conversation.channel?.type === 'WHATSAPP') {
            const config = conversation.channel.configJson as { phoneNumberId?: string; accessToken?: string } | null;
            const lastInbound = [...conversation.messages].reverse().find(m => m.direction === 'INBOUND');
            if (config?.phoneNumberId && config?.accessToken && lastInbound?.providerMessageId) {
                await sendWhatsAppTypingIndicator(
                    config.phoneNumberId,
                    config.accessToken,
                    conversation.contact?.phone || '',
                    lastInbound.providerMessageId,
                );
            }
        }

        const { client: openai, usesOwnKey } = await getOpenAIForCompany(conversation.companyId);

        // Credit check: if not using own key, must have credits
        if (!usesOwnKey) {
            const { hasCredits } = await checkCreditBalance(conversation.companyId);
            if (!hasCredits) {
                console.log(`[AI Agent] Company ${conversation.companyId} has no credits, skipping AI`);
                return { handled: false };
            }
        }

        const response = await openai.chat.completions.create({
            model: aiAgent.model,
            temperature: aiAgent.temperature,
            messages,
        });

        let replyContent = response.choices[0]?.message?.content;
        if (!replyContent) {
            return { handled: false };
        }

        // Track usage
        const usage = response.usage;
        if (usage) {
            if (usesOwnKey) {
                await logUsageOnly({
                    companyId: conversation.companyId,
                    conversationId: conversation.id,
                    model: aiAgent.model,
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                });
            } else {
                await deductCredits({
                    companyId: conversation.companyId,
                    conversationId: conversation.id,
                    model: aiAgent.model,
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                });
            }
        }

        // Check if AI wants to transfer
        if (replyContent.includes('[TRANSFER_TO_HUMAN]')) {
            replyContent = replyContent.replace('[TRANSFER_TO_HUMAN]', '').trim();
            const transferMessage = replyContent || 'Te estoy transfiriendo con un agente humano. Un momento por favor.';
            await sendChannelMessage({
                conversationId,
                companyId: conversation.companyId,
                content: transferMessage,
                fromName: aiAgent.name,
            });
            await transferToHuman(conversationId, conversation.companyId);
            return { handled: true, transferredToHuman: true };
        }

        // Send the AI response
        await sendChannelMessage({
            conversationId,
            companyId: conversation.companyId,
            content: replyContent,
            fromName: aiAgent.name,
        });

        return { handled: true };
    } catch (error) {
        console.error(`[AI Agent] Error handling conversation ${conversationId}:`, error);
        return { handled: false };
    }
}

function buildSystemPrompt(systemPrompt: string, contextInfo: string | null): string {
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dateStr = `${days[now.getDay()]} ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

    let prompt = systemPrompt;
    prompt += `\n\nFecha y hora actual: ${dateStr}, ${timeStr}.`;
    if (contextInfo) {
        prompt += `\n\nInformación de contexto adicional:\n${contextInfo}`;
    }
    prompt += '\n\nSi el usuario insiste en hablar con un humano o si no puedes resolver su consulta, responde con [TRANSFER_TO_HUMAN] al inicio de tu mensaje seguido de un mensaje de despedida amable.';
    return prompt;
}

async function transferToHuman(conversationId: string, companyId: string) {
    const leastBusyId = await findLeastBusyAgent(companyId);

    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            handledByAiAgentId: null,
            ...(leastBusyId
                ? { assignedAgents: { connect: { id: leastBusyId } } }
                : {}),
        },
    });
}
