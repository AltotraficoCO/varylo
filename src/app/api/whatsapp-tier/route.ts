import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const channel = await prisma.channel.findFirst({
    where: {
      companyId: session.user.companyId,
      type: ChannelType.WHATSAPP,
      status: 'CONNECTED',
    },
  });

  if (!channel?.configJson) {
    return NextResponse.json({ error: 'No WhatsApp channel' }, { status: 404 });
  }

  const config = channel.configJson as {
    phoneNumberId?: string;
    accessToken?: string;
  };

  if (!config.phoneNumberId || !config.accessToken) {
    return NextResponse.json({ error: 'Incomplete config' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}?fields=messaging_limit_tier,quality_rating,display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (data as any)?.error?.message || `HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
