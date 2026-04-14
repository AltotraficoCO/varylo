import Link from 'next/link';
import LoginForm from './login-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function LoginPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.login;

    const conversations = [
        {
            name: 'María García',
            initials: 'MG',
            msg: 'Hola, necesito información sobre los planes...',
            time: '2m',
            channel: '#25D366',
            unread: 2,
        },
        {
            name: 'Carlos López',
            initials: 'CL',
            msg: '¿Cuánto cuesta el plan Pro? Quiero actualizar',
            time: '18m',
            channel: '#E1306C',
            unread: 1,
        },
        {
            name: 'Ana Martínez',
            initials: 'AM',
            msg: 'Perfecto, muchas gracias por la ayuda ✓',
            time: '1h',
            channel: '#3B82F6',
            unread: 0,
        },
        {
            name: 'Pedro Ramírez',
            initials: 'PR',
            msg: 'Necesito soporte con mi pedido #4821',
            time: '2h',
            channel: '#25D366',
            unread: 0,
        },
    ];

    return (
        <div className="flex min-h-screen">
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800&display=swap"
                rel="stylesheet"
            />

            {/* ── Left panel: product preview ── */}
            <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden bg-[#0C0F0E]">
                {/* Emerald glow */}
                <div className="pointer-events-none absolute bottom-0 left-0 h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-[130px]" />
                <div className="pointer-events-none absolute top-0 right-0 h-[250px] w-[250px] rounded-full bg-emerald-500/5 blur-[80px]" />

                {/* Logo */}
                <Link href={`/${lang}`} className="relative z-10">
                    <span
                        className="text-xl font-black text-white tracking-tight"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                        Varylo
                    </span>
                </Link>

                {/* Inbox preview */}
                <div className="relative z-10 space-y-5">
                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30"
                                style={{ fontFamily: 'Inter, sans-serif' }}>
                                Bandeja de entrada
                            </span>
                        </div>
                        <p className="text-[13px] text-white/20" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {conversations.filter(c => c.unread > 0).length} conversaciones sin atender
                        </p>
                    </div>

                    {/* Conversation cards */}
                    <div className="space-y-2">
                        {conversations.map((conv, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
                                style={{
                                    background: conv.unread > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
                                    borderColor: conv.unread > 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)',
                                }}
                            >
                                {/* Avatar */}
                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white/60 shrink-0"
                                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    {conv.initials}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[13px] font-semibold truncate"
                                            style={{ color: conv.unread > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif' }}>
                                            {conv.name}
                                        </p>
                                        <span className="text-[11px] text-white/20 shrink-0">{conv.time}</span>
                                    </div>
                                    <p className="text-[12px] truncate mt-0.5"
                                        style={{ color: conv.unread > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}>
                                        {conv.msg}
                                    </p>
                                </div>
                                {/* Channel dot + unread */}
                                <div className="flex flex-col items-center gap-1.5 shrink-0">
                                    <div className="w-2 h-2 rounded-full" style={{ background: conv.channel }} />
                                    {conv.unread > 0 && (
                                        <span className="text-[10px] font-bold bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                            {conv.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
                        {[
                            { value: '1.2K', label: 'Conversaciones' },
                            { value: '8',   label: 'Agentes activos' },
                            { value: '98%', label: 'Satisfacción' },
                        ].map((s) => (
                            <div key={s.label} className="text-center">
                                <p className="text-[18px] font-bold text-white/70" style={{ fontFamily: 'Outfit, sans-serif' }}>{s.value}</p>
                                <p className="text-[11px] text-white/25 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <p className="relative z-10 text-[11px] text-white/15" style={{ fontFamily: 'Inter, sans-serif' }}>
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
