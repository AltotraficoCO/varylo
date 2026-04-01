import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/debug/whatsapp
 * Diagnostic endpoint: checks WhatsApp config, WABA subscription, phone status.
 * Also attempts to subscribe WABA to webhooks if not already.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channel = await prisma.channel.findFirst({
        where: { companyId: session.user.companyId, type: ChannelType.WHATSAPP },
    });

    if (!channel) {
        return NextResponse.json({ error: 'No WhatsApp channel found' }, { status: 404 });
    }

    const config = channel.configJson as any;
    const results: Record<string, any> = {
        channelId: channel.id,
        status: channel.status,
        phoneNumberId: config?.phoneNumberId || 'MISSING',
        wabaId: config?.wabaId || 'MISSING',
        hasAccessToken: !!config?.accessToken,
        tokenPreview: config?.accessToken ? config.accessToken.substring(0, 20) + '...' : 'MISSING',
    };

    const accessToken = config?.accessToken;
    if (!accessToken) {
        return NextResponse.json({ ...results, error: 'No access token' });
    }

    // Check 1: Verify token is valid
    try {
        const meRes = await fetch(`${META_GRAPH}/me?access_token=${accessToken}`);
        const meData = await meRes.json();
        results.tokenValid = meRes.ok;
        results.tokenUser = meData.name || meData.error?.message || 'unknown';
    } catch (e: any) {
        results.tokenValid = false;
        results.tokenError = e.message;
    }

    // Check 2: Get WABA info
    if (config.wabaId) {
        try {
            const wabaRes = await fetch(`${META_GRAPH}/${config.wabaId}?fields=name,id,on_behalf_of_business_info&access_token=${accessToken}`);
            const wabaData = await wabaRes.json();
            results.wabaInfo = wabaRes.ok ? wabaData : wabaData.error;
        } catch (e: any) {
            results.wabaError = e.message;
        }

        // Check 3: Check webhook subscription
        try {
            const subRes = await fetch(`${META_GRAPH}/${config.wabaId}/subscribed_apps?access_token=${accessToken}`);
            const subData = await subRes.json();
            results.webhookSubscription = subData;
        } catch (e: any) {
            results.webhookSubError = e.message;
        }

        // Check 4: Try to subscribe
        try {
            const subscribeRes = await fetch(`${META_GRAPH}/${config.wabaId}/subscribed_apps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: accessToken }),
            });
            const subscribeData = await subscribeRes.json();
            results.subscribeAttempt = subscribeData;
        } catch (e: any) {
            results.subscribeError = e.message;
        }
    }

    // Check 5: Get phone number info
    if (config.phoneNumberId) {
        try {
            const phoneRes = await fetch(`${META_GRAPH}/${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,is_official_business_account&access_token=${accessToken}`);
            const phoneData = await phoneRes.json();
            results.phoneInfo = phoneRes.ok ? phoneData : phoneData.error;
        } catch (e: any) {
            results.phoneError = e.message;
        }
    }

    return NextResponse.json(results, { status: 200 });
}
