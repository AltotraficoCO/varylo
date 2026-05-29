import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
        where: {
            companyId: session.user.companyId,
            isTest: false,
            status: 'OPEN',
        },
        select: {
            id: true,
            lastMessageAt: true,
            lastInboundAt: true,
        },
        orderBy: { lastMessageAt: 'desc' },
    });

    // Build a fingerprint from IDs + timestamps for quick comparison
    const raw = conversations
        .map(c => `${c.id}:${c.lastMessageAt.getTime()}`)
        .join('|');
    const fingerprint = crypto.createHash('sha256').update(raw).digest('hex');

    return NextResponse.json({ fingerprint, conversations });
}
