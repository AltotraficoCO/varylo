import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
    const { conversationId } = await params;
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ capturing: false });
    }

    const conv = await prisma.conversation.findUnique({
        where: { id: conversationId, companyId: session.user.companyId },
        select: { smartCapturingUntil: true },
    });

    const capturing = !!conv?.smartCapturingUntil && conv.smartCapturingUntil.getTime() > Date.now();
    return NextResponse.json({ capturing });
}
