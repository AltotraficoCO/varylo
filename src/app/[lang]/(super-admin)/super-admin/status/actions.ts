'use server';

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

function parseDate(value: FormDataEntryValue | null): Date | null {
    if (!value || typeof value !== 'string') return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export async function createStatusIncident(formData: FormData) {
    const session = await requireSuperAdmin();

    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim() || null;
    const type = String(formData.get('type') || 'INCIDENT');
    const severity = String(formData.get('severity') || 'MINOR');
    const components = formData.getAll('components').map(v => String(v));
    const startsAt = parseDate(formData.get('startsAt')) || new Date();
    const endsAt = parseDate(formData.get('endsAt'));
    const showBanner = formData.get('showBanner') === 'on';

    if (!title) throw new Error('El título es obligatorio');

    await prisma.statusIncident.create({
        data: {
            title,
            description,
            type,
            severity,
            components,
            startsAt,
            endsAt,
            showBanner,
            createdById: session.user.id!,
        },
    });

    revalidatePath('/super-admin/status', 'page');
    revalidatePath('/status');
}

export async function updateStatusIncident(id: string, formData: FormData) {
    await requireSuperAdmin();

    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim() || null;
    const type = String(formData.get('type') || 'INCIDENT');
    const severity = String(formData.get('severity') || 'MINOR');
    const components = formData.getAll('components').map(v => String(v));
    const startsAt = parseDate(formData.get('startsAt')) || new Date();
    const endsAt = parseDate(formData.get('endsAt'));
    const showBanner = formData.get('showBanner') === 'on';

    if (!title) throw new Error('El título es obligatorio');

    await prisma.statusIncident.update({
        where: { id },
        data: { title, description, type, severity, components, startsAt, endsAt, showBanner },
    });

    revalidatePath('/super-admin/status', 'page');
    revalidatePath('/status');
}

export async function resolveStatusIncident(id: string) {
    await requireSuperAdmin();
    await prisma.statusIncident.update({
        where: { id },
        data: { resolvedAt: new Date() },
    });
    revalidatePath('/super-admin/status', 'page');
    revalidatePath('/status');
}

export async function reopenStatusIncident(id: string) {
    await requireSuperAdmin();
    await prisma.statusIncident.update({
        where: { id },
        data: { resolvedAt: null },
    });
    revalidatePath('/super-admin/status', 'page');
    revalidatePath('/status');
}

export async function deleteStatusIncident(id: string) {
    await requireSuperAdmin();
    await prisma.statusIncident.delete({ where: { id } });
    revalidatePath('/super-admin/status', 'page');
    revalidatePath('/status');
}
