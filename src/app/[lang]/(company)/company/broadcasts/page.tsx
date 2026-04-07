import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { BroadcastsClient } from './broadcasts-client';
import { SubscriptionGate } from '@/components/subscription-gate';

export default async function BroadcastsPage({
  params: routeParams,
}: {
  params: Promise<{ lang: string }>;
}) {
  const session = await auth();
  if (!session?.user?.companyId) return null;

  const { lang } = await routeParams;

  let contactLists: any[] = [];
  let broadcasts: any[] = [];
  let contacts: any[] = [];

  try {
    [contactLists, broadcasts, contacts] = await Promise.all([
      prisma.contactList.findMany({
        where: { companyId: session.user.companyId },
        include: { _count: { select: { contacts: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.broadcast.findMany({
        where: { companyId: session.user.companyId },
        include: {
          contactList: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, name: true, phone: true, email: true, originChannel: true },
        orderBy: { name: 'asc' },
      }),
    ]);
  } catch (e) {
    // Tables might not exist yet
    console.error('[BroadcastsPage]', e);
  }

  return (
    <SubscriptionGate featureName="Difusiones">
      <BroadcastsClient
        contactLists={contactLists}
        broadcasts={broadcasts}
        contacts={contacts}
        lang={lang}
      />
    </SubscriptionGate>
  );
}
