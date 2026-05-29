'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';

export async function getContacts(search?: string, filter?: string, channel?: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return [];
    }

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

    const where: any = {
        companyId: session.user.companyId,
        phone: { not: '__playground__' },
        ...(conditions.length > 0 ? { AND: conditions } : {}),
    };

    return prisma.contact.findMany({
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
        orderBy: {
            createdAt: 'desc'
        }
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
