import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Automation run history is kept for a rolling 5-day window, then purged.
const RETENTION_DAYS = 5;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const { count } = await prisma.automationRun.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });
        console.log(`[Cleanup] Deleted ${count} automation runs older than ${RETENTION_DAYS} days`);
        return NextResponse.json({ ok: true, deleted: count });
    } catch (error) {
        console.error('[Cleanup automation runs] Error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
