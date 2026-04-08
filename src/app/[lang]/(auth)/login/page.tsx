import Image from 'next/image';
import Link from 'next/link';
import LoginForm from './login-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { CheckCircle2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function LoginPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.login;
    const panel = d.panel;

    return (
        <div className="flex min-h-screen">
            {/* Left panel — emerald gradient (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 p-12 text-white overflow-hidden">
                {/* Subtle grid overlay */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
                {/* Glow */}
                <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-emerald-400/20 blur-[120px]" />

                {/* Top — logo */}
                <div className="relative z-10">
                    <Image src="/logo.png" alt="Varylo" width={160} height={90} className="brightness-0 invert" priority />
                </div>

                {/* Center — headline + features */}
                <div className="relative z-10 space-y-8">
                    <div>
                        <h1 className="text-3xl xl:text-4xl font-bold leading-tight">{panel.headline}</h1>
                        <p className="mt-3 text-emerald-200/80 text-lg">{panel.subheadline}</p>
                    </div>

                    {/* Glassmorphism card */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-6 space-y-4">
                        {panel.features.map((feature: string, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                                <span className="text-sm text-emerald-100">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom — copyright */}
                <p className="relative z-10 text-xs text-emerald-300/50">
                    &copy; {new Date().getFullYear()} Varylo. Todos los derechos reservados.
                </p>
            </div>

            {/* Right panel — white form */}
            <div className="relative flex flex-1 items-center justify-center bg-white px-6 py-12">
                <div className="absolute top-4 right-4">
                    <LanguageSwitcher />
                </div>
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center mb-4">
                        <Image src="/logo.png" alt="Varylo" width={140} height={79} priority />
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{d.title}</h2>
                        <p className="mt-2 text-sm text-gray-500">{d.subtitle}</p>
                    </div>

                    <LoginForm dict={d} lang={lang} />

                    <p className="text-center text-sm text-gray-500">
                        {d.noAccount}{' '}
                        <Link href={`/${lang}/register`} className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                            {d.register}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
