import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import { readChannelSecret } from '@/lib/channel-config';

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

    const accessToken = readChannelSecret(config?.accessToken);
    if (!accessToken) {
        return NextResponse.json({ ...results, error: 'No access token' });
    }
    results.connectionMode = config?.connectionMode || 'unknown';

    // Check 0: Token scopes via debug_token
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (appId && appSecret) {
        try {
            const dbgRes = await fetch(
                `${META_GRAPH}/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
            );
            const dbgData = await dbgRes.json();
            results.tokenInfo = {
                app_id: dbgData?.data?.app_id,
                user_id: dbgData?.data?.user_id,
                expires_at: dbgData?.data?.expires_at,
                data_access_expires_at: dbgData?.data?.data_access_expires_at,
                scopes: dbgData?.data?.scopes,
                granular_scopes: dbgData?.data?.granular_scopes,
                is_valid: dbgData?.data?.is_valid,
            };
        } catch (e: any) {
            results.tokenInfoError = e.message;
        }
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

    // Check 1.5: Phone number details (status, registration)
    if (config?.phoneNumberId) {
        try {
            const pRes = await fetch(
                `${META_GRAPH}/${config.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,account_mode,name_status,platform_type,throughput,messaging_limit_tier&access_token=${accessToken}`
            );
            const pData = await pRes.json();
            results.phoneDetail = pData;
        } catch (e: any) {
            results.phoneDetailError = e.message;
        }

        // Check 1.6: Try to register the phone (idempotent if already registered)
        try {
            const regRes = await fetch(`${META_GRAPH}/${config.phoneNumberId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    pin: '123456',
                    access_token: accessToken,
                }),
            });
            const regData = await regRes.json();
            results.registerAttempt = regData;
        } catch (e: any) {
            results.registerError = e.message;
        }
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

    // Check 5: List phone numbers from WABA
    if (config.wabaId) {
        try {
            const phonesRes = await fetch(`${META_GRAPH}/${config.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&access_token=${accessToken}`);
            const phonesData = await phonesRes.json();
            results.phoneNumbers = phonesData;

            // If we found phones and the stored phoneNumberId is wrong, show the correct one
            if (phonesData.data?.length > 0) {
                const correctPhoneId = phonesData.data[0].id;
                results.correctPhoneNumberId = correctPhoneId;
                results.storedPhoneNumberIdMatches = config.phoneNumberId === correctPhoneId;
            }
        } catch (e: any) {
            results.phonesError = e.message;
        }
    }

    return NextResponse.json(results, { status: 200 });
}
