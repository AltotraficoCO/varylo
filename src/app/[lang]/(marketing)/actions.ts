'use server';

import { prisma } from '@/lib/prisma';
import { sendContactNotificationEmail } from '@/lib/email';

export async function submitContact(prevState: unknown, formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !message) {
        return { success: false, message: 'All fields are required.' };
    }

    try {
        await prisma.contactLead.create({
            data: {
                name,
                email,
                message
            }
        });
    } catch (error) {
        console.error('Error saving contact lead:', error);
        return { success: false, message: 'Failed to send message.' };
    }

    try {
        await sendContactNotificationEmail(name, email, message);
    } catch (error) {
        console.error('Error sending contact notification email:', error);
    }

    return { success: true, message: 'Message sent!' };
}
