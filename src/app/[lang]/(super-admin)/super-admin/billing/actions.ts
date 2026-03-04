'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { encrypt, decrypt, maskSecret, getWompiBaseUrl } from '@/lib/wompi-config';

async function requireSuperAdmin() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== Role.SUPER_ADMIN) throw new Error('Forbidden');
    return session;
}

export async function getLandingPlans() {
    try {
        return await prisma.landingPlan.findMany({
            where: { active: true },
            orderBy: { sortOrder: 'asc' },
        });
    } catch {
        return [];
    }
}

const updatePlanSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().min(1),
    price: z.number().int().min(0),
    features: z.array(z.string()),
    isFeatured: z.boolean(),
    ctaText: z.string().min(1),
    ctaLink: z.string().nullable(),
    sortOrder: z.number().int(),
    showTrialOnRegister: z.boolean().optional(),
});

export async function updateLandingPlan(data: z.infer<typeof updatePlanSchema>) {
    await requireSuperAdmin();
    const result = updatePlanSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        await prisma.landingPlan.update({
            where: { id: result.data.id },
            data: {
                name: result.data.name,
                description: result.data.description,
                price: result.data.price,
                features: result.data.features,
                isFeatured: result.data.isFeatured,
                ctaText: result.data.ctaText,
                ctaLink: result.data.ctaLink,
                sortOrder: result.data.sortOrder,
                ...(result.data.showTrialOnRegister !== undefined && { showTrialOnRegister: result.data.showTrialOnRegister }),
            },
        });
        revalidatePath('/super-admin/billing');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error updating plan:', error);
        return { success: false, error: 'Error al actualizar el plan' };
    }
}

/** Ensure all subscription-related tables exist */
export async function ensureSubscriptionTables() {
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
            CREATE TABLE IF NOT EXISTS "WompiConfig" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "publicKey" TEXT NOT NULL,
                "privateKey" TEXT NOT NULL,
                "eventsSecret" TEXT NOT NULL,
                "integritySecret" TEXT NOT NULL,
                "isSandbox" BOOLEAN NOT NULL DEFAULT true,
                "webhookUrl" TEXT,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "WompiConfig_pkey" PRIMARY KEY ("id")
            )
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "PlanPricing" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "landingPlanId" TEXT NOT NULL,
                "priceInCents" INTEGER NOT NULL,
                "billingPeriodDays" INTEGER NOT NULL DEFAULT 30,
                "trialDays" INTEGER NOT NULL DEFAULT 0,
                "active" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PlanPricing_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "PlanPricing_landingPlanId_fkey" FOREIGN KEY ("landingPlanId") REFERENCES "LandingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "PlanPricing_landingPlanId_key" ON "PlanPricing"("landingPlanId")
        `);
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "PlanPricing" ADD COLUMN IF NOT EXISTS "useAutoTrm" BOOLEAN NOT NULL DEFAULT false
        `);

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
                CONSTRAINT "PaymentSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSource_wompiSourceId_key" ON "PaymentSource"("wompiSourceId")
        `);

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
                CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "Subscription_planPricingId_fkey" FOREIGN KEY ("planPricingId") REFERENCES "PlanPricing"("id") ON UPDATE CASCADE,
                CONSTRAINT "Subscription_paymentSourceId_fkey" FOREIGN KEY ("paymentSourceId") REFERENCES "PaymentSource"("id") ON UPDATE CASCADE
            )
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "BillingAttempt" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "subscriptionId" TEXT NOT NULL,
                "amountInCents" INTEGER NOT NULL,
                "currency" TEXT NOT NULL DEFAULT 'COP',
                "wompiTransactionId" TEXT,
                "status" "BillingAttemptStatus" NOT NULL DEFAULT 'PENDING',
                "errorReason" TEXT,
                "attemptNumber" INTEGER NOT NULL DEFAULT 1,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "BillingAttempt_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "BillingAttempt_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

        return { success: true };
    } catch (error) {
        console.error('Error creating subscription tables:', error);
        return { success: false, error: 'Error al crear las tablas de suscripción' };
    }
}

/** Ensure the LandingPlan table exists, then seed default plans */
export async function seedLandingPlans() {
    await requireSuperAdmin();

    try {
        // Create the table if it doesn't exist
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
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "LandingPlan_pkey" PRIMARY KEY ("id")
            )
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "LandingPlan_slug_key" ON "LandingPlan"("slug")
        `);

        const count = await prisma.landingPlan.count();
        if (count > 0) return { success: false, error: 'Los planes ya existen' };

        await prisma.landingPlan.createMany({
            data: [
                {
                    slug: 'STARTER',
                    name: 'Starter',
                    description: 'Para emprendedores que quieren profesionalizar su atención',
                    price: 29,
                    features: ['1 Canal (WhatsApp)', 'Hasta 3 Agentes', 'Métricas básicas', 'Chatbots ilimitados', 'Soporte por email'],
                    isFeatured: false,
                    ctaText: 'Empezar ahora',
                    sortOrder: 0,
                },
                {
                    slug: 'PRO',
                    name: 'Pro',
                    description: 'Para equipos que necesitan IA y más control',
                    price: 79,
                    features: ['2 Canales (WhatsApp + Instagram)', 'Hasta 10 Agentes', 'Agentes IA ilimitados', 'Métricas avanzadas + SLA', 'ValerIA: análisis de calidad', 'Soporte prioritario'],
                    isFeatured: true,
                    ctaText: 'Empezar ahora',
                    sortOrder: 1,
                },
                {
                    slug: 'SCALE',
                    name: 'Scale',
                    description: 'Para operaciones grandes que necesitan todo',
                    price: 199,
                    features: ['Todos los canales', 'Agentes ilimitados', 'IA avanzada + personalización', 'API y webhooks custom', 'Account manager dedicado', 'SLA garantizado'],
                    isFeatured: false,
                    ctaText: 'Contactar ventas',
                    ctaLink: '#contact',
                    sortOrder: 2,
                },
            ],
        });
        revalidatePath('/super-admin/billing');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error seeding plans:', error);
        return { success: false, error: 'Error al crear los planes. Revisa los logs.' };
    }
}

// ============ Wompi Config Actions ============

export async function getWompiConfigAction() {
    await requireSuperAdmin();
    try {
        const config = await prisma.wompiConfig.findFirst();
        if (!config) return null;
        return {
            id: config.id,
            publicKey: config.publicKey,
            privateKey: maskSecret(decrypt(config.privateKey)),
            eventsSecret: maskSecret(decrypt(config.eventsSecret)),
            integritySecret: maskSecret(decrypt(config.integritySecret)),
            isSandbox: config.isSandbox,
            webhookUrl: config.webhookUrl,
        };
    } catch {
        return null;
    }
}

const wompiConfigSchema = z.object({
    publicKey: z.string().min(1, 'Public key requerida'),
    privateKey: z.string().min(1, 'Private key requerida'),
    eventsSecret: z.string().min(1, 'Events secret requerido'),
    integritySecret: z.string().min(1, 'Integrity secret requerido'),
    isSandbox: z.boolean(),
    webhookUrl: z.string().nullable(),
});

export async function updateWompiConfigAction(data: z.infer<typeof wompiConfigSchema>) {
    await requireSuperAdmin();
    const result = wompiConfigSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        const existing = await prisma.wompiConfig.findFirst();
        const encryptedData = {
            publicKey: result.data.publicKey,
            privateKey: encrypt(result.data.privateKey),
            eventsSecret: encrypt(result.data.eventsSecret),
            integritySecret: encrypt(result.data.integritySecret),
            isSandbox: result.data.isSandbox,
            webhookUrl: result.data.webhookUrl,
        };

        if (existing) {
            await prisma.wompiConfig.update({
                where: { id: existing.id },
                data: encryptedData,
            });
        } else {
            await prisma.wompiConfig.create({ data: encryptedData });
        }

        revalidatePath('/super-admin/billing');
        return { success: true };
    } catch (error) {
        console.error('Error saving Wompi config:', error);
        return { success: false, error: 'Error al guardar la configuración' };
    }
}

export async function testWompiConnectionAction() {
    await requireSuperAdmin();
    try {
        const config = await prisma.wompiConfig.findFirst();
        let publicKey: string;
        let isSandbox: boolean;

        if (config) {
            publicKey = config.publicKey;
            isSandbox = config.isSandbox;
        } else {
            publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
            isSandbox = publicKey.startsWith('pub_test_');
        }

        if (!publicKey) return { success: false, error: 'No hay Public Key configurada' };

        const baseUrl = getWompiBaseUrl(isSandbox);
        const res = await fetch(`${baseUrl}/v1/merchants/${publicKey}`);
        const json = await res.json();

        if (json.data?.id) {
            return {
                success: true,
                merchant: json.data.name || json.data.legal_name || json.data.id,
            };
        }
        return { success: false, error: 'No se pudo verificar el comercio' };
    } catch (error) {
        console.error('Error testing Wompi connection:', error);
        return { success: false, error: 'Error al conectar con Wompi' };
    }
}

// ============ Plan Pricing Actions ============

export async function getLandingPlansWithPricing() {
    try {
        return await prisma.landingPlan.findMany({
            where: { active: true },
            orderBy: { sortOrder: 'asc' },
            include: { planPricing: true },
        });
    } catch {
        // PlanPricing table may not exist — try without it
        try {
            const plans = await prisma.landingPlan.findMany({
                where: { active: true },
                orderBy: { sortOrder: 'asc' },
            });
            return plans.map(p => ({ ...p, planPricing: null }));
        } catch {
            return [];
        }
    }
}

const planPricingSchema = z.object({
    landingPlanId: z.string(),
    priceInCents: z.number().int().min(0),
    billingPeriodDays: z.number().int().min(1).default(30),
    trialDays: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
    useAutoTrm: z.boolean().default(false),
});

export async function upsertPlanPricing(data: z.infer<typeof planPricingSchema>) {
    await requireSuperAdmin();
    const result = planPricingSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        const existing = await prisma.planPricing.findUnique({
            where: { landingPlanId: result.data.landingPlanId },
        });

        if (existing) {
            await prisma.planPricing.update({
                where: { id: existing.id },
                data: {
                    priceInCents: result.data.priceInCents,
                    billingPeriodDays: result.data.billingPeriodDays,
                    trialDays: result.data.trialDays,
                    active: result.data.active,
                    useAutoTrm: result.data.useAutoTrm,
                },
            });
        } else {
            await prisma.planPricing.create({ data: result.data });
        }

        revalidatePath('/super-admin/billing');
        return { success: true };
    } catch (error) {
        console.error('Error upserting plan pricing:', error);
        return { success: false, error: 'Error al guardar el precio del plan' };
    }
}
