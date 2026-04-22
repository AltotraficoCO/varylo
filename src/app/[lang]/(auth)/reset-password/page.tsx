import Image from 'next/image';
import Link from 'next/link';
import ResetPasswordForm from './reset-password-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function ResetPasswordPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: Locale }>;
    searchParams: Promise<{ token?: string }>;
}) {
    const { lang } = await params;
    const { token } = await searchParams;
    const dict = await getDictionary(lang);
    const d = dict.auth.resetPassword;

    if (!token) {
        return (
            <div className="relative flex min-h-screen items-center justify-center bg-white px-6 py-12">
                <div className="absolute top-4 right-4">
                    <LanguageSwitcher />
                </div>
                <div className="w-full max-w-md space-y-6">
                    <div className="flex justify-center mb-4">
                        <Image src="/logo.png" alt="Varylo" width={140} height={79} priority />
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{d.title}</h2>
                            <p className="mt-2 text-sm text-red-500">{d.invalidToken}</p>
                        </div>
                        <p className="text-center text-sm text-gray-500">
                            <Link href={`/${lang}/forgot-password`} className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                                {dict.auth.forgotPassword.backToLogin}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-white px-6 py-12">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md space-y-6">
                <div className="flex justify-center mb-4">
                    <Image src="/logo.png" alt="Varylo" width={140} height={79} priority />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{d.title}</h2>
                        <p className="mt-2 text-sm text-gray-500">{d.subtitle}</p>
                    </div>
                    <ResetPasswordForm dict={d} token={token} lang={lang} />
                </div>
            </div>
        </div>
    );
}
