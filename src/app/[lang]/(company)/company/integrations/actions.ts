'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { validateExternalWebhookUrl } from '@/lib/url-validator';

export async function disconnectEcommerceById(storeId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No autorizado' };
    }

    const store = await prisma.ecommerceIntegration.findFirst({
        where: { id: storeId, companyId: session.user.companyId },
    });

    if (!store) {
        return { success: false, error: 'Tienda no encontrada' };
    }

    await prisma.ecommerceIntegration.delete({ where: { id: storeId } });

    revalidatePath('/company/integrations');
    return { success: true };
}

// ===== n8n / Webhook Integrations =====

export async function createWebhookIntegration(data: {
    platform: string;
    name: string;
    webhookUrl: string;
    secret?: string;
    events: string[];
}) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado' };

    if (!data.webhookUrl?.trim()) return { success: false, error: 'URL del webhook es obligatoria' };
    if (data.events.length === 0) return { success: false, error: 'Selecciona al menos un evento' };

    const validated = await validateExternalWebhookUrl(data.webhookUrl);
    if (!validated.ok) return { success: false, error: validated.error };

    try {
        await prisma.webhookIntegration.create({
            data: {
                companyId: session.user.companyId,
                platform: data.platform,
                name: data.name.trim() || `${data.platform} webhook`,
                webhookUrl: validated.url.toString(),
                secret: data.secret?.trim() || null,
                events: data.events,
                active: true,
            },
        });

        revalidatePath('/company/integrations');
        revalidatePath('/company/settings');
        return { success: true };
    } catch (error) {
        console.error('[Integrations] Failed to create webhook:', error);
        return { success: false, error: 'Error al crear la integración' };
    }
}

export async function deleteWebhookIntegration(integrationId: string) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado' };

    const integration = await prisma.webhookIntegration.findFirst({
        where: { id: integrationId, companyId: session.user.companyId },
    });
    if (!integration) return { success: false, error: 'No encontrado' };

    await prisma.webhookIntegration.delete({ where: { id: integrationId } });

    revalidatePath('/company/integrations');
    revalidatePath('/company/settings');
    return { success: true };
}

export async function toggleWebhookIntegration(integrationId: string, active: boolean) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado' };

    const result = await prisma.webhookIntegration.updateMany({
        where: { id: integrationId, companyId: session.user.companyId },
        data: { active },
    });
    if (result.count === 0) return { success: false, error: 'No encontrado' };

    revalidatePath('/company/integrations');
    return { success: true };
}

export async function testWebhookIntegration(webhookUrl: string) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, status: 0, message: 'No autorizado' };

    const validated = await validateExternalWebhookUrl(webhookUrl);
    if (!validated.ok) return { success: false, status: 0, message: validated.error };

    try {
        const body = JSON.stringify({
            event: 'test',
            timestamp: new Date().toISOString(),
            data: { message: 'Prueba de conexion desde Varylo' },
        });

        const res = await fetch(validated.url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Varylo-Event': 'test' },
            body,
            signal: AbortSignal.timeout(10_000),
        });

        return { success: res.ok, status: res.status, message: res.ok ? 'Conexion exitosa' : `Error: HTTP ${res.status}` };
    } catch (error: any) {
        return { success: false, status: 0, message: error.message || 'No se pudo conectar' };
    }
}
