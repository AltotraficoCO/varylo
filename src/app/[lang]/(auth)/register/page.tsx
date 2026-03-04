import Image from 'next/image';
import { getDictionary, Locale } from '@/lib/dictionary';
import { prisma } from '@/lib/prisma';
import { fetchUsdToCop } from '@/lib/exchange-rate';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { RegisterWizard } from './register-wizard';

export default async function RegisterPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: Locale }>;
    searchParams: Promise<{ plan?: string }>;
}) {
    const { lang } = await params;
    const { plan } = await searchParams;
    const dict = await getDictionary(lang);
    const d = dict.auth.register;

    const validPlans = ['STARTER', 'PRO', 'SCALE'];
    const selectedPlanSlug = plan && validPlans.includes(plan.toUpperCase()) ? plan.toUpperCase() : 'STARTER';

    // Fetch ALL active PlanPricing records
    let availablePlans: { id: string; slug: string; name: string; priceInCents: number; trialDays: number }[] = [];

    try {
        const pricings = await prisma.planPricing.findMany({
            where: { active: true },
            include: { landingPlan: { select: { name: true, slug: true, sortOrder: true, showTrialOnRegister: true, price: true } } },
            orderBy: { landingPlan: { sortOrder: 'asc' } },
        });

        // If any plan uses auto TRM, fetch exchange rate server-side
        const needsTrm = pricings.some((p) => p.useAutoTrm);
        const trm = needsTrm ? await fetchUsdToCop() : 0;

        availablePlans = pricings.map((p) => ({
            id: p.id,
            slug: p.landingPlan.slug,
            name: p.landingPlan.name,
            priceInCents: p.useAutoTrm
                ? Math.round(p.landingPlan.price * trm * 100)
                : p.priceInCents,
            trialDays: p.landingPlan.showTrialOnRegister ? p.trialDays : 0,
        }));
    } catch {
        // PlanPricing may not exist yet
    }

    // Max trial days across plans for left panel badge
    const maxTrialDays = Math.max(0, ...availablePlans.map((p) => p.trialDays));

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

                    {/* Trial badge */}
                    {maxTrialDays > 0 && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-4 py-1.5 text-sm font-medium text-emerald-300">
                            <Sparkles className="h-4 w-4" />
                            {panel.trialBadge.replace('{days}', String(maxTrialDays))}
                        </div>
                    )}

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
            <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
                <div className="w-full max-w-lg">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center mb-6">
                        <Image src="/logo.png" alt="Varylo" width={140} height={79} priority />
                    </div>

                    <RegisterWizard
                        dict={d}
                        lang={lang}
                        availablePlans={availablePlans}
                        defaultPlanSlug={selectedPlanSlug}
                    />
                </div>
            </div>
        </div>
    );
}
