import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * POST /api/debug/whatsapp/fix
 * Fixes the phoneNumberId by fetching the correct one from the WABA.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channel = await prisma.channel.findFirst({
        where: { companyId: session.user.companyId, type: ChannelType.WHATSAPP },
    });

    if (!channel) {
        return NextResponse.json({ error: 'No WhatsApp channel' }, { status: 404 });
    }

    const config = channel.configJson as any;
    if (!config?.wabaId || !config?.accessToken) {
        return NextResponse.json({ error: 'Missing WABA ID or token' }, { status: 400 });
    }

    // Get correct phone number from WABA
    const phonesRes = await fetch(
        `${META_GRAPH}/${config.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${config.accessToken}`
    );
    const phonesData = await phonesRes.json();

    if (!phonesData.data?.length) {
        return NextResponse.json({ error: 'No phone numbers found in WABA' }, { status: 404 });
    }

    const phone = phonesData.data[0];

    // Update the channel config with correct phoneNumberId
    await prisma.channel.update({
        where: { id: channel.id },
        data: {
            configJson: {
                ...config,
                phoneNumberId: phone.id,
                phoneDisplay: phone.display_phone_number || phone.verified_name,
            },
        },
    });

    return NextResponse.json({
        success: true,
        fixed: {
            oldPhoneNumberId: config.phoneNumberId,
            newPhoneNumberId: phone.id,
            phoneDisplay: phone.display_phone_number,
        },
    });
}
