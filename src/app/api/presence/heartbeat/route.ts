import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { recordHeartbeat, endPresence } from '@/lib/presence';

export const dynamic = 'force-dynamic';

/**
 * POST /api/presence/heartbeat
 * Body (optional): { event: "end" } to close the session (logout / tab close).
 * Default behaviour extends/opens the user's connection session.
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let event: string | undefined;
    try {
        const body = await req.json();
        event = body?.event;
    } catch {
        // No body — treat as a normal heartbeat.
    }

    try {
        if (event === 'end') {
            await endPresence(session.user.id);
        } else {
            await recordHeartbeat(session.user.id, session.user.companyId);
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[presence] heartbeat error:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
