import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { ChannelType } from '@prisma/client';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.AUTH_URL || req.nextUrl.origin;
    const settingsUrl = `${baseUrl}/company/settings?tab=channels`;

    if (error || !code || !state) {
        return NextResponse.redirect(`${settingsUrl}&ms=error&reason=${error || 'missing_params'}`);
    }

    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.redirect(`${settingsUrl}&ms=error&reason=unauthorized`);
    }

    let companyId: string;
    try {
        companyId = decrypt(state);
    } catch {
        return NextResponse.redirect(`${settingsUrl}&ms=error&reason=invalid_state`);
    }

    if (session.user.companyId !== companyId) {
        return NextResponse.redirect(`${settingsUrl}&ms=error&reason=company_mismatch`);
    }

    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;
    const redirectUri = `${baseUrl}/api/auth/meta/messenger/callback`;

    try {
        // Step 1: Exchange code for short-lived token
        const tokenRes = await fetch(
            `${META_GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
        );
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('[Messenger OAuth] Token exchange failed:', tokenData);
            return NextResponse.redirect(`${settingsUrl}&ms=error&reason=token_failed`);
        }

        // Step 2: Exchange for long-lived token
        const longTokenRes = await fetch(
            `${META_GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
        );
        const longTokenData = await longTokenRes.json();
        const userToken = longTokenData.access_token || tokenData.access_token;

        // Step 3: Get Facebook Pages
        const pagesRes = await fetch(`${META_GRAPH}/me/accounts?fields=id,name,access_token&access_token=${userToken}`);
        const pagesData = await pagesRes.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            return NextResponse.redirect(`${settingsUrl}&ms=error&reason=no_pages`);
        }

        const selectedPage = pagesData.data[0];
        const pageId = selectedPage.id;
        const pageAccessToken = selectedPage.access_token;

        // Step 4: Subscribe page to message webhooks
        const subscribeRes = await fetch(`${META_GRAPH}/${pageId}/subscribed_apps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: pageAccessToken,
                subscribed_fields: ['messages', 'messaging_postbacks'],
            }),
        });
        const subscribeData = await subscribeRes.json();
        if (!subscribeData.success) {
            console.error('[Messenger OAuth] Webhook subscription failed:', subscribeData);
        }

        const verifyToken = 'varylo_ms_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);

        // Step 5: Disconnect any other company's Messenger channel with same pageId
        await prisma.channel.updateMany({
            where: {
                type: ChannelType.MESSENGER,
                companyId: { not: companyId },
                configJson: { path: ['pageId'], equals: pageId },
            },
            data: { status: 'DISCONNECTED' },
        });

        // Step 6: Save or update channel
        const existingChannel = await prisma.channel.findFirst({
            where: { companyId, type: ChannelType.MESSENGER },
        });

        const configJson = {
            pageId,
            accessToken: pageAccessToken,
            appSecret,
            verifyToken,
            pageName: selectedPage.name,
            connectedAt: new Date().toISOString(),
            connectedBy: session.user.email,
        };

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id },
                data: { status: 'CONNECTED', configJson },
            });
        } else {
            await prisma.channel.create({
                data: {
                    companyId,
                    type: ChannelType.MESSENGER,
                    status: 'CONNECTED',
                    configJson,
                },
            });
        }

        return NextResponse.redirect(`${settingsUrl}&ms=connected&page=${encodeURIComponent(selectedPage.name)}`);
    } catch (err) {
        console.error('[Messenger OAuth] Callback error:', err);
        return NextResponse.redirect(`${settingsUrl}&ms=error&reason=internal`);
    }
}
