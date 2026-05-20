'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData
) {
    const rawLang = formData.get('lang');
    const lang = rawLang === 'en' ? 'en' : 'es';
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: `/${lang}/dashboard`,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            if (error.cause?.err?.message === 'COMPANY_SUSPENDED') {
                return 'Tu cuenta ha sido suspendida. Contacta a soporte en hello@varylo.app';
            }
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}
