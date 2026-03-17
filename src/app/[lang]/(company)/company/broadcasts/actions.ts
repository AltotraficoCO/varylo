'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ========== CONTACT LISTS ==========

export async function getContactLists() {
  const session = await auth();
  if (!session?.user?.companyId) return [];

  return prisma.contactList.findMany({
    where: { companyId: session.user.companyId },
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createContactList(data: {
  name: string;
  description?: string;
  contactIds: string[];
}) {
  const session = await auth();
  if (!session?.user?.companyId) return { success: false, error: 'No autorizado.' };

  const list = await prisma.contactList.create({
    data: {
      companyId: session.user.companyId,
      name: data.name,
      description: data.description,
      contacts: {
        connect: data.contactIds.map(id => ({ id })),
      },
    },
  });

  revalidatePath('/[lang]/company/broadcasts', 'page');
  return { success: true, list };
}

export async function updateContactList(
  listId: string,
  data: { name?: string; description?: string }
) {
  const session = await auth();
  if (!session?.user?.companyId) return { success: false, error: 'No autorizado.' };

  await prisma.contactList.update({
    where: { id: listId, companyId: session.user.companyId },
    data,
  });

  revalidatePath('/[lang]/company/broadcasts', 'page');
  return { success: true };
}

export async function deleteContactList(listId: string) {
  const session = await auth();
  if (!session?.user?.companyId) return { success: false, error: 'No autorizado.' };

  // Check if there are broadcasts using this list
  const broadcastCount = await prisma.broadcast.count({
    where: { contactListId: listId },
  });
  if (broadcastCount > 0) {
    return { success: false, error: 'No se puede eliminar: esta lista tiene difusiones asociadas.' };
  }

  await prisma.contactList.delete({
    where: { id: listId, companyId: session.user.companyId },
  });

  revalidatePath('/[lang]/company/broadcasts', 'page');
  return { success: true };
}

export async function addContactsToList(listId: string, contactIds: string[]) {
  const session = await auth();
  if (!session?.user?.companyId) return { success: false, error: 'No autorizado.' };

  await prisma.contactList.update({
    where: { id: listId, companyId: session.user.companyId },
    data: {
      contacts: { connect: contactIds.map(id => ({ id })) },
    },
  });

  revalidatePath('/[lang]/company/broadcasts', 'page');
  return { success: true };
}

export async function removeContactsFromList(listId: string, contactIds: string[]) {
  const session = await auth();
  if (!session?.user?.companyId) return { success: false, error: 'No autorizado.' };

  await prisma.contactList.update({
    where: { id: listId, companyId: session.user.companyId },
    data: {
      contacts: { disconnect: contactIds.map(id => ({ id })) },
    },
  });

  revalidatePath('/[lang]/company/broadcasts', 'page');
  return { success: true };
}

export async function getContactListWithContacts(listId: string) {
  const session = await auth();
  if (!session?.user?.companyId) return null;

  return prisma.contactList.findFirst({
    where: { id: listId, companyId: session.user.companyId },
    include: {
      contacts: {
        select: { id: true, name: true, phone: true, email: true, originChannel: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { contacts: true } },
    },
  });
}

// ========== BROADCASTS ==========

export async function getBroadcasts() {
  const session = await auth();
  if (!session?.user?.companyId) return [];

  return prisma.broadcast.findMany({
    where: { companyId: session.user.companyId },
    include: {
      contactList: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBroadcast(data: {
  contactListId: string;
  templateName: string;
  templateLang: string;
  templateComponents: any[];
  templateBody?: string;
}) {
  const session = await auth();
  if (!session?.user?.companyId || !session?.user?.id) {
    return { success: false, error: 'No autorizado.' };
  }

  // Get contacts in the list (only those with phone numbers, for WhatsApp)
  const list = await prisma.contactList.findFirst({
    where: { id: data.contactListId, companyId: session.user.companyId },
    include: {
      contacts: {
        where: { phone: { not: '' } },
        select: { id: true },
      },
    },
  });

  if (!list) return { success: false, error: 'Lista no encontrada.' };
  if (list.contacts.length === 0) return { success: false, error: 'La lista no tiene contactos con número de teléfono.' };

  // Create broadcast + all log entries
  const broadcast = await prisma.broadcast.create({
    data: {
      companyId: session.user.companyId,
      contactListId: data.contactListId,
      templateName: data.templateName,
      templateLang: data.templateLang,
      templateComponents: data.templateComponents,
      templateBody: data.templateBody,
      totalContacts: list.contacts.length,
      createdById: session.user.id,
      logs: {
        create: list.contacts.map(c => ({
          contactId: c.id,
          status: 'PENDING',
        })),
      },
    },
  });

  revalidatePath('/[lang]/company/broadcasts', 'page');
  return { success: true, broadcastId: broadcast.id };
}

export async function getBroadcastStatus(broadcastId: string) {
  const session = await auth();
  if (!session?.user?.companyId) return null;

  return prisma.broadcast.findFirst({
    where: { id: broadcastId, companyId: session.user.companyId },
    include: {
      contactList: { select: { name: true } },
      logs: {
        include: {
          contact: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function getCompanyContacts() {
  const session = await auth();
  if (!session?.user?.companyId) return [];

  return prisma.contact.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, name: true, phone: true, email: true, originChannel: true },
    orderBy: { name: 'asc' },
  });
}
