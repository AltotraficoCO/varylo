'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { findLeastBusyAgent } from '@/lib/assign-agent';

export interface TemplateComponent {
    type: string;
    text?: string;
    parameters?: { type: string; text?: string }[];
}

export interface WhatsAppTemplate {
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

    const config = channel.configJson as {
        phoneNumberId?: string;
        accessToken?: string;
        verifyToken?: string;
        appSecret?: string;
        wabaId?: string;
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
            `https://graph.facebook.com/v18.0/${config.wabaId}/message_templates?limit=100`,
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

        console.log('[sendTemplateMessage] Sending to Meta:', JSON.stringify(metaBody, null, 2));

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
        console.log('[sendTemplateMessage] Meta response:', res.status, JSON.stringify(resData));

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
            data: { lastMessageAt: new Date() },
        });

        return { success: true, conversationId: conversation.id };
    } catch (error) {
        console.error('[sendTemplateMessage] Error:', error);
        return { success: false, error: 'Error al enviar la plantilla.' };
    }
}

