'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { encrypt, decryptMaybe } from '@/lib/encryption';
import {
    testConnection,
    listInvoices,
    listContacts,
    emitInvoiceForPayment,
    AlegraError,
    type AlegraCredentials,
} from '@/lib/alegra';

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

function maskToken(value: string): string {
    if (value.length <= 8) return '••••••••';
    return `${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

// ============ Config ============

export async function getAlegraConfigAction() {
    await requireSuperAdmin();
    try {
        const config = await prisma.alegraConfig.findFirst();
        if (!config) return null;
        return {
            id: config.id,
            email: config.email,
            token: maskToken(decryptMaybe(config.token)),
            active: config.active,
        };
    } catch {
        return null;
    }
}

const configSchema = z.object({
    email: z.string().email('Correo inválido'),
    token: z.string().min(1, 'Token requerido'),
    active: z.boolean(),
});

export async function updateAlegraConfigAction(data: z.infer<typeof configSchema>) {
    await requireSuperAdmin();
    const result = configSchema.safeParse(data);
    if (!result.success) return { success: false, error: 'Datos inválidos' };

    try {
        const existing = await prisma.alegraConfig.findFirst();
        const payload = {
            email: result.data.email,
            token: encrypt(result.data.token),
            active: result.data.active,
        };
        if (existing) {
            await prisma.alegraConfig.update({ where: { id: existing.id }, data: payload });
        } else {
            await prisma.alegraConfig.create({ data: payload });
        }
        revalidatePath('/super-admin/alegra');
        return { success: true };
    } catch (error) {
        console.error('Error saving Alegra config:', error);
        return { success: false, error: 'Error al guardar la configuración' };
    }
}

export async function testAlegraConnectionAction(override?: { email: string; token: string }) {
    await requireSuperAdmin();
    try {
        let creds: AlegraCredentials | undefined;
        if (override?.email && override.token) {
            // If the token field still holds the masked placeholder, use the stored one.
            if (override.token.includes('•')) {
                const stored = await prisma.alegraConfig.findFirst();
                if (stored) creds = { email: override.email, token: decryptMaybe(stored.token) };
            } else {
                creds = { email: override.email, token: override.token };
            }
        }
        const self = await testConnection(creds);
        return { success: true, name: self.name || self.email || 'Cuenta Alegra' };
    } catch (error) {
        const message = error instanceof AlegraError ? error.message : 'Error al conectar con Alegra';
        return { success: false, error: message };
    }
}

// ============ Read-only listings ============

export async function fetchAlegraInvoicesAction(query?: string) {
    await requireSuperAdmin();
    try {
        const invoices = await listInvoices({ limit: 30, query });
        return {
            success: true as const,
            invoices: invoices.map((inv) => ({
                id: String(inv.id),
                number: inv.numberTemplate?.fullNumber ?? inv.numberTemplate?.number ?? String(inv.id),
                date: inv.date ?? '',
                total: typeof inv.total === 'number' ? inv.total : 0,
                status: inv.status ?? '',
                client: inv.client?.name ?? '',
            })),
        };
    } catch (error) {
        const message = error instanceof AlegraError ? error.message : 'Error al obtener facturas';
        return { success: false as const, error: message };
    }
}

export async function fetchAlegraContactsAction(query?: string) {
    await requireSuperAdmin();
    try {
        const contacts = await listContacts({ limit: 30, query });
        return {
            success: true as const,
            contacts: contacts.map((c) => ({
                id: String(c.id),
                name: c.name ?? '',
                identification: typeof c.identification === 'string' ? c.identification : '',
                email: c.email ?? '',
            })),
        };
    } catch (error) {
        const message = error instanceof AlegraError ? error.message : 'Error al obtener contactos';
        return { success: false as const, error: message };
    }
}

/** Manually (re)emit the Alegra invoice for an approved billing attempt. */
export async function emitInvoiceForAttemptAction(attemptId: string) {
    await requireSuperAdmin();
    try {
        const attempt = await prisma.billingAttempt.findUnique({
            where: { id: attemptId },
            select: { subscriptionId: true },
        });
        if (!attempt) return { success: false, error: 'Intento de cobro no encontrado' };
        const result = await emitInvoiceForPayment(attempt.subscriptionId, attemptId);
        if ('skipped' in result) {
            return { success: false, error: result.skipped === 'not_configured' ? 'Alegra no está configurado' : 'No se pudo emitir' };
        }
        revalidatePath('/super-admin/alegra');
        return { success: true, invoiceId: result.invoiceId };
    } catch (error) {
        const message = error instanceof AlegraError ? error.message : 'Error al emitir la factura';
        return { success: false, error: message };
    }
}
