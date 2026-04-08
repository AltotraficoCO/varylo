import { auth } from '@/auth';
import { getProducts, getCategories } from '../actions';
import { ProductsClient } from './products-client';

export default async function ProductsPage() {
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const [products, categories] = await Promise.all([getProducts(), getCategories()]);

    return (
        <ProductsClient
            products={products.map(p => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            }))}
            categories={categories.map(c => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
            }))}
        />
    );
}
