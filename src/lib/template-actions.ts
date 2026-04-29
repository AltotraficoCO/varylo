'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { readChannelSecret } from '@/lib/channel-config';

export interface TemplateComponent {
    type: string;
    text?: string;
    parameters?: { type: string; text?: string }[];
}

export interface WhatsAppTemplate {
    id?: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

async function getWhatsAppChannelConfig(companyId: string) {
    const channel = await prisma.channel.findFirst({
        where: {
            companyId,
            type: ChannelType.WHATSAPP,
            status: 'CONNECTED',
        },
    });

    if (!channel?.configJson) {
        return { error: 'No hay canal WhatsApp configurado.' };
    }

    const raw = channel.configJson as {
        phoneNumberId?: string;
        accessToken?: unknown;
        verifyToken?: string;
        appSecret?: unknown;
        wabaId?: string;
    };

    const config = {
        phoneNumberId: raw.phoneNumberId,
        accessToken: readChannelSecret(raw.accessToken),
        verifyToken: raw.verifyToken,
        appSecret: readChannelSecret(raw.appSecret),
        wabaId: raw.wabaId,
    };

    return { channel, config };
}

export async function getWhatsAppTemplates(
    statusFilter: 'APPROVED' | 'ALL' = 'APPROVED'
): Promise<{
    success: boolean;
    templates?: WhatsAppTemplate[];
    error?: string;
}> {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No autorizado.' };
    }

    const result = await getWhatsAppChannelConfig(session.user.companyId);
    if ('error' in result) {
        return { success: false, error: result.error };
    }

    const { config } = result;

    if (!config.accessToken || !config.wabaId) {
        return {
            success: false,
            error: 'Falta el WABA ID o Access Token. Configúralo en Ajustes → Canales.',
        };
    }

    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${config.wabaId}/message_templates?limit=100&fields=id,name,language,status,category,components`,
            {
                headers: { Authorization: `Bearer ${config.accessToken}` },
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = (data as any)?.error?.message || `HTTP ${res.status}`;
            return { success: false, error: `Error de Meta: ${msg}` };
        }

        const data = await res.json();
        const allTemplates: WhatsAppTemplate[] = data.data || [];

        const templates =
            statusFilter === 'APPROVED'
                ? allTemplates.filter((t) => t.status === 'APPROVED')
                : allTemplates;

        return { success: true, templates };
    } catch (error) {
        console.error('[getWhatsAppTemplates]', error);
        return { success: false, error: 'Error al obtener plantillas.' };
    }
}

export async function sendTemplateMessage(params: {
    contactId?: string;
    phone?: string;
    contactName?: string;
    templateName: string;
    templateLanguage: string;
    templateComponents: any[];
    templateBody?: string;
}): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
        return { success: false, error: 'No autorizado.' };
    }

    const companyId = session.user.companyId;
    const userId = session.user.id;

    const result = await getWhatsAppChannelConfig(companyId);
    if ('error' in result) {
        return { success: false, error: result.error };
    }

    const { channel, config } = result;

    if (!config.phoneNumberId || !config.accessToken) {
        return { success: false, error: 'Canal WhatsApp incompleto.' };
    }

    // Resolve or create contact
    let contact;
    if (params.contactId) {
        contact = await prisma.contact.findFirst({
            where: { id: params.contactId, companyId },
        });
        if (!contact) {
            return { success: false, error: 'Contacto no encontrado.' };
        }
    } else if (params.phone) {
        const phone = params.phone.replace(/[^0-9]/g, '');
        contact = await prisma.contact.findFirst({
            where: { companyId, phone },
        });
        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    companyId,
                    phone,
                    name: params.contactName || phone,
                    originChannel: ChannelType.WHATSAPP,
                },
            });
        }
    } else {
        return { success: false, error: 'Debes indicar un contacto o número de teléfono.' };
    }

    // Find open conversation or create one
    let conversation = await prisma.conversation.findFirst({
        where: {
            companyId,
            contactId: contact.id,
            channelId: channel.id,
            status: 'OPEN',
        },
    });

    if (!conversation) {
        const agentId = (await findLeastBusyAgent(companyId)) || userId;
        conversation = await prisma.conversation.create({
            data: {
                companyId,
                channelId: channel.id,
                contactId: contact.id,
                status: 'OPEN',
                assignedAgents: { connect: { id: agentId } },
            },
        });
    }

    // Send template via Meta API
    try {
        const templatePayload: any = {
            name: params.templateName,
            language: { code: params.templateLanguage },
        };
        if (params.templateComponents.length > 0) {
            templatePayload.components = params.templateComponents;
        }

        const metaBody = {
            messaging_product: 'whatsapp',
            to: contact.phone,
            type: 'template',
            template: templatePayload,
        };

        const res = await fetch(
            `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metaBody),
            }
        );

        const resData = await res.json().catch(() => ({}));

        if (!res.ok) {
            const errorMsg = (resData as any)?.error?.message || `HTTP ${res.status}`;
            console.error('[sendTemplateMessage] Meta API error:', errorMsg);
            return { success: false, error: `Error de WhatsApp: ${errorMsg}` };
        }

        const providerMessageId = resData?.messages?.[0]?.id;

        // Save message in DB
        await prisma.message.create({
            data: {
                companyId,
                conversationId: conversation.id,
                direction: MessageDirection.OUTBOUND,
                from: config.phoneNumberId,
                to: contact.phone,
                content: params.templateBody || `[Plantilla: ${params.templateName}]`,
                providerMessageId,
                senderId: userId,
            },
        });

        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: new Date(),
                lastInboundAt: new Date(), // Template opens a 24h business-initiated window
            },
        });

        return { success: true, conversationId: conversation.id };
    } catch (error) {
        console.error('[sendTemplateMessage] Error:', error);
        return { success: false, error: 'Error al enviar la plantilla.' };
    }
}

// ─────────────────────────────────────────────────────────────────
// CREATE / DELETE
// ─────────────────────────────────────────────────────────────────

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type TemplateButton =
    | { type: 'QUICK_REPLY'; text: string }
    | { type: 'URL'; text: string; url: string; example?: string }
    | { type: 'PHONE_NUMBER'; text: string; phone_number: string };

export interface CreateTemplateInput {
    name: string;
    language: string;
    category: TemplateCategory;
    header?:
        | { format: 'TEXT'; text: string; example?: string[] }
        | { format: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; mediaHandle: string };
    body: string;
    bodyExample?: string[];
    footer?: string;
    buttons?: TemplateButton[];
}

const NAME_RE = /^[a-z0-9_]{1,512}$/;

function buildComponents(input: CreateTemplateInput): unknown[] {
    const components: unknown[] = [];

    if (input.header) {
        if (input.header.format === 'TEXT') {
            const headerVarCount = (input.header.text.match(/\{\{\d+\}\}/g) || []).length;
            const example = headerVarCount > 0 && input.header.example
                ? { header_text: input.header.example.slice(0, headerVarCount) }
                : undefined;
            components.push({
                type: 'HEADER',
                format: 'TEXT',
                text: input.header.text,
                ...(example ? { example } : {}),
            });
        } else {
            components.push({
                type: 'HEADER',
                format: input.header.format,
                example: { header_handle: [input.header.mediaHandle] },
            });
        }
    }

    const bodyVarCount = (input.body.match(/\{\{\d+\}\}/g) || []).length;
    components.push({
        type: 'BODY',
        text: input.body,
        ...(bodyVarCount > 0 && input.bodyExample && input.bodyExample.length > 0
            ? { example: { body_text: [input.bodyExample.slice(0, bodyVarCount)] } }
            : {}),
    });

    if (input.footer) {
        components.push({ type: 'FOOTER', text: input.footer });
    }

    if (input.buttons && input.buttons.length > 0) {
        components.push({
            type: 'BUTTONS',
            buttons: input.buttons.map((b) => {
                if (b.type === 'URL') {
                    return {
                        type: 'URL',
                        text: b.text,
                        url: b.url,
                        ...(b.example ? { example: [b.example] } : {}),
                    };
                }
                if (b.type === 'PHONE_NUMBER') {
                    return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number };
                }
                return { type: 'QUICK_REPLY', text: b.text };
            }),
        });
    }

    return components;
}

export async function createWhatsAppTemplate(
    input: CreateTemplateInput
): Promise<{ success: boolean; templateId?: string; status?: string; error?: string }> {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado.' };

    if (!NAME_RE.test(input.name)) {
        return {
            success: false,
            error: 'El nombre debe ser minúsculas, números y guiones bajos (ej: order_confirmation).',
        };
    }
    if (!input.body || input.body.trim().length === 0) {
        return { success: false, error: 'El cuerpo de la plantilla es obligatorio.' };
    }

    const result = await getWhatsAppChannelConfig(session.user.companyId);
    if ('error' in result) return { success: false, error: result.error };

    const { config } = result;
    if (!config.accessToken || !config.wabaId) {
        return { success: false, error: 'Falta WABA ID o Access Token. Configúralo en Ajustes → Canales.' };
    }

    const payload = {
        name: input.name,
        language: input.language,
        category: input.category,
        components: buildComponents(input),
    };

    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${config.wabaId}/message_templates`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = (data as any)?.error?.message || `HTTP ${res.status}`;
            const detail = (data as any)?.error?.error_user_msg || (data as any)?.error?.error_data?.details;
            return { success: false, error: `Error de Meta: ${detail || msg}` };
        }

        return { success: true, templateId: data.id, status: data.status };
    } catch (error) {
        console.error('[createWhatsAppTemplate]', error);
        return { success: false, error: 'Error de red al crear la plantilla.' };
    }
}

export async function deleteWhatsAppTemplate(
    name: string,
    hsmId?: string
): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado.' };

    const result = await getWhatsAppChannelConfig(session.user.companyId);
    if ('error' in result) return { success: false, error: result.error };

    const { config } = result;
    if (!config.accessToken || !config.wabaId) {
        return { success: false, error: 'Falta WABA ID o Access Token.' };
    }

    const params = new URLSearchParams({ name });
    if (hsmId) params.set('hsm_id', hsmId);

    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${config.wabaId}/message_templates?${params.toString()}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${config.accessToken}` },
            }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = (data as any)?.error?.message || `HTTP ${res.status}`;
            return { success: false, error: `Error de Meta: ${msg}` };
        }

        return { success: true };
    } catch (error) {
        console.error('[deleteWhatsAppTemplate]', error);
        return { success: false, error: 'Error de red al borrar la plantilla.' };
    }
}
