import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channel = await prisma.channel.findFirst({
        where: { companyId: session.user.companyId, type: ChannelType.INSTAGRAM },
    });

    if (!channel) {
        return NextResponse.json({ error: 'No Instagram channel found' }, { status: 404 });
    }

    const config = channel.configJson as any;
    const results: Record<string, any> = {
        channelId: channel.id,
        status: channel.status,
        pageId: config?.pageId || 'MISSING',
        igAccountId: config?.igAccountId || 'MISSING',
        hasAccessToken: !!config?.accessToken,
        tokenPreview: config?.accessToken ? config.accessToken.substring(0, 20) + '...' : 'MISSING',
        pageName: config?.pageName || 'unknown',
    };

    const accessToken = config?.accessToken;
    if (!accessToken) {
        return NextResponse.json({ ...results, error: 'No access token' });
    }

    // Check 1: Token valid?
    try {
        const meRes = await fetch(`${META_GRAPH}/me?access_token=${accessToken}`);
        const meData = await meRes.json();
        results.tokenValid = meRes.ok;
        results.tokenUser = meData.name || meData.error?.message;
    } catch (e: any) {
        results.tokenError = e.message;
    }

    // Check 2: Page info
    if (config.pageId) {
        try {
            const pageRes = await fetch(`${META_GRAPH}/${config.pageId}?fields=id,name,instagram_business_account,access_token&access_token=${accessToken}`);
            const pageData = await pageRes.json();
            results.pageInfo = pageRes.ok ? { id: pageData.id, name: pageData.name, igAccount: pageData.instagram_business_account } : pageData.error;
        } catch (e: any) {
            results.pageError = e.message;
        }
    }

    // Check 3: Webhook subscription
    if (config.pageId) {
        try {
            const subRes = await fetch(`${META_GRAPH}/${config.pageId}/subscribed_apps?access_token=${accessToken}`);
            const subData = await subRes.json();
            results.webhookSubscription = subData;
        } catch (e: any) {
            results.subError = e.message;
        }

        // Try to subscribe
        try {
            const subscribeRes = await fetch(`${META_GRAPH}/${config.pageId}/subscribed_apps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: accessToken,
                    subscribed_fields: ['messages', 'messaging_postbacks'],
                }),
            });
            const subscribeData = await subscribeRes.json();
            results.subscribeAttempt = subscribeData;
        } catch (e: any) {
            results.subscribeError = e.message;
        }
    }

    // Check 4: Instagram account info
    if (config.igAccountId) {
        try {
            const igRes = await fetch(`${META_GRAPH}/${config.igAccountId}?fields=id,username,name&access_token=${accessToken}`);
            const igData = await igRes.json();
            results.igInfo = igRes.ok ? igData : igData.error;
        } catch (e: any) {
            results.igError = e.message;
        }
    }

    return NextResponse.json(results);
}
