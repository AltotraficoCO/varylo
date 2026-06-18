import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, decryptMaybe } from '@/lib/encryption';

/**
 * Alegra (alegra.com) billing integration client.
 *
 * Authentication is HTTP Basic with `base64(email:token)`. There is no sandbox
 * environment on the same host — Alegra uses a separate test account, so the
 * base URL is always production. Configuration is a single global row managed by
 * super admins (see `AlegraConfig`), with an env-var fallback.
 */

const ALEGRA_BASE_URL = 'https://api.alegra.com/api/v1';
const SUBSCRIPTION_ITEM_NAME = 'Suscripción Varylo';

export type AlegraCredentials = {
    email: string;
    token: string;
};

/** Read Alegra credentials from DB (token decrypted), falling back to env vars. */
export async function getAlegraCredentials(): Promise<AlegraCredentials | null> {
    try {
        const config = await prisma.alegraConfig.findFirst();
        if (config?.active && config.email && config.token) {
            return { email: config.email, token: decryptMaybe(config.token) };
        }
    } catch {
        // Table may not exist yet — fall through to env vars.
    }

    const email = process.env.ALEGRA_EMAIL;
    const token = process.env.ALEGRA_TOKEN;
    if (email && token) return { email, token };
    return null;
}

function authHeader(creds: AlegraCredentials): string {
    const basic = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
    return `Basic ${basic}`;
}

export class AlegraError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'AlegraError';
        this.status = status;
    }
}

type AlegraFetchOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    query?: Record<string, string | number | undefined>;
    body?: unknown;
    creds?: AlegraCredentials;
};

/**
 * Low-level Alegra API call. Throws `AlegraError` on non-2xx responses with the
 * message surfaced by Alegra when available.
 */
export async function alegraFetch<T = any>(path: string, options: AlegraFetchOptions = {}): Promise<T> {
    const creds = options.creds ?? (await getAlegraCredentials());
    if (!creds) throw new AlegraError('Alegra no está configurado', 500);

    const url = new URL(`${ALEGRA_BASE_URL}${path}`);
    if (options.query) {
        for (const [key, value] of Object.entries(options.query)) {
            if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
        }
    }

    const res = await fetch(url.toString(), {
        method: options.method ?? 'GET',
        headers: {
            Authorization: authHeader(creds),
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: 'no-store',
    });

    const text = await res.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        // Non-JSON response.
    }

    if (!res.ok) {
        const message = json?.message || json?.error || text || `Error ${res.status}`;
        throw new AlegraError(typeof message === 'string' ? message : 'Error de Alegra', res.status);
    }

    return json as T;
}

// ============ Connection ============

export type AlegraSelf = { id?: string | number; name?: string; email?: string };

/** Verify credentials against `/users/self`. Returns the authenticated user. */
export async function testConnection(creds?: AlegraCredentials): Promise<AlegraSelf> {
    return alegraFetch<AlegraSelf>('/users/self', { creds });
}

// ============ Contacts ============

export type AlegraContact = {
    id: string | number;
    name?: string;
    identification?: string;
    email?: string;
    [key: string]: unknown;
};

export async function listContacts(params: { limit?: number; start?: number; query?: string } = {}): Promise<AlegraContact[]> {
    return alegraFetch<AlegraContact[]>('/contacts', {
        query: { limit: params.limit ?? 30, start: params.start ?? 0, query: params.query },
    });
}

export async function getContact(id: string | number): Promise<AlegraContact> {
    return alegraFetch<AlegraContact>(`/contacts/${id}`);
}

export async function createContact(data: { name: string; identification?: string; email?: string }): Promise<AlegraContact> {
    return alegraFetch<AlegraContact>('/contacts', { method: 'POST', body: data });
}

// ============ Items (products/services) ============

export type AlegraItem = { id: string | number; name?: string; [key: string]: unknown };

export async function listItems(params: { limit?: number; start?: number; query?: string } = {}): Promise<AlegraItem[]> {
    return alegraFetch<AlegraItem[]>('/items', {
        query: { limit: params.limit ?? 30, start: params.start ?? 0, query: params.query },
    });
}

// ============ Invoices ============

export type AlegraInvoice = {
    id: string | number;
    date?: string;
    dueDate?: string;
    total?: number;
    status?: string;
    numberTemplate?: { number?: string; fullNumber?: string };
    client?: { id?: string | number; name?: string };
    [key: string]: unknown;
};

export async function listInvoices(params: { limit?: number; start?: number; query?: string } = {}): Promise<AlegraInvoice[]> {
    return alegraFetch<AlegraInvoice[]>('/invoices', {
        query: { limit: params.limit ?? 20, start: params.start ?? 0, query: params.query, order_direction: 'DESC' },
    });
}

export async function getInvoice(id: string | number): Promise<AlegraInvoice> {
    return alegraFetch<AlegraInvoice>(`/invoices/${id}`);
}

export type CreateInvoiceInput = {
    clientId: string | number;
    itemId: string | number;
    /** Net unit price (taxes excluded), in account currency. */
    price: number;
    quantity?: number;
    description?: string;
    date?: string; // YYYY-MM-DD
    dueDate?: string; // YYYY-MM-DD
    /** "open" emits the invoice; "draft" leaves it as a draft. */
    status?: 'open' | 'draft';
};

export async function createInvoice(input: CreateInvoiceInput): Promise<AlegraInvoice> {
    const today = input.date ?? new Date().toISOString().slice(0, 10);
    const body = {
        date: today,
        dueDate: input.dueDate ?? today,
        client: { id: input.clientId },
        status: input.status ?? 'open',
        items: [
            {
                id: input.itemId,
                price: input.price,
                quantity: input.quantity ?? 1,
                ...(input.description ? { description: input.description } : {}),
            },
        ],
    };
    return alegraFetch<AlegraInvoice>('/invoices', { method: 'POST', body });
}

// ============ High-level helpers ============

/**
 * Return the Alegra contact id for a company, creating (and caching on the
 * company) the contact when needed.
 */
export async function ensureCompanyContact(companyId: string): Promise<string> {
    const company = await prisma.company.findUniqueOrThrow({
        where: { id: companyId },
        select: { id: true, name: true, alegraContactId: true },
    });

    if (company.alegraContactId) return company.alegraContactId;

    const contact = await createContact({ name: company.name });
    const contactId = String(contact.id);

    await prisma.company.update({
        where: { id: company.id },
        data: { alegraContactId: contactId },
    });

    return contactId;
}

/**
 * Return the id of the reusable "Suscripción Varylo" item, creating and caching
 * it on `AlegraConfig` when missing.
 */
export async function ensureSubscriptionItem(): Promise<string> {
    const config = await prisma.alegraConfig.findFirst();
    if (config?.subscriptionItemId) return config.subscriptionItemId;

    // Try to reuse an existing item with the conventional name before creating.
    const existing = await listItems({ query: SUBSCRIPTION_ITEM_NAME, limit: 5 });
    const match = existing.find((i) => i.name === SUBSCRIPTION_ITEM_NAME);
    let itemId: string;
    if (match) {
        itemId = String(match.id);
    } else {
        const created = await alegraFetch<AlegraItem>('/items', {
            method: 'POST',
            body: { name: SUBSCRIPTION_ITEM_NAME, price: 0 },
        });
        itemId = String(created.id);
    }

    if (config) {
        await prisma.alegraConfig.update({
            where: { id: config.id },
            data: { subscriptionItemId: itemId },
        });
    }
    return itemId;
}

/**
 * Emit an Alegra invoice for an approved billing attempt. Idempotent: if the
 * attempt already has an `alegraInvoiceId`, it returns immediately. Never throws
 * for "not configured" — callers in the payment path treat invoicing as
 * best-effort so an Alegra outage can't break payment processing.
 */
export async function emitInvoiceForPayment(subscriptionId: string, attemptId: string): Promise<{ invoiceId: string } | { skipped: string }> {
    const creds = await getAlegraCredentials();
    if (!creds) return { skipped: 'not_configured' };

    const attempt = await prisma.billingAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, amountInCents: true, alegraInvoiceId: true },
    });
    if (!attempt) return { skipped: 'attempt_not_found' };
    if (attempt.alegraInvoiceId) return { invoiceId: attempt.alegraInvoiceId };

    const sub = await prisma.subscription.findUniqueOrThrow({
        where: { id: subscriptionId },
        include: { planPricing: { include: { landingPlan: { select: { name: true } } } } },
    });

    const clientId = await ensureCompanyContact(sub.companyId);
    const itemId = await ensureSubscriptionItem();
    const price = Math.round(attempt.amountInCents) / 100;

    const invoice = await createInvoice({
        clientId,
        itemId,
        price,
        quantity: 1,
        description: `Suscripción ${sub.planPricing.landingPlan.name}`,
        status: 'open',
    });

    const invoiceId = String(invoice.id);
    await prisma.billingAttempt.update({
        where: { id: attempt.id },
        data: {
            alegraInvoiceId: invoiceId,
            alegraInvoiceNumber: invoice.numberTemplate?.fullNumber ?? invoice.numberTemplate?.number ?? null,
        },
    });

    return { invoiceId };
}

// Re-export encryption helpers so callers managing config don't import two modules.
export { encrypt, decrypt };
