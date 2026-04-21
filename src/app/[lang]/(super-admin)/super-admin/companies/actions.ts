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
    extensionDays: z.number().int().min(1).optional(),
});

export async function toggleSubscriptionStatus(data: z.infer<typeof toggleSubSchema>) {
    await requireSuperAdmin();
    const result = toggleSubSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        const updateData: any = {
            status: result.data.newStatus,
        };

        if (result.data.newStatus === 'CANCELLED') {
            updateData.cancelledAt = new Date();
        } else {
            updateData.cancelledAt = null;
            // When reactivating, extend the period if days provided or if already expired
            if (result.data.newStatus === 'ACTIVE') {
                const existing = await prisma.subscription.findUnique({
                    where: { id: result.data.subscriptionId },
                    select: { currentPeriodEnd: true, planPricing: { select: { billingPeriodDays: true } } },
                });
                const isExpired = existing && existing.currentPeriodEnd < new Date();
                if (isExpired || result.data.extensionDays) {
                    const days = result.data.extensionDays || existing?.planPricing?.billingPeriodDays || 30;
                    const now = new Date();
                    updateData.currentPeriodStart = now;
                    updateData.currentPeriodEnd = new Date(now.getTime() + days * 86400000);
                }
            }
        }

        const sub = await prisma.subscription.update({
            where: { id: result.data.subscriptionId },
            data: updateData,
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

const PLAN_DEFAULTS: Record<string, { name: string; description: string; price: number; features: string[] }> = {
    STARTER: { name: 'Starter', description: 'Plan Starter', price: 29, features: ['1 Canal (WhatsApp)', 'Hasta 3 Agentes'] },
    PRO: { name: 'Pro', description: 'Plan Pro', price: 79, features: ['2 Canales', 'Hasta 10 Agentes', 'Agentes IA'] },
    SCALE: { name: 'Scale', description: 'Plan Scale', price: 199, features: ['Todos los canales', 'Agentes ilimitados'] },
};

export async function createManualSubscription(data: z.infer<typeof createManualSubSchema>) {
    await requireSuperAdmin();
    const result = createManualSubSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos: ' + JSON.stringify(result.error.flatten()) };

    try {
        // 1. Ensure required tables exist
        await ensureTablesExist();

        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + result.data.periodDays);

        // 2. Resolve planPricingId
        let planPricingId = result.data.planPricingId;
        const slug = result.data.planSlug || 'STARTER';

        if (!planPricingId) {
            // Find or create LandingPlan
            let landingPlan = await prisma.landingPlan.findUnique({ where: { slug } });

            if (!landingPlan) {
                const defaults = PLAN_DEFAULTS[slug] || PLAN_DEFAULTS.STARTER;
                landingPlan = await prisma.landingPlan.create({
                    data: {
                        slug,
                        name: defaults.name,
                        description: defaults.description,
                        price: defaults.price,
                        features: defaults.features,
                        sortOrder: slug === 'STARTER' ? 0 : slug === 'PRO' ? 1 : 2,
                    },
                });
            }

            // Find or create PlanPricing
            let pricing = await prisma.planPricing.findUnique({ where: { landingPlanId: landingPlan.id } });

            if (!pricing) {
                pricing = await prisma.planPricing.create({
                    data: {
                        landingPlanId: landingPlan.id,
                        priceInCents: 0,
                        billingPeriodDays: result.data.periodDays,
                        trialDays: 0,
                        active: true,
                    },
                });
            }

            planPricingId = pricing.id;
        }

        // 3. Create placeholder payment source if needed
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

        // 4. Cancel any existing active subscriptions
        await prisma.subscription.updateMany({
            where: { companyId: result.data.companyId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
            data: { status: 'CANCELLED', cancelledAt: now },
        });

        // 5. Create subscription
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

        // 6. Sync company.plan
        await prisma.company.update({
            where: { id: result.data.companyId },
            data: { plan: slug as Plan },
        });

        revalidatePath('/super-admin/companies');
        return { success: true, data: sub };
    } catch (error: any) {
        console.error('Error creating manual subscription:', error);
        return { success: false, error: 'Error al crear la suscripción. Revisa los datos e intenta de nuevo.' };
    }
}

/** Ensure Subscription-related tables exist via raw SQL */
export async function ensureTablesExist() {
    await requireSuperAdmin();
    try {
        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
                    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingAttemptStatus') THEN
                    CREATE TYPE "BillingAttemptStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED');
                END IF;
            END $$;
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "LandingPlan" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "slug" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "price" INTEGER NOT NULL,
                "currency" TEXT NOT NULL DEFAULT 'USD',
                "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
                "isFeatured" BOOLEAN NOT NULL DEFAULT false,
                "ctaText" TEXT NOT NULL DEFAULT 'Empezar ahora',
                "ctaLink" TEXT,
                "sortOrder" INTEGER NOT NULL DEFAULT 0,
                "active" BOOLEAN NOT NULL DEFAULT true,
                "showTrialOnRegister" BOOLEAN NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "LandingPlan_pkey" PRIMARY KEY ("id")
            )
        `);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "LandingPlan_slug_key" ON "LandingPlan"("slug")`);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "PlanPricing" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "landingPlanId" TEXT NOT NULL,
                "priceInCents" INTEGER NOT NULL,
                "billingPeriodDays" INTEGER NOT NULL DEFAULT 30,
                "trialDays" INTEGER NOT NULL DEFAULT 0,
                "useAutoTrm" BOOLEAN NOT NULL DEFAULT false,
                "active" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PlanPricing_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "PlanPricing_landingPlanId_fkey" FOREIGN KEY ("landingPlanId") REFERENCES "LandingPlan"("id") ON DELETE CASCADE
            )
        `);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PlanPricing_landingPlanId_key" ON "PlanPricing"("landingPlanId")`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "PlanPricing" ADD COLUMN IF NOT EXISTS "useAutoTrm" BOOLEAN NOT NULL DEFAULT false`);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "PaymentSource" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "companyId" TEXT NOT NULL,
                "wompiSourceId" TEXT NOT NULL,
                "wompiCustomerEmail" TEXT NOT NULL,
                "brand" TEXT,
                "lastFour" TEXT,
                "expiresAt" TIMESTAMP(3),
                "isDefault" BOOLEAN NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PaymentSource_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "PaymentSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
            )
        `);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSource_wompiSourceId_key" ON "PaymentSource"("wompiSourceId")`);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Subscription" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "companyId" TEXT NOT NULL,
                "planPricingId" TEXT NOT NULL,
                "paymentSourceId" TEXT NOT NULL,
                "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
                "currentPeriodStart" TIMESTAMP(3) NOT NULL,
                "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
                "cancelledAt" TIMESTAMP(3),
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
                CONSTRAINT "Subscription_planPricingId_fkey" FOREIGN KEY ("planPricingId") REFERENCES "PlanPricing"("id"),
                CONSTRAINT "Subscription_paymentSourceId_fkey" FOREIGN KEY ("paymentSourceId") REFERENCES "PaymentSource"("id")
            )
        `);
    } catch (e) {
        console.error('ensureTablesExist error (non-fatal):', e);
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
