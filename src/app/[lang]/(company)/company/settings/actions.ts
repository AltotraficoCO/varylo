'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType, ChannelStatus, AutomationPriority, AssignmentStrategy } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { encrypt } from '@/lib/encryption';
import { getGoogleAuthUrl } from '@/lib/google-calendar';
import OpenAI from 'openai';

export async function saveWhatsAppCredentials(prevState: string | undefined, formData: FormData) {
    const session = await auth();

    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    const companyId = session.user.companyId;
    const phoneNumberId = formData.get('phoneNumberId') as string;
    const accessToken = formData.get('accessToken') as string;
    const verifyToken = formData.get('verifyToken') as string;
    const appSecret = formData.get('appSecret') as string;
    const wabaId = formData.get('wabaId') as string;

    if (!phoneNumberId || !accessToken || !verifyToken || !appSecret) {
        return 'Error: All fields are required.';
    }

    try {
        // Upsert the channel: look for existing WHATSAPP channel for this company
        // Since schema doesn't have unique constraint on [companyId, type], we findFirst then update or create.
        // Or we can assume one channel per type per company for now.

        const existingChannel = await prisma.channel.findFirst({
            where: {
                companyId,
                type: ChannelType.WHATSAPP,
            },
        });

        const configJson = {
            phoneNumberId,
            accessToken,
            verifyToken,
            appSecret,
            ...(wabaId ? { wabaId } : {}),
        };

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id, companyId },
                data: {
                    configJson,
                    status: ChannelStatus.CONNECTED,
                },
            });
        } else {
            await prisma.channel.create({
                data: {
                    companyId,
                    type: ChannelType.WHATSAPP,
                    status: ChannelStatus.CONNECTED,
                    configJson,
                },
            });
        }

        revalidatePath('/[lang]/company/settings', 'page');
        return 'Success: Credentials saved successfully.';
    } catch (error) {
        console.error('Failed to save WhatsApp credentials:', error);
        return 'Error: Failed to save credentials.';
    }
}

export async function testWhatsAppConnection() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: {
                companyId: session.user.companyId,
                type: ChannelType.WHATSAPP,
            },
        });

        if (!channel || !channel.configJson) {
            return { success: false, message: 'No WhatsApp configuration found.' };
        }

        const config = channel.configJson as { phoneNumberId?: string; accessToken?: string };
        const { phoneNumberId, accessToken } = config;

        if (!phoneNumberId || !accessToken) {
            return { success: false, message: 'Incomplete configuration.' };
        }

        // Make a lightweight request to Meta API to verify token validity
        // Fetching the phone number details is a good test
        // Request specific fields to show the user
        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Meta API error:', data.error);
            return { success: false, message: 'Error al comunicarse con Meta. Verifica tu configuración.' };
        }

        const data = await response.json();
        const displayInfo = data.verified_name || data.display_phone_number || 'WhatsApp Account';

        return { success: true, message: `Connectado: ${displayInfo} (${data.quality_rating})` };

    } catch (error) {
        console.error('Test connection failed:', error);
        return { success: false, message: 'Internal server error during test.' };
    }
}

export async function disconnectWhatsApp() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: {
                companyId: session.user.companyId,
                type: ChannelType.WHATSAPP,
            },
        });

        if (channel) {
            await prisma.channel.update({
                where: { id: channel.id },
                data: {
                    status: ChannelStatus.DISCONNECTED,
                    configJson: {}, // Clear credentials
                },
            });
        }

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, message: 'WhatsApp disconnected successfully.' };
    } catch (error) {
        console.error('Disconnect failed:', error);
        return { success: false, message: 'Failed to disconnect.' };
    }
}

// INSTAGRAM ACTIONS

export async function saveInstagramCredentials(prevState: string | undefined, formData: FormData) {
    const session = await auth();

    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    const companyId = session.user.companyId;
    const pageId = formData.get('pageId') as string;
    const accessToken = formData.get('accessToken') as string;
    const appSecret = formData.get('appSecret') as string;
    const verifyToken = formData.get('verifyToken') as string;

    if (!pageId || !accessToken || !appSecret) {
        return 'Error: Page ID, Access Token y App Secret son requeridos.';
    }

    try {
        const existingChannel = await prisma.channel.findFirst({
            where: {
                companyId,
                type: ChannelType.INSTAGRAM,
            },
        });

        const configJson = {
            pageId,
            accessToken,
            appSecret,
            verifyToken: verifyToken || (existingChannel?.configJson as any)?.verifyToken || '',
        };

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id, companyId },
                data: {
                    configJson,
                    status: ChannelStatus.CONNECTED,
                },
            });
        } else {
            await prisma.channel.create({
                data: {
                    companyId,
                    type: ChannelType.INSTAGRAM,
                    status: ChannelStatus.CONNECTED,
                    configJson,
                },
            });
        }

        revalidatePath('/[lang]/company/settings', 'page');
        return 'Success: Instagram connected successfully.';
    } catch (error) {
        console.error('Failed to save Instagram credentials:', error);
        return 'Error: Failed to save credentials.';
    }
}

export async function testInstagramConnection() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: {
                companyId: session.user.companyId,
                type: ChannelType.INSTAGRAM,
            },
        });

        if (!channel || !channel.configJson) {
            return { success: false, message: 'No Instagram configuration found.' };
        }

        const config = channel.configJson as { pageId?: string; accessToken?: string };
        const { pageId, accessToken } = config;

        if (!pageId || !accessToken) {
            return { success: false, message: 'Incomplete configuration.' };
        }

        // Try Instagram Graph API first (for IGA tokens)
        let response = await fetch(`https://graph.instagram.com/v18.0/me?fields=user_id,username,name`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, message: `Conectado: @${data.username || data.name || 'Instagram'}` };
        }

        // Fallback: try Facebook Graph API (for Page tokens)
        response = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=name,username,instagram_business_account`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, message: `Conectado: ${data.name || data.username || 'Instagram'}` };
        }

        const errorData = await response.json().catch(() => ({}));
        console.error('Meta API error:', (errorData as any)?.error);
        return { success: false, message: `Error de Meta: ${(errorData as any)?.error?.message || 'Verifica tu configuración.'}` };

    } catch (error) {
        console.error('Test connection failed:', error);
        return { success: false, message: 'Internal server error during test.' };
    }
}

export async function disconnectInstagram() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: {
                companyId: session.user.companyId,
                type: ChannelType.INSTAGRAM,
            },
        });

        if (channel) {
            await prisma.channel.update({
                where: { id: channel.id },
                data: {
                    status: ChannelStatus.DISCONNECTED,
                    configJson: {},
                },
            });
        }

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, message: 'Instagram disconnected successfully.' };
    } catch (error) {
        console.error('Disconnect failed:', error);
        return { success: false, message: 'Failed to disconnect.' };
    }
}

// MESSENGER ACTIONS

export async function disconnectMessenger() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: { companyId: session.user.companyId, type: ChannelType.MESSENGER },
        });

        if (channel) {
            await prisma.channel.update({
                where: { id: channel.id },
                data: { status: ChannelStatus.DISCONNECTED, configJson: {} },
            });
        }

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true };
    } catch {
        return { success: false, message: 'Failed to disconnect.' };
    }
}

export async function testMessengerConnection() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: { companyId: session.user.companyId, type: ChannelType.MESSENGER },
        });

        if (!channel?.configJson) {
            return { success: false, message: 'No Messenger configuration found.' };
        }

        const config = channel.configJson as { pageId?: string; accessToken?: string };
        if (!config.pageId || !config.accessToken) {
            return { success: false, message: 'Incomplete configuration.' };
        }

        const res = await fetch(
            `https://graph.facebook.com/v21.0/${config.pageId}?fields=name&access_token=${config.accessToken}`
        );

        if (res.ok) {
            const data = await res.json();
            return { success: true, message: `Conectado: ${data.name || 'Página de Facebook'}` };
        }

        const err = await res.json().catch(() => ({}));
        return { success: false, message: `Error: ${(err as any)?.error?.message || 'Verifica tu configuración.'}` };
    } catch {
        return { success: false, message: 'Error interno al probar.' };
    }
}

// OPENAI API KEY ACTIONS

export async function saveOpenAIKey(prevState: string | undefined, formData: FormData) {
    const session = await auth();

    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    const apiKey = formData.get('openaiApiKey') as string;

    if (!apiKey || !apiKey.startsWith('sk-')) {
        return 'Error: La API Key debe comenzar con "sk-".';
    }

    try {
        // Validate the key by calling models.list()
        const testClient = new OpenAI({ apiKey });
        await testClient.models.list();
    } catch {
        return 'Error: La API Key no es válida. Verifica que sea correcta.';
    }

    try {
        const encryptedKey = encrypt(apiKey);

        await prisma.company.update({
            where: { id: session.user.companyId },
            data: {
                openaiApiKey: encryptedKey,
                openaiApiKeyUpdatedAt: new Date(),
            },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        return 'Success: API Key guardada correctamente.';
    } catch (error) {
        console.error('Failed to save OpenAI key:', error);
        return 'Error: No se pudo guardar la API Key.';
    }
}

export async function removeOpenAIKey() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        await prisma.company.update({
            where: { id: session.user.companyId },
            data: {
                openaiApiKey: null,
                openaiApiKeyUpdatedAt: null,
            },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, message: 'API Key eliminada.' };
    } catch (error) {
        console.error('Failed to remove OpenAI key:', error);
        return { success: false, message: 'Failed to remove key.' };
    }
}

// WEB CHAT ACTIONS

export async function activateWebChat() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No authorized session.' };
    }

    const companyId = session.user.companyId;

    try {
        // Check if already exists
        const existing = await prisma.channel.findFirst({
            where: { companyId, type: ChannelType.WEB_CHAT },
        });

        let apiKey: string;
        let channelId: string;

        if (existing && existing.status === ChannelStatus.CONNECTED) {
            // Already active — reuse existing key
            const config = existing.configJson as { apiKey?: string } | null;
            apiKey = config?.apiKey || '';
            channelId = existing.id;
        } else if (existing) {
            // Exists but disconnected — reactivate with new key
            const { randomBytes } = await import('crypto');
            apiKey = `wc_${randomBytes(24).toString('hex')}`;
            await prisma.channel.update({
                where: { id: existing.id },
                data: {
                    status: ChannelStatus.CONNECTED,
                    configJson: { apiKey },
                },
            });
            channelId = existing.id;
        } else {
            // Create new channel
            const { randomBytes } = await import('crypto');
            apiKey = `wc_${randomBytes(24).toString('hex')}`;
            const newChannel = await prisma.channel.create({
                data: {
                    companyId,
                    type: ChannelType.WEB_CHAT,
                    status: ChannelStatus.CONNECTED,
                    configJson: { apiKey },
                },
            });
            channelId = newChannel.id;
        }

        // Always auto-connect active chatbots and AI agents to this channel
        const [chatbots, aiAgents] = await Promise.all([
            prisma.chatbot.findMany({
                where: { companyId, active: true },
                select: { id: true },
            }),
            prisma.aiAgent.findMany({
                where: { companyId, active: true },
                select: { id: true },
            }),
        ]);

        await Promise.all([
            ...chatbots.map(cb =>
                prisma.chatbot.update({
                    where: { id: cb.id },
                    data: { channels: { connect: { id: channelId } } },
                })
            ),
            ...aiAgents.map(agent =>
                prisma.aiAgent.update({
                    where: { id: agent.id },
                    data: { channels: { connect: { id: channelId } } },
                })
            ),
        ]);

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, apiKey };
    } catch (error) {
        console.error('Failed to activate web chat:', error);
        return { success: false, error: 'Error al activar Web Chat.' };
    }
}

export async function deactivateWebChat() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: { companyId: session.user.companyId, type: ChannelType.WEB_CHAT },
        });

        if (channel) {
            await prisma.channel.update({
                where: { id: channel.id },
                data: { status: ChannelStatus.DISCONNECTED, configJson: {} },
            });
        }

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true };
    } catch (error) {
        console.error('Failed to deactivate web chat:', error);
        return { success: false, error: 'Error al desactivar Web Chat.' };
    }
}

export async function regenerateWebChatKey() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No authorized session.' };
    }

    try {
        const channel = await prisma.channel.findFirst({
            where: { companyId: session.user.companyId, type: ChannelType.WEB_CHAT },
        });

        if (!channel) {
            return { success: false, error: 'Web Chat no está activado.' };
        }

        const { randomBytes } = await import('crypto');
        const apiKey = `wc_${randomBytes(24).toString('hex')}`;

        await prisma.channel.update({
            where: { id: channel.id },
            data: { configJson: { apiKey } },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, apiKey };
    } catch (error) {
        console.error('Failed to regenerate web chat key:', error);
        return { success: false, error: 'Error al regenerar la clave.' };
    }
}

// GOOGLE CALENDAR ACTIONS

export async function initiateGoogleCalendarConnect() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { error: 'No authorized session.' };
    }

    try {
        const state = encrypt(session.user.companyId);
        const url = getGoogleAuthUrl(state);
        return { url };
    } catch (error) {
        console.error('Failed to initiate Google Calendar connect:', error);
        return { error: 'Error al iniciar conexión.' };
    }
}

export async function disconnectGoogleCalendar() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        await prisma.company.update({
            where: { id: session.user.companyId },
            data: {
                googleCalendarRefreshToken: null,
                googleCalendarEmail: null,
                googleCalendarConnectedAt: null,
            },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, message: 'Google Calendar desconectado.' };
    } catch (error) {
        console.error('Failed to disconnect Google Calendar:', error);
        return { success: false, message: 'Error al desconectar.' };
    }
}

// ECOMMERCE INTEGRATION ACTIONS

export async function saveEcommerceIntegration(prevState: string | undefined, formData: FormData) {
    const session = await auth();

    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    const companyId = session.user.companyId;
    const platform = formData.get('platform') as string;
    const storeUrl = formData.get('storeUrl') as string;
    const apiKey = formData.get('apiKey') as string;
    const apiSecret = formData.get('apiSecret') as string;

    if (!platform || !storeUrl || !apiKey) {
        return 'Error: Plataforma, URL de tienda y API Key son requeridos.';
    }

    if (!['shopify', 'woocommerce'].includes(platform)) {
        return 'Error: Plataforma no válida. Usa "shopify" o "woocommerce".';
    }

    if (platform === 'woocommerce' && !apiSecret) {
        return 'Error: El Consumer Secret es requerido para WooCommerce.';
    }

    // Clean store URL
    let cleanUrl = storeUrl.trim().replace(/\/+$/, '');
    if (platform === 'shopify') {
        // Ensure format: mystore.myshopify.com
        cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
    }

    try {
        // Test connection
        const testResult = await testEcommerceConnection(platform, cleanUrl, apiKey, apiSecret);
        if (!testResult.success) {
            return `Error: ${testResult.message}`;
        }

        const encryptedKey = encrypt(apiKey);
        const encryptedSecret = apiSecret ? encrypt(apiSecret) : null;

        await prisma.ecommerceIntegration.create({
            data: {
                companyId,
                name: platform === 'shopify' ? `Shopify - ${cleanUrl}` : `WooCommerce - ${cleanUrl}`,
                platform,
                storeUrl: cleanUrl,
                apiKey: encryptedKey,
                apiSecret: encryptedSecret,
                active: true,
            },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        revalidatePath('/[lang]/company/integrations', 'page');
        return 'Success: Tienda online conectada correctamente.';
    } catch (error) {
        console.error('Failed to save ecommerce integration:', error);
        return 'Error: No se pudo guardar la configuración.';
    }
}

async function testEcommerceConnection(
    platform: string,
    storeUrl: string,
    apiKey: string,
    apiSecret?: string,
): Promise<{ success: boolean; message: string }> {
    try {
        if (platform === 'shopify') {
            const res = await fetch(`https://${storeUrl}/admin/api/2024-01/shop.json`, {
                headers: {
                    'X-Shopify-Access-Token': apiKey,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) {
                return { success: false, message: 'No se pudo conectar a Shopify. Verifica la URL y el Access Token.' };
            }
            return { success: true, message: 'Conexión exitosa.' };
        } else {
            const baseUrl = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
            const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
            const res = await fetch(`${baseUrl}/wp-json/wc/v3/system_status?_fields=environment`, {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) {
                return { success: false, message: 'No se pudo conectar a WooCommerce. Verifica la URL y las credenciales.' };
            }
            return { success: true, message: 'Conexión exitosa.' };
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        return { success: false, message: `Error de conexión: ${msg}` };
    }
}

export async function disconnectEcommerce() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        await prisma.ecommerceIntegration.deleteMany({
            where: { companyId: session.user.companyId },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, message: 'Tienda online desconectada.' };
    } catch (error) {
        console.error('Failed to disconnect ecommerce:', error);
        return { success: false, message: 'Error al desconectar.' };
    }
}

export async function testEcommerceIntegration() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        const integration = await prisma.ecommerceIntegration.findFirst({
            where: { companyId: session.user.companyId },
        });

        if (!integration) {
            return { success: false, message: 'No hay tienda configurada.' };
        }

        const { decrypt } = await import('@/lib/encryption');
        const apiKey = decrypt(integration.apiKey);
        const apiSecret = integration.apiSecret ? decrypt(integration.apiSecret) : undefined;

        return testEcommerceConnection(integration.platform, integration.storeUrl, apiKey, apiSecret);
    } catch (error) {
        console.error('Test ecommerce failed:', error);
        return { success: false, message: 'Error al probar la conexión.' };
    }
}

// AUTOMATION PRIORITY

// ASSIGNMENT STRATEGY

export async function updateAssignmentStrategy(strategy: AssignmentStrategy, specificAgentId?: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    const companyId = session.user.companyId;

    // Validate specificAgentId belongs to this company if SPECIFIC_AGENT
    if (strategy === 'SPECIFIC_AGENT') {
        if (!specificAgentId) {
            return { success: false, message: 'Debes seleccionar un agente.' };
        }
        const agent = await prisma.user.findFirst({
            where: { id: specificAgentId, companyId, active: true },
        });
        if (!agent) {
            return { success: false, message: 'El agente seleccionado no existe o no está activo.' };
        }
    }

    try {
        await prisma.company.update({
            where: { id: companyId },
            data: {
                assignmentStrategy: strategy,
                specificAgentId: strategy === 'SPECIFIC_AGENT' ? specificAgentId : null,
            },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, message: 'Estrategia de asignación actualizada.' };
    } catch (error) {
        console.error('Failed to update assignment strategy:', error);
        return { success: false, message: 'Error al actualizar la estrategia.' };
    }
}

export async function updateChannelPriority(channelId: string, priority: AutomationPriority) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'No authorized session.' };
    }

    try {
        // Verify the channel belongs to this company
        const channel = await prisma.channel.findFirst({
            where: { id: channelId, companyId: session.user.companyId },
        });

        if (!channel) {
            return { success: false, message: 'Channel not found.' };
        }

        await prisma.channel.update({
            where: { id: channelId, companyId: session.user.companyId },
            data: { automationPriority: priority },
        });

        revalidatePath('/[lang]/company/settings', 'page');
        return { success: true, message: 'Prioridad actualizada.' };
    } catch (error) {
        console.error('Failed to update channel priority:', error);
        return { success: false, message: 'Failed to update priority.' };
    }
}
