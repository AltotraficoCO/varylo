'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';

const CONTACTS_PAGE_SIZE = 10;

function buildContactsWhere(companyId: string, search?: string, filter?: string, channel?: string) {
    const conditions: any[] = [];

    if (search) {
        conditions.push({
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
            ],
        });
    }

    if (filter === 'active') {
        conditions.push({ conversations: { some: { status: 'OPEN' } } });
    }

    if (channel) {
        conditions.push({
            OR: [
                { originChannel: channel },
                { conversations: { some: { channel: { type: channel } } } },
            ],
        });
    }

    return {
        companyId,
        phone: { not: '__playground__' },
        ...(conditions.length > 0 ? { AND: conditions } : {}),
    } as any;
}

export async function getContacts(search?: string, filter?: string, channel?: string, page: number = 1) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { contacts: [], total: 0 };
    }

    const where = buildContactsWhere(session.user.companyId, search, filter, channel);

    const safePage = Math.max(1, page);
    const [contacts, total] = await prisma.$transaction([
        prisma.contact.findMany({
            where,
            include: {
                tags: true,
                conversations: {
                    select: { channel: { select: { type: true } } },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { conversations: true }
                },
            },
            orderBy: { name: { sort: 'asc', nulls: 'last' } },
            skip: (safePage - 1) * CONTACTS_PAGE_SIZE,
            take: CONTACTS_PAGE_SIZE,
        }),
        prisma.contact.count({ where }),
    ]);

    return { contacts, total };
}

/** Returns ALL matching contacts (no pagination) for CSV export. */
export async function exportContacts(search?: string, filter?: string, channel?: string) {
    const session = await auth();
    if (!session?.user?.companyId) return [];

    const where = buildContactsWhere(session.user.companyId, search, filter, channel);
    return prisma.contact.findMany({
        where,
        select: {
            name: true, phone: true, email: true, companyName: true, originChannel: true,
            conversations: { select: { channel: { select: { type: true } } }, take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { name: { sort: 'asc', nulls: 'last' } },
    });
}

export async function deleteContacts(contactIds: string[]) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, message: 'Unauthorized' };
    }

    if (session.user.role === Role.AGENT) {
        return { success: false, message: 'Agents cannot delete contacts' };
    }

    if (!contactIds.length) {
        return { success: false, message: 'No contacts selected' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Delete conversations first (messages, insights, chatbot sessions cascade automatically)
            await tx.conversation.deleteMany({
                where: {
                    contactId: { in: contactIds },
                    companyId: session.user.companyId!,
                },
            });

            await tx.contact.deleteMany({
                where: {
                    id: { in: contactIds },
                    companyId: session.user.companyId!,
                },
            });
        });

        revalidatePath('/[lang]/company/contacts', 'page');
        return { success: true, count: contactIds.length };
    } catch (error) {
        console.error('Error deleting contacts:', error);
        return { success: false, message: 'Failed to delete contacts' };
    }
}

export async function createContact(data: {
    name: string;
    phone: string;
    email?: string;
    companyName?: string;
    city?: string;
    country?: string;
}) {
    const session = await auth();
    if (!session?.user?.companyId) {
        throw new Error("Unauthorized");
    }

    const contact = await prisma.contact.create({
        data: {
            ...data,
            companyId: session.user.companyId,
        }
    });

    revalidatePath('/[lang]/company/contacts', 'page');
    return contact;
}
