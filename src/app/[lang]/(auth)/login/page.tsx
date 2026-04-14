import Link from 'next/link';
import LoginForm from './login-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function LoginPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.login;

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800&display=swap"
                rel="stylesheet"
            />

            {/* Top bar */}
            <header className="flex items-center justify-between px-6 py-5">
                <Link href={`/${lang}`}>
                    <span
                        className="text-xl font-black text-[#09090B] tracking-tight"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                        Varylo
                    </span>
                </Link>
                <LanguageSwitcher />
            </header>

            {/* Center content */}
            <div className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-[400px]" style={{ fontFamily: 'Inter, sans-serif' }}>

                    {/* Logo mark */}
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#10B981] mb-5">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 6h6v6H4V6z" fill="white" fillOpacity=".9" />
                                <path d="M10 6h10v2H10V6z" fill="white" fillOpacity=".5" />
                                <path d="M10 10h6v2h-6v-2z" fill="white" fillOpacity=".5" />
                                <path d="M4 14h16v2H4v-2z" fill="white" fillOpacity=".7" />
                                <path d="M4 18h10v2H4v-2z" fill="white" fillOpacity=".4" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-[#09090B]">{d.title}</h1>
                        <p className="mt-1.5 text-[14px] text-[#71717A]">{d.subtitle}</p>
                    </div>

                    {/* Form card */}
                    <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-sm px-7 py-7">
                        <LoginForm dict={d} lang={lang} />
                    </div>

                    {/* Register link */}
                    <p className="mt-6 text-center text-[13px] text-[#71717A]">
                        {d.noAccount}{' '}
                        <Link
                            href={`/${lang}/register`}
                            className="text-[#10B981] hover:text-[#059669] font-medium transition-colors"
                        >
                            {d.register}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
