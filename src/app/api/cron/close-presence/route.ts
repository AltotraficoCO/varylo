import { NextRequest, NextResponse } from 'next/server';
import { closeStalePresenceSessions } from '@/lib/presence';

export const dynamic = 'force-dynamic';

/**
 * Closes presence sessions whose heartbeat has gone stale and marks the
 * affected users OFFLINE. Runs frequently so connection time and online
 * status stay accurate even if a tab was closed without a clean signal.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const closed = await closeStalePresenceSessions();
        return NextResponse.json({ ok: true, closed });
    } catch (error) {
        console.error('[cron] close-presence error:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
