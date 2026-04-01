import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { ChannelType } from '@prisma/client';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * POST /api/auth/meta/whatsapp
 * Receives the code from WhatsApp Embedded Signup (client-side),
 * exchanges it for a token, fetches WABA + phone info, saves channel.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const { code } = await req.json();

    if (!code) {
        return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;

    try {
        // Step 1: Exchange code for business token
        const tokenRes = await fetch(
            `${META_GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`
        );
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('[WhatsApp Signup] Token exchange failed:', tokenData);
            return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
        }

        const accessToken = tokenData.access_token;

        // Step 2: Get shared WABA IDs from debug_token or business info
        // First, try to get the user's businesses
        const bizRes = await fetch(
            `${META_GRAPH}/me?fields=id,name&access_token=${accessToken}`
        );
        const bizData = await bizRes.json();

        // Step 3: Find WhatsApp Business Account
        // Use the token to list WABAs the user has access to
        const wabaRes = await fetch(
            `${META_GRAPH}/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
        );
        const wabaDebug = await wabaRes.json();

        // Extract WABA ID and phone number ID from granted scopes/granular_scopes
        let wabaId: string | null = null;
        let phoneNumberId: string | null = null;

        // The debug_token response contains granular scopes with the shared WABA
        const granularScopes = wabaDebug?.data?.granular_scopes || [];
        for (const scope of granularScopes) {
            if (scope.scope === 'whatsapp_business_management' && scope.target_ids?.length > 0) {
                wabaId = scope.target_ids[0];
            }
            if (scope.scope === 'whatsapp_business_messaging' && scope.target_ids?.length > 0) {
                phoneNumberId = scope.target_ids[0];
            }
        }

        // Step 4: If we have WABA ID, get phone numbers
        if (wabaId && !phoneNumberId) {
            const phonesRes = await fetch(
                `${META_GRAPH}/${wabaId}/phone_numbers?access_token=${accessToken}`
            );
            const phonesData = await phonesRes.json();
            if (phonesData.data?.length > 0) {
                phoneNumberId = phonesData.data[0].id;
            }
        }

        if (!phoneNumberId) {
            return NextResponse.json({
                error: 'No se encontró un número de WhatsApp. Completa el registro en el popup.',
            }, { status: 400 });
        }

        // Step 5: Get phone number details
        let phoneDisplay = '';
        try {
            const phoneInfoRes = await fetch(
                `${META_GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
            );
            const phoneInfo = await phoneInfoRes.json();
            phoneDisplay = phoneInfo.display_phone_number || phoneInfo.verified_name || phoneNumberId;
        } catch {
            phoneDisplay = phoneNumberId;
        }

        // Step 6: Register the phone number for cloud API (if not already)
        await fetch(`${META_GRAPH}/${phoneNumberId}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                pin: '123456', // Default PIN, user can change later
                access_token: accessToken,
            }),
        }).catch(() => {}); // Ignore if already registered

        // Step 7: Subscribe the WABA to webhooks
        if (wabaId) {
            await fetch(`${META_GRAPH}/${wabaId}/subscribed_apps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: accessToken }),
            }).catch(() => {});
        }

        // Step 8: Generate verify token
        const verifyToken = 'varylo_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);

        // Step 9: Save or update channel
        const configJson = {
            phoneNumberId,
            accessToken: encrypt(accessToken),
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

        return NextResponse.json({
            success: true,
            phoneDisplay,
            wabaId,
        });
    } catch (err) {
        console.error('[WhatsApp Signup] Error:', err);
        return NextResponse.json({ error: 'Error interno al conectar WhatsApp' }, { status: 500 });
    }
}
