import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { ChannelType } from '@prisma/client';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/auth/meta/whatsapp/callback
 * Facebook OAuth callback for WhatsApp Business.
 * Exchanges code for token, finds WABA + phone number, saves channel.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.AUTH_URL || req.nextUrl.origin;
    const settingsUrl = `${baseUrl}/company/settings?tab=channels`;

    if (error || !code || !state) {
        return NextResponse.redirect(`${settingsUrl}&wa=error&reason=${error || 'missing_params'}`);
    }

    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.redirect(`${settingsUrl}&wa=error&reason=unauthorized`);
    }

    let companyId: string;
    try {
        companyId = decrypt(state);
    } catch {
        return NextResponse.redirect(`${settingsUrl}&wa=error&reason=invalid_state`);
    }

    if (session.user.companyId !== companyId) {
        return NextResponse.redirect(`${settingsUrl}&wa=error&reason=company_mismatch`);
    }

    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;
    const redirectUri = `${baseUrl}/api/auth/meta/whatsapp/callback`;

    try {
        // Step 1: Exchange code for token
        const tokenRes = await fetch(
            `${META_GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
        );
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('[WhatsApp OAuth] Token exchange failed:', tokenData);
            return NextResponse.redirect(`${settingsUrl}&wa=error&reason=token_failed`);
        }

        // Step 2: Exchange for long-lived token
        const longTokenRes = await fetch(
            `${META_GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
        );
        const longTokenData = await longTokenRes.json();
        const accessToken = longTokenData.access_token || tokenData.access_token;

        // Step 3: Find WABA via debug_token
        const debugRes = await fetch(
            `${META_GRAPH}/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
        );
        const debugData = await debugRes.json();

        // debug_token returns WABA IDs in granular_scopes (NOT phone number IDs)
        let wabaId: string | null = null;

        const granularScopes = debugData?.data?.granular_scopes || [];
        for (const scope of granularScopes) {
            if (scope.scope === 'whatsapp_business_management' && scope.target_ids?.length > 0) {
                wabaId = scope.target_ids[0];
                break;
            }
        }

        // If no WABA from debug_token, try listing businesses
        if (!wabaId) {
            const bizRes = await fetch(`${META_GRAPH}/me/businesses?access_token=${accessToken}`);
            const bizData = await bizRes.json();

            if (bizData.data?.length > 0) {
                for (const biz of bizData.data) {
                    const wabaRes = await fetch(
                        `${META_GRAPH}/${biz.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`
                    );
                    const wabaData = await wabaRes.json();
                    if (wabaData.data?.length > 0) {
                        wabaId = wabaData.data[0].id;
                        break;
                    }
                }
            }
        }

        if (!wabaId) {
            return NextResponse.redirect(`${settingsUrl}&wa=error&reason=no_waba`);
        }

        // Get phone numbers from WABA (this is the REAL phone number ID)
        let phoneNumberId: string | null = null;
        const phonesRes = await fetch(
            `${META_GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`
        );
        const phonesData = await phonesRes.json();
        if (phonesData.data?.length > 0) {
            phoneNumberId = phonesData.data[0].id;
        }

        if (!phoneNumberId) {
            return NextResponse.redirect(`${settingsUrl}&wa=error&reason=no_phone`);
        }

        // Step 6: Get phone display name
        let phoneDisplay = '';
        if (phoneNumberId) {
            try {
                const phoneRes = await fetch(
                    `${META_GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
                );
                const phoneInfo = await phoneRes.json();
                phoneDisplay = phoneInfo.display_phone_number || phoneInfo.verified_name || '';
            } catch { /* ignore */ }
        }

        // Step 7: Subscribe WABA to webhooks
        if (wabaId) {
            await fetch(`${META_GRAPH}/${wabaId}/subscribed_apps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: accessToken }),
            }).catch(() => {});
        }

        // Step 8: Generate verify token and save
        const verifyToken = 'varylo_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);

        const configJson = {
            phoneNumberId,
            accessToken,
            appSecret,
            verifyToken,
            wabaId,
            phoneDisplay,
            connectedAt: new Date().toISOString(),
            connectedBy: session.user.email,
        };

        const existingChannel = await prisma.channel.findFirst({
            where: { companyId, type: ChannelType.WHATSAPP },
        });

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id },
                data: { status: 'CONNECTED', configJson },
            });
        } else {
            await prisma.channel.create({
                data: {
                    companyId,
                    type: ChannelType.WHATSAPP,
                    status: 'CONNECTED',
                    configJson,
                },
            });
        }

        return NextResponse.redirect(`${settingsUrl}&wa=connected&phone=${encodeURIComponent(phoneDisplay)}`);
    } catch (err) {
        console.error('[WhatsApp OAuth] Error:', err);
        return NextResponse.redirect(`${settingsUrl}&wa=error&reason=internal`);
    }
}
