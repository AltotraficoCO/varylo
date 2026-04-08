import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
];

function getRedirectUri(): string {
    const base = process.env.AUTH_URL || 'http://localhost:3000';
    return `${base}/api/auth/google-calendar/callback`;
}

export function getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: getRedirectUri(),
        response_type: 'code',
        scope: SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
}> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirect_uri: getRedirectUri(),
            grant_type: 'authorization_code',
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google token exchange failed: ${err}`);
    }

    return res.json();
}

export async function refreshAccessToken(encryptedRefreshToken: string): Promise<string> {
    const refreshToken = decrypt(encryptedRefreshToken);

    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            grant_type: 'refresh_token',
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google token refresh failed: ${err}`);
    }

    const data = await res.json();
    return data.access_token as string;
}

export async function getAccessTokenForCompany(companyId: string): Promise<string> {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { googleCalendarRefreshToken: true },
    });

    if (!company?.googleCalendarRefreshToken) {
        throw new Error('Google Calendar not connected for this company');
    }

    return refreshAccessToken(company.googleCalendarRefreshToken);
}

export async function getGoogleEmail(accessToken: string): Promise<string> {
    const res = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch Google user info');
    }

    const data = await res.json();
    return data.email as string;
}

export function encryptRefreshToken(token: string): string {
    return encrypt(token);
}

// --- Calendar API operations ---

export interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: { email: string }[];
}

export async function listEvents(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string,
): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
    });

    const res = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google Calendar listEvents failed: ${err}`);
    }

    const data = await res.json();
    return (data.items || []) as CalendarEvent[];
}

export async function checkAvailability(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string,
): Promise<{ busy: boolean; busySlots: { start: string; end: string }[] }> {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            timeMin,
            timeMax,
            items: [{ id: calendarId }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google Calendar freeBusy failed: ${err}`);
    }

    const data = await res.json();
    const busySlots = data.calendars?.[calendarId]?.busy || [];
    return { busy: busySlots.length > 0, busySlots };
}

export async function createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent,
): Promise<CalendarEvent> {
    const res = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        },
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google Calendar createEvent failed: ${err}`);
    }

    return res.json();
}

export async function updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
): Promise<CalendarEvent> {
    const res = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        },
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google Calendar updateEvent failed: ${err}`);
    }

    return res.json();
}
