import { auth } from '@/auth';
import { getContacts } from './actions';
import { ContactsClient } from './contacts-client';
import { SubscriptionGate } from '@/components/subscription-gate';

export default async function ContactsPage(props: {
    params: Promise<{ lang: string }>,
    searchParams: Promise<{ q?: string; filter?: string; channel?: string }>
}) {
    const searchParams = await props.searchParams;
    const params = await props.params;

    const session = await auth();
    if (!session) return null;

    const contacts = await getContacts(searchParams.q, searchParams.filter, searchParams.channel);

    return (
        <SubscriptionGate featureName="Contactos">
            <ContactsClient
                contacts={contacts as any}
                search={searchParams.q || ''}
                filter={searchParams.filter || ''}
                channel={searchParams.channel || ''}
                lang={params.lang}
            />
        </SubscriptionGate>
    );
}
