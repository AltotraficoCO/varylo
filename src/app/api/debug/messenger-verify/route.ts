import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.MESSENGER_VERIFY_TOKEN;
    return NextResponse.json({
        set: !!token,
        length: token?.length ?? 0,
        preview: token ? token.substring(0, 6) + '...' : null,
        mode: req.nextUrl.searchParams.get('hub.mode'),
        receivedToken: req.nextUrl.searchParams.get('hub.verify_token'),
        match: token === req.nextUrl.searchParams.get('hub.verify_token'),
    });
}
