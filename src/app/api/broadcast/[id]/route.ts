import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { executeBroadcast } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for Pro plan

// GET: Check broadcast status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const broadcast = await prisma.broadcast.findFirst({
    where: { id, companyId: session.user.companyId },
    select: {
      id: true,
      status: true,
      totalContacts: true,
      sentCount: true,
      failedCount: true,
      startedAt: true,
      completedAt: true,
      templateName: true,
      contactList: { select: { name: true } },
    },
  });

  if (!broadcast) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(broadcast);
}

// POST: Start broadcast execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify broadcast belongs to company and is PENDING
  const broadcast = await prisma.broadcast.findFirst({
    where: { id, companyId: session.user.companyId, status: 'PENDING' },
  });

  if (!broadcast) {
    return NextResponse.json(
      { error: 'Difusión no encontrada o ya iniciada.' },
      { status: 400 }
    );
  }

  // Execute in background (don't await)
  executeBroadcast(id).catch(err => {
    console.error('[Broadcast] Execution error:', err);
  });

  return NextResponse.json({ success: true, message: 'Difusión iniciada.' });
}
