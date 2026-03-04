'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Plan, CompanyStatus, CreditTransactionType, Role, SubscriptionStatus } from '@prisma/client';
import { addCredits } from '@/lib/credits';
import { auth } from '@/auth';

/** Verify caller is authenticated SUPER_ADMIN */
async function requireSuperAdmin() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Unauthorized: No session');
    }
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== Role.SUPER_ADMIN) {
        throw new Error('Forbidden: Super admin access required');
    }
    return session;
}

const createCompanySchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(200),
    plan: z.nativeEnum(Plan),
    status: z.nativeEnum(CompanyStatus),
});

export async function createCompany(data: z.infer<typeof createCompanySchema>) {
    await requireSuperAdmin();
    const result = createCompanySchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: 'Datos inválidos' };
    }

    try {
        const company = await prisma.company.create({
            data: {
                name: result.data.name,
                plan: result.data.plan,
                status: result.data.status,
            },
        });

        revalidatePath('/super-admin/companies');
        return { success: true, data: company };
    } catch (error) {
        console.error('Error creating company:', error);
        return { success: false, error: 'Error al crear la empresa' };
    }
}

const updateCompanySchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'El nombre es obligatorio'),
    plan: z.nativeEnum(Plan),
    status: z.nativeEnum(CompanyStatus),
});

export async function updateCompany(data: z.infer<typeof updateCompanySchema>) {
    await requireSuperAdmin();
    const result = updateCompanySchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: 'Datos inválidos' };
    }

    try {
        const company = await prisma.company.update({
            where: { id: result.data.id },
            data: {
                name: result.data.name,
                plan: result.data.plan,
                status: result.data.status,
            },
        });

        revalidatePath('/super-admin/companies');
        return { success: true, data: company };
    } catch (error) {
        console.error('Error updating company:', error);
        return { success: false, error: 'Error al actualizar la empresa' };
    }
}

const adjustCreditsSchema = z.object({
    companyId: z.string(),
    amount: z.number().int().refine(val => val !== 0, 'El monto no puede ser 0'),
    description: z.string().min(1, 'La descripción es obligatoria'),
});

export async function adjustCompanyCredits(data: z.infer<typeof adjustCreditsSchema>) {
    await requireSuperAdmin();
    const result = adjustCreditsSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: 'Datos inválidos' };
    }

    try {
        const res = await addCredits({
            companyId: result.data.companyId,
            amount: result.data.amount,
            type: CreditTransactionType.MANUAL_ADJUST,
            description: `Ajuste manual: ${result.data.description}`,
        });

        revalidatePath('/super-admin/companies');
        return { success: true, newBalance: res.newBalance };
    } catch (error) {
        console.error('Error adjusting credits:', error);
        return { success: false, error: 'Error al ajustar créditos' };
    }
}

// ============ Subscription Management ============

const toggleSubSchema = z.object({
    subscriptionId: z.string(),
    newStatus: z.nativeEnum(SubscriptionStatus),
});

export async function toggleSubscriptionStatus(data: z.infer<typeof toggleSubSchema>) {
    await requireSuperAdmin();
    const result = toggleSubSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        const sub = await prisma.subscription.update({
            where: { id: result.data.subscriptionId },
            data: {
                status: result.data.newStatus,
                ...(result.data.newStatus === 'CANCELLED' ? { cancelledAt: new Date() } : { cancelledAt: null }),
            },
        });

        revalidatePath('/super-admin/companies');
        return { success: true, data: sub };
    } catch (error) {
        console.error('Error toggling subscription:', error);
        return { success: false, error: 'Error al cambiar el estado de la suscripción' };
    }
}

const createManualSubSchema = z.object({
    companyId: z.string(),
    planPricingId: z.string().optional(),
    planSlug: z.nativeEnum(Plan).optional(),
    periodDays: z.number().int().min(1),
    status: z.nativeEnum(SubscriptionStatus).default('ACTIVE'),
});

export async function createManualSubscription(data: z.infer<typeof createManualSubSchema>) {
    await requireSuperAdmin();
    const result = createManualSubSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + result.data.periodDays);

        // Resolve planPricingId: use provided or find/create from planSlug
        let planPricingId = result.data.planPricingId;

        if (!planPricingId && result.data.planSlug) {
            // Find or create a PlanPricing for this plan
            const landingPlan = await prisma.landingPlan.findUnique({
                where: { slug: result.data.planSlug },
            });

            if (landingPlan) {
                let pricing = await prisma.planPricing.findUnique({
                    where: { landingPlanId: landingPlan.id },
                });
                if (!pricing) {
                    pricing = await prisma.planPricing.create({
                        data: {
                            landingPlanId: landingPlan.id,
                            priceInCents: 0, // cortesía
                            billingPeriodDays: result.data.periodDays,
                            trialDays: 0,
                            active: true,
                        },
                    });
                }
                planPricingId = pricing.id;
            }
        }

        if (!planPricingId) {
            return { success: false, error: 'No se pudo determinar el plan de pricing' };
        }

        // Create placeholder payment source if needed
        let paymentSource = await prisma.paymentSource.findFirst({
            where: { companyId: result.data.companyId },
        });

        if (!paymentSource) {
            paymentSource = await prisma.paymentSource.create({
                data: {
                    companyId: result.data.companyId,
                    wompiSourceId: `manual_${result.data.companyId}_${Date.now()}`,
                    wompiCustomerEmail: 'manual@admin.local',
                    brand: 'CORTESIA',
                    lastFour: '0000',
                },
            });
        }

        // Cancel any existing subscriptions for this company
        await prisma.subscription.updateMany({
            where: { companyId: result.data.companyId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
            data: { status: 'CANCELLED', cancelledAt: now },
        });

        const sub = await prisma.subscription.create({
            data: {
                companyId: result.data.companyId,
                planPricingId,
                paymentSourceId: paymentSource.id,
                status: result.data.status,
                currentPeriodStart: now,
                currentPeriodEnd: end,
            },
        });

        // Sync company.plan if planSlug provided
        if (result.data.planSlug) {
            await prisma.company.update({
                where: { id: result.data.companyId },
                data: { plan: result.data.planSlug },
            });
        }

        revalidatePath('/super-admin/companies');
        return { success: true, data: sub };
    } catch (error) {
        console.error('Error creating manual subscription:', error);
        return { success: false, error: 'Error al crear la suscripción manual' };
    }
}

export async function getAvailablePlanPricings() {
    try {
        return await prisma.planPricing.findMany({
            where: { active: true },
            include: { landingPlan: { select: { name: true, slug: true, price: true } } },
            orderBy: { landingPlan: { sortOrder: 'asc' } },
        });
    } catch {
        return [];
    }
}
