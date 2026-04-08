import { auth } from '@/auth';
import { getQuotes, getProducts } from '../actions';
import { QuotesClient } from './quotes-client';

export default async function QuotesPage() {
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const [quotes, products] = await Promise.all([getQuotes(), getProducts()]);

    return (
        <QuotesClient
            quotes={quotes.map(q => ({
                ...q,
                validUntil: q.validUntil?.toISOString() || null,
                sentAt: q.sentAt?.toISOString() || null,
                viewedAt: q.viewedAt?.toISOString() || null,
                respondedAt: q.respondedAt?.toISOString() || null,
                createdAt: q.createdAt.toISOString(),
                updatedAt: q.updatedAt.toISOString(),
            }))}
            products={products.map(p => ({ id: p.id, name: p.name, price: p.price }))}
        />
    );
}
