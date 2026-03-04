'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { auth } from '@/auth';

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

/** Seed default plans if none exist */
export async function seedLandingPlans() {
    await requireSuperAdmin();
    const count = await prisma.landingPlan.count();
    if (count > 0) return { success: false, error: 'Los planes ya existen' };

    try {
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
        return { success: true };
    } catch (error) {
        console.error('Error seeding plans:', error);
        return { success: false, error: 'Error al crear los planes' };
    }
}
