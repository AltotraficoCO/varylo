import { auth } from '@/auth';
import { getContacts, CONTACTS_PAGE_SIZE } from './actions';
import { ContactsClient } from './contacts-client';
import { SubscriptionGate } from '@/components/subscription-gate';

export default async function ContactsPage(props: {
    params: Promise<{ lang: string }>,
    searchParams: Promise<{ q?: string; filter?: string; channel?: string; page?: string }>
}) {
    const searchParams = await props.searchParams;
    const params = await props.params;

    const session = await auth();
    if (!session) return null;

    const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
    const { contacts, total } = await getContacts(searchParams.q, searchParams.filter, searchParams.channel, page);

    return (
        <SubscriptionGate featureName="Contactos">
            <ContactsClient
                contacts={contacts as any}
                search={searchParams.q || ''}
                filter={searchParams.filter || ''}
                channel={searchParams.channel || ''}
                lang={params.lang}
                page={page}
                total={total}
                pageSize={CONTACTS_PAGE_SIZE}
            />
        </SubscriptionGate>
    );
}
