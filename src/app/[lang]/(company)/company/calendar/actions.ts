'use server';

import { auth } from '@/auth';
import { getAccessTokenForCompany, listEvents, createEvent, updateEvent, type CalendarEvent } from '@/lib/google-calendar';

const TIMEZONE = 'America/Bogota';

export async function getCalendarEvents(start: string, end: string) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado', events: [] };

    try {
        const accessToken = await getAccessTokenForCompany(session.user.companyId);
        const events = await listEvents(accessToken, 'primary', start, end);
        return {
            success: true,
            events: events.map(e => ({
                id: e.id,
                title: e.summary || '(Sin titulo)',
                start: e.start?.dateTime || '',
                end: e.end?.dateTime || '',
                description: e.description || '',
                attendees: e.attendees?.map(a => a.email) || [],
            })),
        };
    } catch (error: any) {
        console.error('[Calendar] Failed to fetch events:', error.message);
        return { success: false, error: error.message, events: [] };
    }
}

export async function createCalendarEvent(data: {
    title: string;
    start: string;
    end: string;
    description?: string;
    attendeeEmail?: string;
}) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado' };

    try {
        const accessToken = await getAccessTokenForCompany(session.user.companyId);
        const event: CalendarEvent = {
            summary: data.title,
            start: { dateTime: data.start, timeZone: TIMEZONE },
            end: { dateTime: data.end, timeZone: TIMEZONE },
        };
        if (data.description) event.description = data.description;
        if (data.attendeeEmail) event.attendees = [{ email: data.attendeeEmail }];

        const created = await createEvent(accessToken, 'primary', event);
        return {
            success: true,
            event: {
                id: created.id,
                title: created.summary,
                start: created.start?.dateTime,
                end: created.end?.dateTime,
            },
        };
    } catch (error: any) {
        console.error('[Calendar] Failed to create event:', error.message);
        return { success: false, error: error.message };
    }
}

export async function updateCalendarEvent(eventId: string, data: {
    title?: string;
    start?: string;
    end?: string;
    description?: string;
}) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'No autorizado' };

    try {
        const accessToken = await getAccessTokenForCompany(session.user.companyId);
        const updates: Partial<CalendarEvent> = {};
        if (data.title) updates.summary = data.title;
        if (data.start) updates.start = { dateTime: data.start, timeZone: TIMEZONE };
        if (data.end) updates.end = { dateTime: data.end, timeZone: TIMEZONE };
        if (data.description !== undefined) updates.description = data.description;

        await updateEvent(accessToken, 'primary', eventId, updates);
        return { success: true };
    } catch (error: any) {
        console.error('[Calendar] Failed to update event:', error.message);
        return { success: false, error: error.message };
    }
}
