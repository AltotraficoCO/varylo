import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';
import { ChannelType } from '@prisma/client';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/auth/meta/instagram/callback
 * Facebook OAuth callback - exchanges code for token,
 * finds Instagram page, subscribes to webhooks, saves channel config.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.AUTH_URL || req.nextUrl.origin;
    const settingsUrl = `${baseUrl}/company/settings?tab=channels`;

    if (error || !code || !state) {
        console.error('[Instagram OAuth] Error or missing params:', error);
        return NextResponse.redirect(`${settingsUrl}&ig=error&reason=${error || 'missing_params'}`);
    }

    // Verify authenticated user
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.redirect(`${settingsUrl}&ig=error&reason=unauthorized`);
    }

    // Verify state matches company
    let companyId: string;
    try {
        companyId = decrypt(state);
    } catch {
        return NextResponse.redirect(`${settingsUrl}&ig=error&reason=invalid_state`);
    }

    if (session.user.companyId !== companyId) {
        return NextResponse.redirect(`${settingsUrl}&ig=error&reason=company_mismatch`);
    }

    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;
    const redirectUri = `${baseUrl}/api/auth/meta/instagram/callback`;

    try {
        // Step 1: Exchange code for short-lived user access token
        const tokenRes = await fetch(
            `${META_GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
        );
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('[Instagram OAuth] Token exchange failed:', tokenData);
            return NextResponse.redirect(`${settingsUrl}&ig=error&reason=token_failed`);
        }

        // Step 2: Exchange for long-lived token (60 days)
        const longTokenRes = await fetch(
            `${META_GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
        );
        const longTokenData = await longTokenRes.json();
        const userToken = longTokenData.access_token || tokenData.access_token;

        // Step 3: Get user's Facebook Pages
        const pagesRes = await fetch(`${META_GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`);
        const pagesData = await pagesRes.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            return NextResponse.redirect(`${settingsUrl}&ig=error&reason=no_pages`);
        }

        // Step 4: Find a page with Instagram Business Account
        let selectedPage = null;
        for (const page of pagesData.data) {
            if (page.instagram_business_account) {
                selectedPage = page;
                break;
            }
        }

        if (!selectedPage) {
            // No page has Instagram connected - use first page anyway
            // (Instagram might be connected but not as Business Account)
            selectedPage = pagesData.data[0];
        }

        const pageId = selectedPage.id;
        const pageAccessToken = selectedPage.access_token;
        const igAccountId = selectedPage.instagram_business_account?.id || null;

        // Step 5: Subscribe page to webhooks (messages, messaging_postbacks)
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
            console.error('[Instagram OAuth] Webhook subscription failed:', subscribeData);
            // Continue anyway - might need to subscribe manually
        }

        // Step 6: Generate verify token for webhook verification
        const verifyToken = 'varylo_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);

        // Step 7: Save or update channel in database
        const existingChannel = await prisma.channel.findFirst({
            where: { companyId, type: ChannelType.INSTAGRAM },
        });

        const configJson = {
            pageId,
            accessToken: encrypt(pageAccessToken),
            appSecret: appSecret,
            verifyToken,
            igAccountId,
            pageName: selectedPage.name,
            connectedAt: new Date().toISOString(),
            connectedBy: session.user.email,
        };

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id },
                data: {
                    status: 'CONNECTED',
                    configJson,
                },
            });
        } else {
            await prisma.channel.create({
                data: {
                    companyId,
                    type: ChannelType.INSTAGRAM,
                    status: 'CONNECTED',
                    configJson,
                },
            });
        }

        return NextResponse.redirect(`${settingsUrl}&ig=connected&page=${encodeURIComponent(selectedPage.name)}`);
    } catch (err) {
        console.error('[Instagram OAuth] Callback error:', err);
        return NextResponse.redirect(`${settingsUrl}&ig=error&reason=internal`);
    }
}
