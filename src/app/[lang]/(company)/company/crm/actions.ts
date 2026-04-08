'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getCompanyId() {
    const session = await auth();
    if (!session?.user?.companyId) throw new Error('No autorizado');
    return session.user.companyId;
}

// ===== Pipeline Stages =====

export async function getStagesWithDeals() {
    const companyId = await getCompanyId();
    return prisma.pipelineStage.findMany({
        where: { companyId },
        orderBy: { sortOrder: 'asc' },
        include: {
            deals: {
                where: { status: 'OPEN' },
                orderBy: { createdAt: 'desc' },
                include: {
                    contact: { select: { id: true, name: true, phone: true, imageUrl: true } },
                    assignedTo: { select: { id: true, name: true } },
                    _count: { select: { quotes: true } },
                },
            },
        },
    });
}

export async function createStage(name: string, color: string) {
    const companyId = await getCompanyId();
    const maxOrder = await prisma.pipelineStage.aggregate({
        where: { companyId },
        _max: { sortOrder: true },
    });
    await prisma.pipelineStage.create({
        data: { companyId, name, color, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
    });
    revalidatePath('/company/crm/pipeline');
    return { success: true };
}

export async function seedDefaultStages() {
    const companyId = await getCompanyId();
    const existing = await prisma.pipelineStage.count({ where: { companyId } });
    if (existing > 0) return { success: true, message: 'Ya existen etapas' };

    const defaults = [
        { name: 'Nuevo', color: '#3B82F6', sortOrder: 0 },
        { name: 'Contactado', color: '#F59E0B', sortOrder: 1 },
        { name: 'Propuesta', color: '#8B5CF6', sortOrder: 2 },
        { name: 'Negociación', color: '#F97316', sortOrder: 3 },
        { name: 'Cerrado', color: '#10B981', sortOrder: 4 },
    ];

    await prisma.pipelineStage.createMany({
        data: defaults.map(s => ({ ...s, companyId })),
    });
    revalidatePath('/company/crm/pipeline');
    return { success: true };
}

export async function deleteStage(stageId: string) {
    const companyId = await getCompanyId();
    await prisma.deal.deleteMany({ where: { stageId, companyId } });
    await prisma.pipelineStage.delete({ where: { id: stageId } });
    revalidatePath('/company/crm/pipeline');
    return { success: true };
}

// ===== Deals =====

export async function createDeal(data: {
    stageId: string;
    title: string;
    value?: number;
    contactId?: string;
    assignedToId?: string;
    probability?: number;
    expectedCloseAt?: string;
    notes?: string;
}) {
    const companyId = await getCompanyId();
    await prisma.deal.create({
        data: {
            companyId,
            stageId: data.stageId,
            title: data.title,
            value: data.value || 0,
            contactId: data.contactId || null,
            assignedToId: data.assignedToId || null,
            probability: data.probability || 50,
            expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : null,
            notes: data.notes || null,
        },
    });
    revalidatePath('/company/crm/pipeline');
    return { success: true };
}

export async function moveDeal(dealId: string, newStageId: string) {
    const companyId = await getCompanyId();
    await prisma.deal.update({
        where: { id: dealId, companyId },
        data: { stageId: newStageId },
    });
    revalidatePath('/company/crm/pipeline');
    return { success: true };
}

export async function updateDealStatus(dealId: string, status: 'OPEN' | 'WON' | 'LOST') {
    const companyId = await getCompanyId();
    await prisma.deal.update({
        where: { id: dealId, companyId },
        data: {
            status,
            closedAt: status !== 'OPEN' ? new Date() : null,
        },
    });
    revalidatePath('/company/crm/pipeline');
    return { success: true };
}

export async function deleteDeal(dealId: string) {
    const companyId = await getCompanyId();
    await prisma.deal.delete({ where: { id: dealId, companyId } });
    revalidatePath('/company/crm/pipeline');
    return { success: true };
}

// ===== Products =====

export async function getProducts() {
    const companyId = await getCompanyId();
    return prisma.product.findMany({
        where: { companyId },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    });
}

export async function createProduct(data: {
    name: string;
    description?: string;
    sku?: string;
    price: number;
    stock?: number;
    categoryId?: string;
    imageUrl?: string;
}) {
    const companyId = await getCompanyId();
    await prisma.product.create({
        data: { companyId, ...data, categoryId: data.categoryId || null },
    });
    revalidatePath('/company/crm/products');
    return { success: true };
}

export async function updateProduct(productId: string, data: {
    name?: string;
    description?: string;
    sku?: string;
    price?: number;
    stock?: number;
    categoryId?: string;
    active?: boolean;
}) {
    const companyId = await getCompanyId();
    await prisma.product.update({ where: { id: productId, companyId }, data });
    revalidatePath('/company/crm/products');
    return { success: true };
}

export async function deleteProduct(productId: string) {
    const companyId = await getCompanyId();
    await prisma.product.delete({ where: { id: productId, companyId } });
    revalidatePath('/company/crm/products');
    return { success: true };
}

export async function getCategories() {
    const companyId = await getCompanyId();
    return prisma.productCategory.findMany({
        where: { companyId },
        include: { _count: { select: { products: true } } },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function createCategory(name: string) {
    const companyId = await getCompanyId();
    await prisma.productCategory.create({ data: { companyId, name } });
    revalidatePath('/company/crm/products');
    return { success: true };
}

// ===== Quotes =====

export async function getQuotes() {
    const companyId = await getCompanyId();
    return prisma.quote.findMany({
        where: { companyId },
        include: {
            contact: { select: { id: true, name: true, phone: true } },
            deal: { select: { id: true, title: true } },
            items: { include: { product: { select: { name: true } } } },
            createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function createQuote(data: {
    dealId?: string;
    contactId?: string;
    notes?: string;
    validUntil?: string;
    items: { productId?: string; name: string; quantity: number; unitPrice: number }[];
}) {
    const companyId = await getCompanyId();
    const session = await auth();

    // Generate quote number
    const count = await prisma.quote.count({ where: { companyId } });
    const number = `COT-${String(count + 1).padStart(3, '0')}`;

    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = 0;
    const total = subtotal - 0 + tax;

    await prisma.quote.create({
        data: {
            companyId,
            number,
            dealId: data.dealId || null,
            contactId: data.contactId || null,
            notes: data.notes || null,
            validUntil: data.validUntil ? new Date(data.validUntil) : null,
            subtotal,
            tax,
            total,
            createdById: session?.user?.id || null,
            items: {
                create: data.items.map(item => ({
                    productId: item.productId || null,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.quantity * item.unitPrice,
                })),
            },
        },
    });

    revalidatePath('/company/crm/quotes');
    return { success: true };
}

export async function updateQuoteStatus(quoteId: string, status: string) {
    const companyId = await getCompanyId();
    const data: any = { status };
    if (status === 'SENT') data.sentAt = new Date();
    if (status === 'VIEWED') data.viewedAt = new Date();
    if (status === 'ACCEPTED' || status === 'REJECTED') data.respondedAt = new Date();

    await prisma.quote.update({ where: { id: quoteId, companyId }, data });
    revalidatePath('/company/crm/quotes');
    return { success: true };
}

export async function deleteQuote(quoteId: string) {
    const companyId = await getCompanyId();
    await prisma.quote.delete({ where: { id: quoteId, companyId } });
    revalidatePath('/company/crm/quotes');
    return { success: true };
}

// ===== CRM Stats =====

export async function getCrmStats() {
    const companyId = await getCompanyId();
    const [totalDeals, wonDeals, openDeals, totalValue, wonValue, totalQuotes, productCount] = await Promise.all([
        prisma.deal.count({ where: { companyId } }),
        prisma.deal.count({ where: { companyId, status: 'WON' } }),
        prisma.deal.count({ where: { companyId, status: 'OPEN' } }),
        prisma.deal.aggregate({ where: { companyId, status: 'OPEN' }, _sum: { value: true } }),
        prisma.deal.aggregate({ where: { companyId, status: 'WON' }, _sum: { value: true } }),
        prisma.quote.count({ where: { companyId } }),
        prisma.product.count({ where: { companyId, active: true } }),
    ]);

    return {
        totalDeals,
        wonDeals,
        openDeals,
        lostDeals: totalDeals - wonDeals - openDeals,
        pipelineValue: totalValue._sum.value || 0,
        wonValue: wonValue._sum.value || 0,
        winRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
        totalQuotes,
        productCount,
    };
}
