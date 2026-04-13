import { getDictionary, Locale } from '@/lib/dictionary';
import { prisma } from '@/lib/prisma';
import { LandingClient } from './landing-client';

export default async function LandingPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    let plans: Awaited<ReturnType<typeof prisma.landingPlan.findMany>> = [];
    try {
        plans = await prisma.landingPlan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    } catch { /* Table may not exist yet — fall back to dictionary */ }

    let logos: { id: string; name: string; imageUrl: string }[] = [];
    try {
        logos = await prisma.trustedLogo.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    } catch {}

    return (
        <LandingClient
            lang={lang}
            d={dict.landing}
            dict={dict}
            plans={plans}
            logos={logos}
        />
    );
}
