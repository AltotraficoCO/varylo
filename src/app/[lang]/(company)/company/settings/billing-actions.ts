'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { createPaymentSource as wompiCreatePaymentSource, getAcceptanceToken } from '@/lib/wompi';
import { createSubscription, cancelSubscription as cancelSub } from '@/lib/subscriptions';
import { revalidatePath } from 'next/cache';

async function requireCompanyAdmin() {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) throw new Error('Unauthorized');
    return session;
}

// ============ Payment Sources ============

const addPaymentSourceSchema = z.object({
    token: z.string().min(1),
    email: z.string().email(),
    brand: z.string().optional(),
    lastFour: z.string().optional(),
    expMonth: z.string().optional(),
    expYear: z.string().optional(),
});

export async function addPaymentSourceAction(data: z.infer<typeof addPaymentSourceSchema>) {
    let session;
    try {
        session = await requireCompanyAdmin();
    } catch {
        return { success: false, error: 'No autorizado. Inicia sesión de nuevo.' };
    }
    const companyId = session.user.companyId!;
    const result = addPaymentSourceSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        const acceptanceToken = await getAcceptanceToken();
        const source = await wompiCreatePaymentSource(
            result.data.email,
            result.data.token,
            acceptanceToken,
        );

        // Check if company has any existing payment sources
        const existingCount = await prisma.paymentSource.count({ where: { companyId } });

        let expiresAt: Date | null = null;
        if (result.data.expMonth && result.data.expYear) {
            expiresAt = new Date(
                Number(`20${result.data.expYear}`),
                Number(result.data.expMonth) - 1,
                28,
            );
        }

        await prisma.paymentSource.create({
            data: {
                companyId,
                wompiSourceId: String(source.id),
                wompiCustomerEmail: result.data.email,
                brand: result.data.brand || source.token?.brand,
                lastFour: result.data.lastFour || source.token?.last_four,
                expiresAt,
                isDefault: existingCount === 0, // first card is default
            },
        });

        revalidatePath('/company/settings');
        return { success: true };
    } catch (error: any) {
        console.error('Error adding payment source:', error);
        return { success: false, error: error.message || 'Error al agregar tarjeta' };
    }
}

export async function getPaymentSources() {
    const session = await requireCompanyAdmin();
    const companyId = session.user.companyId!;
    try {
        return await prisma.paymentSource.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
        });
    } catch {
        return [];
    }
}

export async function setDefaultPaymentSource(sourceId: string) {
    const session = await requireCompanyAdmin();
    const companyId = session.user.companyId!;

    await prisma.$transaction([
        prisma.paymentSource.updateMany({
            where: { companyId },
            data: { isDefault: false },
        }),
        prisma.paymentSource.update({
            where: { id: sourceId, companyId },
            data: { isDefault: true },
        }),
    ]);

    revalidatePath('/company/settings');
    return { success: true };
}

export async function removePaymentSource(sourceId: string) {
    const session = await requireCompanyAdmin();
    const companyId = session.user.companyId!;

    // Check if source is used by active subscription
    const activeSub = await prisma.subscription.findFirst({
        where: { paymentSourceId: sourceId, status: { in: ['ACTIVE', 'PAST_DUE', 'TRIAL'] } },
    });
    if (activeSub) {
        return { success: false, error: 'No puedes eliminar una tarjeta con suscripción activa' };
    }

    await prisma.paymentSource.delete({ where: { id: sourceId, companyId } });
    revalidatePath('/company/settings');
    return { success: true };
}

// ============ Subscriptions ============

export async function subscribeToPlan(planPricingId: string) {
    let session;
    try {
        session = await requireCompanyAdmin();
    } catch {
        return { success: false, error: 'No autorizado. Inicia sesión de nuevo.' };
    }
    const companyId = session.user.companyId!;

    // Get default payment source
    const defaultSource = await prisma.paymentSource.findFirst({
        where: { companyId, isDefault: true },
    });
    if (!defaultSource) {
        return { success: false, error: 'Agrega una tarjeta antes de suscribirte' };
    }

    // Check for existing active subscription
    const existingSub = await prisma.subscription.findFirst({
        where: { companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
    });
    if (existingSub) {
        return { success: false, error: 'Ya tienes una suscripción activa' };
    }

    try {
        await createSubscription(companyId, planPricingId, defaultSource.id);
        revalidatePath('/company/settings');
        return { success: true };
    } catch (error: any) {
        console.error('Error subscribing:', error);
        return { success: false, error: error.message || 'Error al suscribirse' };
    }
}

export async function cancelMySubscription() {
    const session = await requireCompanyAdmin();
    const companyId = session.user.companyId!;

    const activeSub = await prisma.subscription.findFirst({
        where: { companyId, status: { in: ['ACTIVE', 'PAST_DUE', 'TRIAL'] } },
    });
    if (!activeSub) {
        return { success: false, error: 'No tienes suscripción activa' };
    }

    await cancelSub(activeSub.id);
    revalidatePath('/company/settings');
    return { success: true };
}

export async function getActiveSubscription() {
    const session = await requireCompanyAdmin();
    const companyId = session.user.companyId!;
    try {
        return await prisma.subscription.findFirst({
            where: { companyId, status: { in: ['ACTIVE', 'PAST_DUE', 'TRIAL'] } },
            include: {
                planPricing: {
                    include: { landingPlan: { select: { name: true, slug: true } } },
                },
                paymentSource: { select: { brand: true, lastFour: true } },
            },
        });
    } catch {
        return null;
    }
}

export async function getBillingHistory() {
    const session = await requireCompanyAdmin();
    const companyId = session.user.companyId!;
    try {
        return await prisma.billingAttempt.findMany({
            where: { subscription: { companyId } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                subscription: {
                    select: {
                        planPricing: {
                            select: { landingPlan: { select: { name: true } } },
                        },
                    },
                },
            },
        });
    } catch {
        return [];
    }
}

export async function getAvailablePlans() {
    try {
        return await prisma.planPricing.findMany({
            where: { active: true },
            include: { landingPlan: true },
            orderBy: { landingPlan: { sortOrder: 'asc' } },
        });
    } catch {
        return [];
    }
}
