import Link from 'next/link';
import LoginForm from './login-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function LoginPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.login;
    const panel = d.panel;

    const channels = [
        { color: '#25D366', emoji: '💬' },
        { color: '#E1306C', emoji: '📸' },
        { color: '#0084FF', emoji: '🌐' },
    ];

    return (
        <div className="flex min-h-screen bg-black">
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800;900&display=swap"
                rel="stylesheet"
            />

            {/* ── Left editorial panel ── */}
            <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden bg-black">
                {/* Grid texture */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
                {/* Glow blobs */}
                <div className="pointer-events-none absolute -bottom-32 -left-24 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
                <div className="pointer-events-none absolute top-10 right-0 h-[280px] w-[280px] rounded-full bg-emerald-500/06 blur-[100px]" />

                {/* Logo */}
                <Link href={`/${lang}`} className="relative z-10 inline-block">
                    <span
                        className="text-2xl font-black text-white tracking-tight select-none"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                        Varylo
                    </span>
                </Link>

                {/* Center copy */}
                <div className="relative z-10 space-y-10">
                    {/* Channel pills */}
                    <div className="flex items-center gap-2">
                        {channels.map(({ color, emoji }, i) => (
                            <span
                                key={i}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border"
                                style={{ background: `${color}18`, borderColor: `${color}35` }}
                            >
                                {emoji}
                            </span>
                        ))}
                        <span
                            className="text-[11px] font-semibold uppercase tracking-[.18em] text-white/30 ml-1"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                            {'Plataforma omnicanal'}
                        </span>
                    </div>

                    {/* Headline */}
                    <div>
                        <h1
                            className="font-black uppercase leading-[.88] text-white"
                            style={{
                                fontFamily: 'Outfit, sans-serif',
                                fontSize: 'clamp(2.8rem, 4.5vw, 5rem)',
                                letterSpacing: '-.04em',
                            }}
                        >
                            {panel.headline}
                        </h1>
                        <p
                            className="mt-4 text-white/35 text-base leading-relaxed"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                            {panel.subheadline}
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-3.5">
                        {panel.features.map((feature: string, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="h-px w-5 bg-emerald-500/50 shrink-0" />
                                <span
                                    className="text-sm text-white/45 leading-snug"
                                    style={{ fontFamily: 'Inter, sans-serif' }}
                                >
                                    {feature}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <p
                    className="relative z-10 text-[11px] text-white/15"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                >
                    © {new Date().getFullYear()} Varylo. Todos los derechos reservados.
                </p>
            </div>

            {/* ── Right form panel ── */}
            <div className="relative flex flex-1 items-center justify-center bg-[#060606] px-6 py-12 border-l border-white/[0.05]">
                {/* Noise texture */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px',
                    }}
                />

                {/* Language switcher */}
                <div className="absolute top-5 right-5">
                    <LanguageSwitcher />
                </div>

                <div className="w-full max-w-sm space-y-8" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center mb-2">
                        <span
                            className="text-2xl font-black text-white tracking-tight"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                            Varylo
                        </span>
                    </div>

                    {/* Heading */}
                    <div>
                        <h2 className="text-[22px] font-bold text-white">{d.title}</h2>
                        <p className="mt-1.5 text-sm text-white/35">{d.subtitle}</p>
                    </div>

                    <LoginForm dict={d} lang={lang} />

                    <p className="text-sm text-white/25 text-center">
                        {d.noAccount}{' '}
                        <Link
                            href={`/${lang}/register`}
                            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                        >
                            {d.register}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
