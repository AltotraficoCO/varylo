import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens, getGoogleEmail, encryptRefreshToken } from '@/lib/google-calendar';
import { decrypt } from '@/lib/encryption';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000';
    const settingsUrl = `${baseUrl}/company/settings?tab=ai`;

    if (error) {
        console.error('[Google Calendar OAuth] Error from Google:', error);
        return NextResponse.redirect(`${settingsUrl}&gcal=error`);
    }

    if (!code || !state) {
        return NextResponse.redirect(`${settingsUrl}&gcal=error`);
    }

    try {
        // Verify user is authenticated
        const session = await auth();
        if (!session?.user?.companyId) {
            return NextResponse.redirect(`${settingsUrl}&gcal=error`);
        }

        // state = encrypted companyId
        const companyId = decrypt(state);

        // Verify the authenticated user belongs to the company in the state
        if (session.user.companyId !== companyId) {
            console.warn('[Google Calendar OAuth] Company mismatch: session vs state');
            return NextResponse.redirect(`${settingsUrl}&gcal=error`);
        }

        // Verify company exists
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true },
        });

        if (!company) {
            return NextResponse.redirect(`${settingsUrl}&gcal=error`);
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);

        if (!tokens.refresh_token) {
            console.error('[Google Calendar OAuth] No refresh_token received');
            return NextResponse.redirect(`${settingsUrl}&gcal=error`);
        }

        // Get Google email
        const email = await getGoogleEmail(tokens.access_token);

        // Encrypt and store refresh token
        const encryptedToken = encryptRefreshToken(tokens.refresh_token);

        await prisma.company.update({
            where: { id: companyId },
            data: {
                googleCalendarRefreshToken: encryptedToken,
                googleCalendarEmail: email,
                googleCalendarConnectedAt: new Date(),
            },
        });

        return NextResponse.redirect(`${settingsUrl}&gcal=connected`);
    } catch (err) {
        console.error('[Google Calendar OAuth] Callback error:', err);
        return NextResponse.redirect(`${settingsUrl}&gcal=error`);
    }
}
