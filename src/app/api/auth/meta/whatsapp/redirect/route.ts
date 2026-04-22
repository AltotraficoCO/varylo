import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { encrypt } from '@/lib/encryption';

/**
 * GET /api/auth/meta/whatsapp/redirect
 * Initiates Facebook OAuth flow for WhatsApp Business integration.
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
    const redirectUri = `${baseUrl}/api/auth/meta/whatsapp/callback`;
    const state = encrypt(session.user.companyId);

    const scopes = [
        'whatsapp_business_management',
        'whatsapp_business_messaging',
        'business_management',
    ].join(',');

    const loginUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    loginUrl.searchParams.set('client_id', appId);
    loginUrl.searchParams.set('redirect_uri', redirectUri);
    loginUrl.searchParams.set('scope', scopes);
    loginUrl.searchParams.set('state', state);
    loginUrl.searchParams.set('response_type', 'code');

    return NextResponse.redirect(loginUrl.toString());
}
