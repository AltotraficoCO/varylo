import { prisma } from '@/lib/prisma';

/** How often the client sends a heartbeat. */
export const HEARTBEAT_INTERVAL_MS = 60_000; // 60s
/** A session with no heartbeat for this long is considered ended. */
export const STALE_AFTER_MS = 3 * 60_000; // 3 min

/**
 * Register a heartbeat for a user: extend their current connection session,
 * or open a new one if none is active. Also keeps user.status fresh.
 */
export async function recordHeartbeat(userId: string, companyId: string) {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - STALE_AFTER_MS);

    const openSessions = await prisma.userPresenceSession.findMany({
        where: { userId, endedAt: null },
    });
    const fresh = openSessions.find((s) => s.lastHeartbeatAt >= staleCutoff);

    if (fresh) {
        await prisma.userPresenceSession.update({
            where: { id: fresh.id },
            data: { lastHeartbeatAt: now },
        });
        // Close any other dangling sessions at their last heartbeat.
        for (const s of openSessions) {
            if (s.id !== fresh.id) {
                await prisma.userPresenceSession.update({
                    where: { id: s.id },
                    data: { endedAt: s.lastHeartbeatAt },
                });
            }
        }
    } else {
        // No fresh session — close stale ones and start a new interval.
        for (const s of openSessions) {
            await prisma.userPresenceSession.update({
                where: { id: s.id },
                data: { endedAt: s.lastHeartbeatAt },
            });
        }
        await prisma.userPresenceSession.create({
            data: { userId, companyId, startedAt: now, lastHeartbeatAt: now },
        });
    }

    await prisma.user
        .update({ where: { id: userId }, data: { status: 'ONLINE', lastSeenAt: now } })
        .catch(() => {});
}

/** Explicitly end a user's active sessions (logout / tab close). */
export async function endPresence(userId: string) {
    const now = new Date();
    await prisma.userPresenceSession.updateMany({
        where: { userId, endedAt: null },
        data: { endedAt: now },
    });
    await prisma.user
        .update({ where: { id: userId }, data: { status: 'OFFLINE', lastSeenAt: now } })
        .catch(() => {});
}

/**
 * Close sessions whose heartbeat has gone stale and mark those users OFFLINE.
 * Intended to be called from a cron. Returns the number of sessions closed.
 */
export async function closeStalePresenceSessions(): Promise<number> {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    const stale = await prisma.userPresenceSession.findMany({
        where: { endedAt: null, lastHeartbeatAt: { lt: cutoff } },
    });

    for (const s of stale) {
        await prisma.userPresenceSession.update({
            where: { id: s.id },
            data: { endedAt: s.lastHeartbeatAt },
        });
    }

    const userIds = [...new Set(stale.map((s) => s.userId))];
    for (const userId of userIds) {
        const stillOpen = await prisma.userPresenceSession.count({
            where: { userId, endedAt: null },
        });
        if (stillOpen === 0) {
            await prisma.user
                .update({ where: { id: userId }, data: { status: 'OFFLINE' } })
                .catch(() => {});
        }
    }

    return stale.length;
}

/**
 * Total connected seconds per user within [since, now], for a company.
 * Open sessions are bounded by their last heartbeat so idle/abandoned tabs
 * don't inflate the time.
 */
export async function getConnectedSecondsByUser(
    companyId: string,
    since: Date,
): Promise<Record<string, number>> {
    const now = Date.now();
    const sessions = await prisma.userPresenceSession.findMany({
        where: {
            companyId,
            // Sessions that overlap the window.
            OR: [{ endedAt: null }, { endedAt: { gte: since } }],
        },
        select: { userId: true, startedAt: true, lastHeartbeatAt: true, endedAt: true },
    });

    const totals: Record<string, number> = {};
    for (const s of sessions) {
        const endMs = s.endedAt ? s.endedAt.getTime() : Math.min(now, s.lastHeartbeatAt.getTime());
        const startMs = Math.max(s.startedAt.getTime(), since.getTime());
        const durationSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
        totals[s.userId] = (totals[s.userId] || 0) + durationSec;
    }
    return totals;
}
