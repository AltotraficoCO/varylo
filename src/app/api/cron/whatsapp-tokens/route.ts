import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import { readChannelSecret, writeChannelSecret } from '@/lib/channel-config';

const META_GRAPH = 'https://graph.facebook.com/v21.0';
const WARNING_THRESHOLD_DAYS = 10;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        return NextResponse.json({ error: 'META_APP_ID/SECRET not configured' }, { status: 500 });
    }

    const now = Date.now();
    const warningCutoff = new Date(now + WARNING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const channels = await prisma.channel.findMany({
        where: {
            type: ChannelType.WHATSAPP,
            configJson: { path: ['connectionMode'], equals: 'oauth' },
        },
    });

    let refreshed = 0;
    let warned = 0;
    let expired = 0;
    let healthy = 0;

    for (const channel of channels) {
        const config = channel.configJson as Record<string, any> | null;
        const accessToken = readChannelSecret(config?.accessToken);
        const expiresAt = channel.tokenExpiresAt;

        if (!accessToken || !expiresAt) continue;

        // Already past expiry → mark EXPIRED
        if (expiresAt.getTime() <= now) {
            if (channel.tokenStatus !== 'EXPIRED') {
                await prisma.channel.update({
                    where: { id: channel.id },
                    data: { tokenStatus: 'EXPIRED' },
                });
            }
            expired++;
            continue;
        }

        // Within warning window → try silent refresh
        if (expiresAt <= warningCutoff) {
            try {
                const refreshRes = await fetch(
                    `${META_GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
                );
                const refreshData = await refreshRes.json();

                if (refreshRes.ok && refreshData.access_token) {
                    const expiresInSec: number = Number(refreshData.expires_in) || 60 * 24 * 60 * 60;
                    const newExpiresAt = new Date(now + expiresInSec * 1000);

                    await prisma.channel.update({
                        where: { id: channel.id },
                        data: {
                            tokenExpiresAt: newExpiresAt,
                            tokenStatus: 'ACTIVE',
                            configJson: { ...config, accessToken: writeChannelSecret(refreshData.access_token) },
                        },
                    });
                    refreshed++;
                    continue;
                }
            } catch (err) {
                console.error('[whatsapp-tokens] refresh failed:', err instanceof Error ? err.message : 'unknown');
            }

            // Refresh failed → mark WARNING so UI shows banner
            if (channel.tokenStatus !== 'WARNING') {
                await prisma.channel.update({
                    where: { id: channel.id },
                    data: { tokenStatus: 'WARNING' },
                });
            }
            warned++;
            continue;
        }

        // Token healthy → ensure ACTIVE status
        if (channel.tokenStatus !== 'ACTIVE') {
            await prisma.channel.update({
                where: { id: channel.id },
                data: { tokenStatus: 'ACTIVE' },
            });
        }
        healthy++;
    }

    return NextResponse.json({
        ok: true,
        scanned: channels.length,
        refreshed,
        warned,
        expired,
        healthy,
    });
}
