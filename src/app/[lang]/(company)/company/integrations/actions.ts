'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function disconnectEcommerceById(storeId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No autorizado' };
    }

    const store = await prisma.ecommerceIntegration.findFirst({
        where: { id: storeId, companyId: session.user.companyId },
    });

    if (!store) {
        return { success: false, error: 'Tienda no encontrada' };
    }

    await prisma.ecommerceIntegration.delete({ where: { id: storeId } });

    revalidatePath('/company/integrations');
    return { success: true };
}
