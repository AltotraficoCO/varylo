import { prisma } from '@/lib/prisma';
import { getOpenAIForCompany } from '@/lib/openai';
import { sendChannelMessage, sendWhatsAppTypingIndicator } from '@/lib/channel-sender';
import { checkCreditBalance, deductCredits, logUsageOnly } from '@/lib/credits';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { CALENDAR_TOOLS, executeCalendarTool } from '@/lib/calendar-tools';
import { ECOMMERCE_TOOLS, executeEcommerceTool } from '@/lib/ecommerce-tools';
import { mapFieldToContact, validateCapturedValue, inferValidationType } from '@/lib/data-capture-utils';
// CRM removed
import { sendWebhook, buildWebhookPayload } from '@/lib/webhook-sender';
import type { WebhookConfig } from '@/types/chatbot';
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionContentPart } from 'openai/resources/chat/completions';
import type OpenAI from 'openai';

interface AiAgentResult {
    handled: boolean;
    transferredToHuman?: boolean;
}

const MAX_TOOL_ITERATIONS = 8;

// ── Tool definitions ────────────────────────────────────────────────

const DATA_CAPTURE_TOOLS: ChatCompletionTool[] = [
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

const DOCUMENT_CAPTURE_TOOLS: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'save_document',
            description: 'Guarda un documento o archivo enviado por el cliente (imagen, PDF, hoja de vida, etc). Usa esta herramienta cuando el cliente envie un archivo adjunto y quieras registrarlo.',
            parameters: {
                type: 'object',
                properties: {
                    field_name: {
                        type: 'string',
                        description: 'Nombre descriptivo del documento en snake_case. Ej: hoja_de_vida, cedula, foto_producto, contrato, factura',
                    },
                },
                required: ['field_name'],
            },
        },
    },
];

const FILE_ANALYSIS_TOOLS: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'analyze_file',
            description: 'Analiza el contenido de una imagen enviada por el cliente usando visión por computadora (OCR). Extrae texto, datos clave o describe el contenido visual. Úsala cuando necesites leer el contenido de una imagen, factura, cédula, formulario, recibo, foto de producto, o cualquier documento visual.',
            parameters: {
                type: 'object',
                properties: {
                    field_name: {
                        type: 'string',
                        description: 'Nombre del campo donde guardar el resultado del análisis en snake_case. Ej: datos_cedula, texto_factura, contenido_formulario, descripcion_foto',
                    },
                    instruction: {
                        type: 'string',
                        description: 'Instrucción específica de qué extraer o analizar. Ej: "Extrae el número de cédula y nombre completo", "Lee el monto total y número de factura", "Describe qué aparece en la imagen"',
                    },
                },
                required: ['field_name', 'instruction'],
            },
        },
    },
];

const WEBHOOK_TOOLS: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'send_to_webhook',
            description: 'Envia todos los datos capturados del cliente al sistema externo (ERP/CRM). Usa esta herramienta cuando hayas terminado de recopilar la informacion del cliente y la conversacion de captura haya concluido.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    },
];

// CRM_TOOLS removed

// ── Main handler ────────────────────────────────────────────────────

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
                    take: 20,
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

        console.log(`[AI Agent] ${aiAgent.name} | model: ${aiAgent.model}`);

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

        // Fire-and-forget typing indicator (don't block on it)
        if (conversation.channel?.type === 'WHATSAPP') {
            const config = conversation.channel.configJson as { phoneNumberId?: string; accessToken?: string } | null;
            const lastInbound = [...conversation.messages].reverse().find(m => m.direction === 'INBOUND');
            if (config?.phoneNumberId && config?.accessToken && lastInbound?.providerMessageId) {
                sendWhatsAppTypingIndicator(
                    config.phoneNumberId,
                    config.accessToken,
                    conversation.contact?.phone || '',
                    lastInbound.providerMessageId,
                ).catch(() => {});
            }
        }

        // Parse webhook config
        const webhookConfig = aiAgent.webhookConfigJson as WebhookConfig | null;

        // Run independent checks in parallel
        const [calendarResult, ecommerceResult, openaiResult, creditResult] = await Promise.all([
            aiAgent.calendarEnabled
                ? prisma.company.findUnique({
                    where: { id: conversation.companyId },
                    select: { googleCalendarRefreshToken: true },
                }).then(c => !!c?.googleCalendarRefreshToken)
                : Promise.resolve(false),
            aiAgent.ecommerceEnabled
                ? prisma.ecommerceIntegration.findFirst({
                    where: { companyId: conversation.companyId, active: true },
                    select: { active: true },
                }).then(i => !!i?.active)
                : Promise.resolve(false),
            getOpenAIForCompany(conversation.companyId),
            checkCreditBalance(conversation.companyId),
        ]);

        const calendarEnabled = calendarResult;
        const ecommerceEnabled = ecommerceResult;
        const { client: openai, usesOwnKey } = openaiResult;

        // Credit check: if not using own key, must have credits
        if (!usesOwnKey) {
            if (!creditResult.hasCredits) {
                console.log(`[AI Agent] Company ${conversation.companyId} has no credits, skipping AI`);
                return { handled: false };
            }
        }

        // Build chat history
        const messages: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: buildSystemPrompt({
                    systemPrompt: aiAgent.systemPrompt,
                    contextInfo: aiAgent.contextInfo,
                    calendarEnabled,
                    ecommerceEnabled,
                    dataCaptureEnabled: aiAgent.dataCaptureEnabled,
                    captureFields: aiAgent.captureFields as CaptureField[] | null,
                    webhookEnabled: !!webhookConfig?.url,
                }),
            },
        ];

        // Pre-fetch all inbound images in parallel so OpenAI can access them
        // (Supabase Storage URLs may not be publicly reachable from OpenAI servers)
        const imageMessages = conversation.messages.filter(
            m => m.direction === 'INBOUND' && m.mediaUrl && m.mediaType === 'image',
        );
        const imageBase64Map = new Map<string, string>();
        await Promise.all(imageMessages.map(async (m) => {
            try {
                const res = await fetch(m.mediaUrl!);
                if (!res.ok) return;
                const buf = Buffer.from(await res.arrayBuffer());
                const mime = res.headers.get('content-type')?.split(';')[0] || m.mimeType || 'image/jpeg';
                imageBase64Map.set(m.mediaUrl!, `data:${mime};base64,${buf.toString('base64')}`);
            } catch {
                // If download fails, the message will be sent as text-only
            }
        }));

        for (const msg of conversation.messages) {
            const role = msg.direction === 'INBOUND' ? 'user' : 'assistant';

            // Pass images as multimodal content so the agent can see them
            const base64DataUrl = msg.mediaUrl ? imageBase64Map.get(msg.mediaUrl) : undefined;
            if (msg.direction === 'INBOUND' && base64DataUrl) {
                const parts: ChatCompletionContentPart[] = [];
                if (msg.content?.trim()) {
                    parts.push({ type: 'text', text: msg.content });
                }
                parts.push({
                    type: 'image_url',
                    image_url: { url: base64DataUrl, detail: 'auto' },
                });
                messages.push({ role: 'user', content: parts });
            } else {
                messages.push({ role, content: msg.content || '' });
            }
        }

        // Build tools array (conditional based on agent config)
        const tools: ChatCompletionTool[] = [
            ...(aiAgent.dataCaptureEnabled ? DATA_CAPTURE_TOOLS : []),
            ...(aiAgent.dataCaptureEnabled ? DOCUMENT_CAPTURE_TOOLS : []),
            ...(aiAgent.dataCaptureEnabled ? FILE_ANALYSIS_TOOLS : []),
            ...(webhookConfig?.url ? WEBHOOK_TOOLS : []),
            ...(calendarEnabled ? CALENDAR_TOOLS : []),
            ...(ecommerceEnabled ? ECOMMERCE_TOOLS : []),
        ];

        // Function calling loop
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalTokens = 0;
        let replyContent: string | null = null;
        const calledTools = new Set<string>();

        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const response = await openai.chat.completions.create({
                model: aiAgent.model,
                temperature: aiAgent.temperature,
                messages,
                ...(tools.length > 0 ? { tools } : {}),
            });

            if (response.usage) {
                totalPromptTokens += response.usage.prompt_tokens;
                totalCompletionTokens += response.usage.completion_tokens;
                totalTokens += response.usage.total_tokens;
            }

            const choice = response.choices[0];
            if (!choice) break;

            const assistantMessage = choice.message;

            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                messages.push(assistantMessage);

                for (const toolCall of assistantMessage.tool_calls) {
                    if (toolCall.type !== 'function') continue;
                    const args = JSON.parse(toolCall.function.arguments);
                    let result: string;

                    switch (toolCall.function.name) {
                        case 'save_captured_data':
                            result = await handleSaveCapturedData(
                                args,
                                conversation.companyId,
                                conversation.id,
                                conversation.contactId,
                            );
                            break;

                        case 'save_document':
                            result = await handleSaveDocument(
                                args,
                                conversation.companyId,
                                conversation.id,
                                conversation.contactId,
                                conversation.messages,
                            );
                            break;

                        case 'analyze_file':
                            result = await handleAnalyzeFile(
                                args,
                                conversation.companyId,
                                conversation.id,
                                conversation.contactId,
                                conversation.messages,
                                openai,
                                usesOwnKey,
                            );
                            break;

                        case 'send_to_webhook':
                            result = await handleSendToWebhook(
                                webhookConfig!,
                                conversation.id,
                            );
                            break;

                        case 'search_products':
                        case 'get_product_details':
                        case 'check_inventory':
                        case 'get_payment_methods':
                        case 'create_order':
                            if (toolCall.function.name === 'create_order' && !calledTools.has('search_products')) {
                                result = JSON.stringify({
                                    error: 'No puedes crear un pedido sin antes buscar los productos. DEBES llamar search_products primero para obtener los IDs reales de los productos, y luego get_product_details para obtener los IDs de las variantes. Los IDs son números que devuelve la API, NO los inventes.',
                                });
                            } else {
                                result = await executeEcommerceTool(
                                    toolCall.function.name,
                                    args,
                                    conversation.companyId,
                                );
                            }
                            calledTools.add(toolCall.function.name);
                            break;

                        default:
                            result = await executeCalendarTool(
                                toolCall.function.name,
                                args,
                                conversation.companyId,
                                aiAgent.calendarId,
                            );
                            break;
                    }

                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: result,
                    });
                }

                continue;
            }

            // No tool calls — final text response
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

// ── Tool handlers ───────────────────────────────────────────────────

async function handleSaveCapturedData(
    args: { field_name: string; field_value: string },
    companyId: string,
    conversationId: string,
    contactId: string | null,
): Promise<string> {
    try {
        // Validate based on field name
        const validationType = inferValidationType(args.field_name);
        const validation = validateCapturedValue(args.field_value, validationType);

        if (!validation.valid) {
            return JSON.stringify({
                success: false,
                message: `El valor no es válido para "${args.field_name}". ${validation.hint || ''}. Pídele al cliente que lo corrija.`,
            });
        }

        const trimmedValue = args.field_value.trim();

        // Update existing or create new capture for this field
        const existing = await prisma.capturedData.findFirst({
            where: { conversationId, fieldName: args.field_name },
            select: { id: true },
        });

        if (existing) {
            await prisma.capturedData.update({
                where: { id: existing.id },
                data: { fieldValue: trimmedValue },
            });
        } else {
            await prisma.capturedData.create({
                data: {
                    companyId,
                    conversationId,
                    contactId,
                    fieldName: args.field_name,
                    fieldValue: trimmedValue,
                    source: 'ai_agent',
                },
            });
        }

        // Update contact record only if the field is currently empty
        if (contactId) {
            const contactUpdate = mapFieldToContact(args.field_name, trimmedValue);
            if (contactUpdate) {
                const fieldKey = Object.keys(contactUpdate)[0];
                const contact = await prisma.contact.findUnique({
                    where: { id: contactId },
                    select: { [fieldKey]: true },
                });
                // Only fill empty fields — never overwrite existing data
                if (contact && !contact[fieldKey]) {
                    await prisma.contact.update({
                        where: { id: contactId },
                        data: contactUpdate,
                    }).catch(() => {});
                }
            }
        }

        return JSON.stringify({ success: true, message: `Dato "${args.field_name}" guardado correctamente.` });
    } catch (err) {
        return JSON.stringify({ success: false, message: 'Error al guardar el dato.' });
    }
}

async function handleSaveDocument(
    args: { field_name: string },
    companyId: string,
    conversationId: string,
    contactId: string | null,
    conversationMessages: MediaMessage[],
): Promise<string> {
    try {
        // Find the last inbound message with media
        const lastMediaMessage = [...conversationMessages]
            .reverse()
            .find(m => m.direction === 'INBOUND' && m.mediaUrl);

        if (!lastMediaMessage?.mediaUrl) {
            return JSON.stringify({
                success: false,
                message: 'No se encontró ningún archivo adjunto en los mensajes recientes del cliente. Pídele que envíe el documento.',
            });
        }

        const docValue = JSON.stringify({
            url: lastMediaMessage.mediaUrl,
            mimeType: lastMediaMessage.mimeType || null,
            fileName: lastMediaMessage.fileName || null,
            mediaType: lastMediaMessage.mediaType || null,
        });

        await prisma.capturedData.create({
            data: {
                companyId,
                conversationId,
                contactId,
                fieldName: args.field_name,
                fieldValue: docValue,
                source: 'ai_agent',
            },
        });

        return JSON.stringify({
            success: true,
            message: `Documento "${args.field_name}" guardado correctamente (${lastMediaMessage.fileName || lastMediaMessage.mediaType || 'archivo'}).`,
        });
    } catch (err) {
        return JSON.stringify({ success: false, message: 'Error al guardar el documento.' });
    }
}

type MediaMessage = { direction: string; mediaUrl: string | null; mediaType: string | null; mimeType: string | null; fileName: string | null };

async function handleAnalyzeFile(
    args: { field_name: string; instruction: string },
    companyId: string,
    conversationId: string,
    contactId: string | null,
    conversationMessages: MediaMessage[],
    openai: OpenAI,
    usesOwnKey: boolean,
): Promise<string> {
    try {
        const lastMediaMessage = [...conversationMessages]
            .reverse()
            .find(m => m.direction === 'INBOUND' && m.mediaUrl && m.mediaType === 'image');

        if (!lastMediaMessage?.mediaUrl) {
            return JSON.stringify({
                success: false,
                message: 'No se encontró ninguna imagen en los mensajes recientes. Solo puedo analizar imágenes (JPG, PNG, etc.). Para archivos PDF u otros documentos, usa save_document.',
            });
        }

        // Download the image server-side and convert to base64 so OpenAI
        // can access it regardless of Supabase bucket visibility settings.
        let imageDataUrl: string;
        try {
            const imgRes = await fetch(lastMediaMessage.mediaUrl);
            if (!imgRes.ok) {
                console.error(`[AI Agent] Image download failed: HTTP ${imgRes.status} - ${lastMediaMessage.mediaUrl}`);
                return JSON.stringify({
                    success: false,
                    message: `No se pudo descargar la imagen (HTTP ${imgRes.status}). Por favor intenta de nuevo.`,
                });
            }
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            const mime = imgRes.headers.get('content-type')?.split(';')[0] || lastMediaMessage.mimeType || 'image/jpeg';
            imageDataUrl = `data:${mime};base64,${imgBuffer.toString('base64')}`;
        } catch (fetchErr) {
            console.error('[AI Agent] Image fetch error:', fetchErr);
            return JSON.stringify({ success: false, message: 'No se pudo descargar la imagen para analizarla.' });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.1,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: args.instruction },
                        { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
                    ],
                },
            ],
        });

        const analysisText = response.choices[0]?.message?.content || '';

        // Track tokens for vision call (gpt-4o, higher cost)
        if (response.usage) {
            if (usesOwnKey) {
                await logUsageOnly({
                    companyId,
                    conversationId,
                    model: 'gpt-4o',
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens,
                });
            } else {
                await deductCredits({
                    companyId,
                    conversationId,
                    model: 'gpt-4o',
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens,
                });
            }
        }

        // Save analysis result as captured data
        const existing = await prisma.capturedData.findFirst({
            where: { conversationId, fieldName: args.field_name },
            select: { id: true },
        });
        if (existing) {
            await prisma.capturedData.update({
                where: { id: existing.id },
                data: { fieldValue: analysisText },
            });
        } else {
            await prisma.capturedData.create({
                data: {
                    companyId,
                    conversationId,
                    contactId,
                    fieldName: args.field_name,
                    fieldValue: analysisText,
                    source: 'ai_agent',
                },
            });
        }

        return JSON.stringify({
            success: true,
            analysis: analysisText,
            message: `Análisis completado y guardado en "${args.field_name}".`,
        });
    } catch (err) {
        console.error('[AI Agent] Error analyzing file:', err);
        return JSON.stringify({ success: false, message: 'Error al analizar la imagen.' });
    }
}

async function handleSendToWebhook(
    webhookConfig: WebhookConfig,
    conversationId: string,
): Promise<string> {
    try {
        // Fetch all captured data for this conversation
        const allCaptured = await prisma.capturedData.findMany({
            where: { conversationId },
            select: { fieldName: true, fieldValue: true },
        });

        if (allCaptured.length === 0) {
            return JSON.stringify({
                success: false,
                message: 'No hay datos capturados para enviar. Recopila información del cliente primero.',
            });
        }

        // Separate text fields from documents
        const textFields: { fieldName: string; fieldValue: string }[] = [];
        const documents: { fieldName: string; url: string; mimeType: string | null; fileName: string | null }[] = [];

        for (const field of allCaptured) {
            try {
                const parsed = JSON.parse(field.fieldValue);
                if (parsed && typeof parsed === 'object' && parsed.url) {
                    documents.push({
                        fieldName: field.fieldName,
                        url: parsed.url,
                        mimeType: parsed.mimeType || null,
                        fileName: parsed.fileName || null,
                    });
                    continue;
                }
            } catch {
                // Not JSON — it's a text field
            }
            textFields.push(field);
        }

        const payload = buildWebhookPayload(
            conversationId,
            textFields,
            documents,
            'ai_agent.data_captured',
        );

        const result = await sendWebhook(webhookConfig, payload);

        if (result.ok) {
            return JSON.stringify({ success: true, message: 'Datos enviados exitosamente al sistema externo.' });
        }
        return JSON.stringify({
            success: false,
            message: `Error al enviar datos: ${result.error || `HTTP ${result.status}`}`,
        });
    } catch (err) {
        return JSON.stringify({ success: false, message: 'Error al enviar datos al webhook.' });
    }
}

// ── System prompt builder ───────────────────────────────────────────

interface CaptureField {
    key: string;
    label: string;
    required: boolean;
}

interface SystemPromptOptions {
    systemPrompt: string;
    contextInfo: string | null;
    calendarEnabled: boolean;
    ecommerceEnabled: boolean;
    dataCaptureEnabled: boolean;
    captureFields: CaptureField[] | null;
    webhookEnabled: boolean;
}

function buildSystemPrompt(opts: SystemPromptOptions): string {
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dateStr = `${days[now.getDay()]} ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

    let prompt = opts.systemPrompt;
    prompt += `\n\nFecha y hora actual: ${dateStr}, ${timeStr}.`;

    if (opts.contextInfo) {
        prompt += `\n\nInformación de contexto adicional:\n${opts.contextInfo}`;
    }

    if (opts.calendarEnabled) {
        prompt += '\n\nTienes acceso a Google Calendar. Puedes consultar disponibilidad, listar eventos y agendar reuniones. Cuando un cliente quiera agendar una reunión:';
        prompt += '\n1. Primero verifica la disponibilidad con check_calendar_availability.';
        prompt += '\n2. Si está disponible, crea el evento con create_calendar_event.';
        prompt += '\n3. Confirma al cliente con los detalles de la reunión.';
        prompt += '\nSi el horario no está disponible, sugiere alternativas. Usa formato 24h para las horas internamente pero comunica en formato 12h al cliente.';
    }

    if (opts.ecommerceEnabled) {
        prompt += '\n\nTienes acceso a la tienda online de la empresa. Puedes buscar productos, consultar detalles, verificar inventario, consultar métodos de pago y crear pedidos. Cuando un cliente pregunte por productos:';
        prompt += '\n1. Usa search_products para buscar productos por nombre o categoría. Esto te da el ID NUMÉRICO de cada producto (ej: "1234").';
        prompt += '\n2. Usa get_product_details con el ID numérico para obtener variantes con sus IDs numéricos, precios, tallas, colores.';
        prompt += '\n3. Usa check_inventory para verificar disponibilidad y stock.';
        prompt += '\n4. Usa get_payment_methods para consultar los medios de pago disponibles cuando el cliente pregunte cómo pagar.';
        prompt += '\n5. Cuando el cliente quiera comprar, ANTES de crear el pedido debes tener TODOS estos datos: nombre completo, correo electrónico, teléfono, dirección de envío y ciudad. El correo es OBLIGATORIO, no crees el pedido sin él. Si falta algún dato, pídelo amablemente.';
        prompt += '\n6. Usa create_order para crear el pedido. IMPORTANTE: product_id debe ser el "id" que devolvió search_products. Si el producto es variable, variation_id debe ser el "id" de la variante que devolvió get_product_details (es un número diferente al product_id). NUNCA inventes IDs ni uses ejemplos.';
        prompt += '\nDespués de crear el pedido, envía el link de pago al cliente para que complete su compra.';
        prompt += '\nPresenta la información de forma clara y amigable. Incluye precios y disponibilidad. Si un producto no está disponible, sugiere alternativas buscando productos similares.';
    }

    if (opts.dataCaptureEnabled) {
        if (opts.captureFields && opts.captureFields.length > 0) {
            const requiredFields = opts.captureFields.filter(f => f.required);
            const optionalFields = opts.captureFields.filter(f => !f.required);
            prompt += '\n\nTienes la herramienta save_captured_data para guardar datos del cliente. Debes capturar los siguientes datos durante la conversacion:';
            if (requiredFields.length > 0) {
                prompt += '\n\nCampos OBLIGATORIOS (debes obtenerlos):';
                requiredFields.forEach(f => { prompt += `\n- ${f.label} (field_name: "${f.key}")`; });
            }
            if (optionalFields.length > 0) {
                prompt += '\n\nCampos opcionales (captura si el cliente los menciona):';
                optionalFields.forEach(f => { prompt += `\n- ${f.label} (field_name: "${f.key}")`; });
            }
            prompt += '\n\nCada vez que el cliente te proporcione uno de estos datos, usa save_captured_data con el field_name correspondiente. No le pidas confirmar el guardado, simplemente guardalo y continua naturalmente.';
        } else {
            prompt += '\n\nTienes la herramienta save_captured_data para guardar datos del cliente. Cada vez que el cliente te proporcione informacion personal o relevante (nombre, email, telefono, cedula, empresa, direccion, producto de interes, etc.), usa esta herramienta para guardarla. No le pidas al cliente confirmar el guardado, simplemente guardalo y continua la conversacion naturalmente.';
        }
        prompt += '\n\nTambién tienes la herramienta save_document para guardar archivos adjuntos que envíe el cliente (hojas de vida, documentos, fotos, etc.). Cuando el cliente envíe un archivo, usa save_document con un nombre descriptivo.';
        prompt += '\n\nTienes la herramienta analyze_file para leer el contenido de imágenes usando visión por computadora (OCR). Cuando el cliente envíe una imagen de una cédula, factura, recibo, formulario, foto de producto u otro documento visual, usa analyze_file con una instrucción específica de qué extraer. El resultado queda guardado automáticamente. Para archivos PDF u otros documentos no visuales, usa save_document en su lugar.';

        if (opts.webhookEnabled) {
            prompt += '\n\nTienes la herramienta send_to_webhook para enviar todos los datos capturados al sistema externo. IMPORTANTE: Debes llamar send_to_webhook SIEMPRE al concluir la recopilación de datos del cliente. Cuando hayas terminado de capturar toda la información necesaria (datos personales, documentos, etc.), usa send_to_webhook para enviar todo. No olvides confirmar al cliente que sus datos fueron enviados exitosamente.';
        }
    }

    prompt += '\n\nSi el usuario insiste en hablar con un humano o si no puedes resolver su consulta, responde con [TRANSFER_TO_HUMAN] al inicio de tu mensaje seguido de un mensaje de despedida amable.';
    return prompt;
}

// ── Helpers ─────────────────────────────────────────────────────────

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
