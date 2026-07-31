import Image from 'next/image';
import Link from 'next/link';
import { getDictionary, Locale } from '@/lib/dictionary';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function RegisterPage({
    params,
}: {
    params: Promise<{ lang: Locale }>;
}) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.register;

    const panel = d.panel;

    return (
        <div className="flex min-h-screen">
            {/* Left panel — dark emerald gradient */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-12 text-white overflow-hidden">
                {/* Grid overlay */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
                <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-emerald-400/15 blur-[120px]" />

                {/* Top — logo */}
                <div className="relative z-10">
                    <Image src="/logo.png" alt="Varylo" width={160} height={90} className="brightness-0 invert" priority />
                </div>

                {/* Center — plan info */}
                <div className="relative z-10 space-y-6">
                    <h1 className="text-3xl font-bold leading-tight">{panel.headline}</h1>

                    {/* Features */}
                    <div className="space-y-3">
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

            {/* Right panel — wizard */}
            <div className="relative flex flex-1 items-center justify-center bg-white px-6 py-12">
                <div className="absolute top-4 right-4">
                    <LanguageSwitcher />
                </div>
                <div className="w-full max-w-lg">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center mb-6">
                        <Image src="/logo.png" alt="Varylo" width={140} height={79} priority />
                    </div>

                    {/* Registro cerrado por deprecación de la herramienta */}
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <h2 className="text-lg font-semibold">Registro cerrado</h2>
                        </div>
                        <p className="text-sm text-red-800">
                            Ya no aceptamos nuevas cuentas. Esta herramienta será deprecada el{' '}
                            <strong>31 de agosto de 2026</strong>; los usuarios actuales tendrán
                            acceso a sus chats hasta el <strong>29 de septiembre de 2026</strong>.
                        </p>
                        <p className="text-sm text-red-800">
                            Si ya tienes una cuenta, puedes{' '}
                            <Link href={`/${lang}/login`} className="font-medium underline">
                                iniciar sesión aquí
                            </Link>
                            .
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
