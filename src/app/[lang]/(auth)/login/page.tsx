import Link from 'next/link';
import LoginForm from './login-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LoginPreview } from './login-preview';

export default async function LoginPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.login;

    return (
        <div className="flex min-h-screen">
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800&display=swap"
                rel="stylesheet"
            />

            {/* ── Left panel: interactive chat preview ── */}
            <div className="hidden lg:flex lg:w-[46%] relative flex-col p-12 overflow-hidden bg-[#0C0F0E]">
                {/* Emerald glows */}
                <div className="pointer-events-none absolute bottom-0 left-0 h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-[130px]" />
                <div className="pointer-events-none absolute top-0 right-0 h-[250px] w-[250px] rounded-full bg-emerald-500/5 blur-[80px]" />

                {/* Logo */}
                <Link href={`/${lang}`} className="relative z-10 shrink-0">
                    <span
                        className="text-xl font-black text-white tracking-tight"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                        Varylo
                    </span>
                </Link>

                {/* Chat simulation — takes all middle space */}
                <div className="relative z-10 flex-1 flex flex-col py-8 min-h-0">
                    <LoginPreview />
                </div>

                {/* Footer */}
                <p className="relative z-10 shrink-0 text-[11px] text-white/15" style={{ fontFamily: 'Inter, sans-serif' }}>
                    © {new Date().getFullYear()} Varylo
                </p>
            </div>

            {/* ── Right panel: form ── */}
            <div className="relative flex flex-1 items-center justify-center bg-[#FAFAFA] px-6 py-12 border-l border-[#E4E4E7]">
                <div className="absolute top-5 right-5">
                    <LanguageSwitcher />
                </div>

                <div className="w-full max-w-[380px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <span className="text-2xl font-black text-[#09090B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Varylo
                        </span>
                    </div>

                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#10B981] mb-5">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M4 6h6v6H4V6z" fill="white" fillOpacity=".9" />
                                <path d="M10 6h10v2H10V6z" fill="white" fillOpacity=".5" />
                                <path d="M10 10h6v2h-6v-2z" fill="white" fillOpacity=".5" />
                                <path d="M4 14h16v2H4v-2z" fill="white" fillOpacity=".7" />
                                <path d="M4 18h10v2H4v-2z" fill="white" fillOpacity=".4" />
                            </svg>
                        </div>
                        <h1 className="text-[22px] font-bold text-[#09090B]">{d.title}</h1>
                        <p className="mt-1 text-sm text-[#71717A]">{d.subtitle}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-sm px-6 py-6">
                        <LoginForm dict={d} lang={lang} />
                    </div>

                    <p className="mt-5 text-center text-[13px] text-[#71717A]">
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
