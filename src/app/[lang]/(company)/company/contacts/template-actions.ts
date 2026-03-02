'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { findLeastBusyAgent } from '@/lib/assign-agent';

interface TemplateComponent {
    type: string;
    text?: string;
    parameters?: { type: string; text?: string }[];
}

interface WhatsAppTemplate {
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

export async function getWhatsAppTemplates(): Promise<{
    success: boolean;
    templates?: WhatsAppTemplate[];
    error?: string;
}> {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No autorizado.' };
    }

    const channel = await prisma.channel.findFirst({
        where: {
            companyId: session.user.companyId,
            type: ChannelType.WHATSAPP,
            status: 'CONNECTED',
        },
    });

    if (!channel?.configJson) {
        return { success: false, error: 'No hay canal WhatsApp configurado.' };
    }

    const config = channel.configJson as {
        accessToken?: string;
        wabaId?: string;
    };

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
                next: { revalidate: 300 },
            }
        );

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = (data as any)?.error?.message || `HTTP ${res.status}`;
            return { success: false, error: `Error de Meta: ${msg}` };
        }

        const data = await res.json();
        const templates: WhatsAppTemplate[] = (data.data || []).filter(
            (t: any) => t.status === 'APPROVED'
        );

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
}): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
        return { success: false, error: 'No autorizado.' };
    }

    const companyId = session.user.companyId;
    const userId = session.user.id;

    // 1. Find WhatsApp channel
    const channel = await prisma.channel.findFirst({
        where: {
            companyId,
            type: ChannelType.WHATSAPP,
            status: 'CONNECTED',
        },
    });

    if (!channel?.configJson) {
        return { success: false, error: 'No hay canal WhatsApp configurado.' };
    }

    const config = channel.configJson as {
        phoneNumberId?: string;
        accessToken?: string;
    };

    if (!config.phoneNumberId || !config.accessToken) {
        return { success: false, error: 'Canal WhatsApp incompleto.' };
    }

    // 2. Resolve or create contact
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

    // 3. Find open conversation or create one
    let conversation = await prisma.conversation.findFirst({
        where: {
            companyId,
            contactId: contact.id,
            channelId: channel.id,
            status: 'OPEN',
        },
    });

    if (!conversation) {
        const agentId = await findLeastBusyAgent(companyId) || userId;
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

    // 4. Send template via Meta API
    try {
        const res = await fetch(
            `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: contact.phone,
                    type: 'template',
                    template: {
                        name: params.templateName,
                        language: { code: params.templateLanguage },
                        components: params.templateComponents,
                    },
                }),
            }
        );

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = (errorData as any)?.error?.message || `HTTP ${res.status}`;
            console.error('[sendTemplateMessage] Meta API error:', errorMsg);
            return { success: false, error: `Error de WhatsApp: ${errorMsg}` };
        }

        const resData = await res.json();
        const providerMessageId = resData?.messages?.[0]?.id;

        // 5. Save message in DB
        await prisma.message.create({
            data: {
                companyId,
                conversationId: conversation.id,
                direction: MessageDirection.OUTBOUND,
                from: config.phoneNumberId,
                to: contact.phone,
                content: `[Plantilla: ${params.templateName}]`,
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
