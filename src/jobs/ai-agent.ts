import { prisma } from '@/lib/prisma';
import { getOpenAIForCompany } from '@/lib/openai';
import { sendChannelMessage, sendWhatsAppTypingIndicator } from '@/lib/channel-sender';
import { checkCreditBalance, deductCredits, logUsageOnly } from '@/lib/credits';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { CALENDAR_TOOLS, executeCalendarTool } from '@/lib/calendar-tools';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

interface AiAgentResult {
    handled: boolean;
    transferredToHuman?: boolean;
}

const MAX_TOOL_ITERATIONS = 5;

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

        // Check if calendar is enabled for this agent and company has it connected
        let calendarEnabled = false;
        if (aiAgent.calendarEnabled) {
            const company = await prisma.company.findUnique({
                where: { id: conversation.companyId },
                select: { googleCalendarRefreshToken: true },
            });
            calendarEnabled = !!company?.googleCalendarRefreshToken;
        }

        // Build chat history
        const messages: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: buildSystemPrompt(aiAgent.systemPrompt, aiAgent.contextInfo, calendarEnabled),
            },
        ];

        for (const msg of conversation.messages) {
            messages.push({
                role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
                content: msg.content,
            });
        }

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

        // Build tools array
        const dataCaptureTools: ChatCompletionTool[] = [
            {
                type: 'function',
                function: {
                    name: 'save_captured_data',
                    description: 'Guarda un dato capturado del cliente durante la conversacion. Usa esta herramienta cada vez que el cliente te proporcione informacion personal o relevante como nombre, email, telefono, cedula, empresa, direccion, etc.',
                    parameters: {
                        type: 'object',
                        properties: {
                            field_name: {
                                type: 'string',
                                description: 'Nombre del campo en snake_case. Ejemplos: nombre, email, telefono, cedula, empresa, direccion, ciudad, producto_interes',
                            },
                            field_value: {
                                type: 'string',
                                description: 'El valor que proporciono el cliente',
                            },
                        },
                        required: ['field_name', 'field_value'],
                    },
                },
            },
        ];
        const tools: ChatCompletionTool[] = [
            ...dataCaptureTools,
            ...(calendarEnabled ? CALENDAR_TOOLS : []),
        ];

        // Function calling loop
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalTokens = 0;
        let replyContent: string | null = null;

        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const response = await openai.chat.completions.create({
                model: aiAgent.model,
                temperature: aiAgent.temperature,
                messages,
                ...(tools.length > 0 ? { tools } : {}),
            });

            // Accumulate token usage
            if (response.usage) {
                totalPromptTokens += response.usage.prompt_tokens;
                totalCompletionTokens += response.usage.completion_tokens;
                totalTokens += response.usage.total_tokens;
            }

            const choice = response.choices[0];
            if (!choice) break;

            const assistantMessage = choice.message;

            // If there are tool calls, execute them and loop
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // Add assistant message with tool calls to history
                messages.push(assistantMessage);

                // Execute each tool call
                for (const toolCall of assistantMessage.tool_calls) {
                    if (toolCall.type !== 'function') continue;
                    const args = JSON.parse(toolCall.function.arguments);
                    let result: string;

                    if (toolCall.function.name === 'save_captured_data') {
                        try {
                            await prisma.capturedData.create({
                                data: {
                                    companyId: conversation.companyId,
                                    conversationId: conversation.id,
                                    contactId: conversation.contactId,
                                    fieldName: args.field_name,
                                    fieldValue: args.field_value,
                                    source: 'ai_agent',
                                },
                            });
                            result = JSON.stringify({ success: true, message: `Dato "${args.field_name}" guardado correctamente.` });
                        } catch (err) {
                            result = JSON.stringify({ success: false, message: 'Error al guardar el dato.' });
                        }
                    } else {
                        result = await executeCalendarTool(
                            toolCall.function.name,
                            args,
                            conversation.companyId,
                            aiAgent.calendarId,
                        );
                    }

                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: result,
                    });
                }

                // Continue the loop to get the next response
                continue;
            }

            // No tool calls — this is the final text response
            replyContent = assistantMessage.content;
            break;
        }

        // Track usage (accumulated across all iterations)
        if (totalTokens > 0) {
            if (usesOwnKey) {
                await logUsageOnly({
                    companyId: conversation.companyId,
                    conversationId: conversation.id,
                    model: aiAgent.model,
                    promptTokens: totalPromptTokens,
                    completionTokens: totalCompletionTokens,
                    totalTokens,
                });
            } else {
                await deductCredits({
                    companyId: conversation.companyId,
                    conversationId: conversation.id,
                    model: aiAgent.model,
                    promptTokens: totalPromptTokens,
                    completionTokens: totalCompletionTokens,
                    totalTokens,
                });
            }
        }

        if (!replyContent) {
            return { handled: false };
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

function buildSystemPrompt(systemPrompt: string, contextInfo: string | null, calendarEnabled: boolean): string {
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

    if (calendarEnabled) {
        prompt += '\n\nTienes acceso a Google Calendar. Puedes consultar disponibilidad, listar eventos y agendar reuniones. Cuando un cliente quiera agendar una reunión:';
        prompt += '\n1. Primero verifica la disponibilidad con check_calendar_availability.';
        prompt += '\n2. Si está disponible, crea el evento con create_calendar_event.';
        prompt += '\n3. Confirma al cliente con los detalles de la reunión.';
        prompt += '\nSi el horario no está disponible, sugiere alternativas. Usa formato 24h para las horas internamente pero comunica en formato 12h al cliente.';
    }

    prompt += '\n\nTienes la herramienta save_captured_data para guardar datos del cliente. Cada vez que el cliente te proporcione informacion personal o relevante (nombre, email, telefono, cedula, empresa, direccion, producto de interes, etc.), usa esta herramienta para guardarla. No le pidas al cliente confirmar el guardado, simplemente guardalo y continua la conversacion naturalmente.';

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
