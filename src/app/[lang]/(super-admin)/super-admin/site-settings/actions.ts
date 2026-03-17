'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import type { FooterSection } from '@/lib/site-config';

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

export async function ensureSiteConfigTable() {
    await requireSuperAdmin();
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "SiteConfig" (
                "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
                "faviconUrl" TEXT,
                "footerSections" JSONB,
                "copyrightText" TEXT,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
            )
        `);
        return { success: true };
    } catch (error) {
        console.error('Error creating SiteConfig table:', error);
        return { success: false, error: 'Error al crear la tabla SiteConfig' };
    }
}

export async function getSiteConfigAction() {
    await requireSuperAdmin();
    try {
        const config = await prisma.siteConfig.findFirst();
        return {
            success: true,
            data: config
                ? {
                    footerSections: config.footerSections as FooterSection[] | null,
                    copyrightText: config.copyrightText,
                }
                : null,
        };
    } catch {
        return { success: true, data: null };
    }
}

export async function updateFooterAction(
    footerSections: FooterSection[],
    copyrightText: string
) {
    await requireSuperAdmin();
    try {
        const existing = await prisma.siteConfig.findFirst();
        if (existing) {
            await prisma.siteConfig.update({
                where: { id: existing.id },
                data: { footerSections: footerSections as any, copyrightText },
            });
        } else {
            await prisma.siteConfig.create({
                data: { footerSections: footerSections as any, copyrightText },
            });
        }
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Error updating footer:', error);
        return { success: false, error: 'Error al actualizar el footer' };
    }
}

export async function getTrustedLogos() {
    return prisma.trustedLogo.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function createTrustedLogo(data: { name: string; imageUrl: string; sortOrder: number }) {
    await requireSuperAdmin();
    try {
        await prisma.trustedLogo.create({ data });
        revalidatePath('/super-admin/site-settings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error creating trusted logo:', error);
        return { success: false, error: 'Error al crear el logo' };
    }
}

export async function uploadTrustedLogo(formData: FormData) {
    await requireSuperAdmin();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const sortOrder = Number(formData.get('sortOrder') || 0);

    if (!file || !name) {
        return { success: false, error: 'Nombre y archivo son obligatorios.' };
    }

    try {
        const { uploadToStorage } = await import('@/lib/storage');
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() || 'png';
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const path = `logos/${safeName}_${Date.now()}.${ext}`;
        const url = await uploadToStorage(buffer, path, file.type);

        if (!url) {
            return { success: false, error: 'Error al subir la imagen.' };
        }

        await prisma.trustedLogo.create({
            data: { name, imageUrl: url, sortOrder },
        });

        revalidatePath('/super-admin/site-settings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error uploading trusted logo:', error);
        return { success: false, error: 'Error al subir el logo.' };
    }
}

export async function deleteTrustedLogo(id: string) {
    await requireSuperAdmin();
    try {
        await prisma.trustedLogo.delete({ where: { id } });
        revalidatePath('/super-admin/site-settings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error deleting trusted logo:', error);
        return { success: false, error: 'Error al eliminar el logo' };
    }
}
