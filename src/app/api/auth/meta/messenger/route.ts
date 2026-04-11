import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { encrypt } from '@/lib/encryption';

/**
 * GET /api/auth/meta/messenger
 * Initiates Facebook OAuth flow for Messenger integration.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = process.env.META_APP_ID;
    if (!appId) {
        return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 500 });
    }

    const baseUrl = process.env.AUTH_URL || req.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/meta/messenger/callback`;
    const state = encrypt(session.user.companyId);

    const scopes = [
        'pages_show_list',
        'pages_messaging',
        'pages_manage_metadata',
    ].join(',');

    const loginUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    loginUrl.searchParams.set('client_id', appId);
    loginUrl.searchParams.set('redirect_uri', redirectUri);
    loginUrl.searchParams.set('scope', scopes);
    loginUrl.searchParams.set('state', state);
    loginUrl.searchParams.set('response_type', 'code');

    return NextResponse.redirect(loginUrl.toString());
}
