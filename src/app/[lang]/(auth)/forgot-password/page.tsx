import Image from 'next/image';
import Link from 'next/link';
import ForgotPasswordForm from './forgot-password-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function ForgotPasswordPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.forgotPassword;

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
                    <ForgotPasswordForm dict={d} lang={lang} />
                    <p className="text-center text-sm text-gray-500">
                        <Link href={`/${lang}/login`} className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                            {d.backToLogin}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
