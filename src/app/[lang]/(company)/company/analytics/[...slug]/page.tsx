import { getDictionary, Locale } from '@/lib/dictionary';

export default async function AnalyticsStubPage({ params }: { params: Promise<{ slug: string[]; lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const tc = dict.dashboard.common;
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <h3 className="text-xl font-medium">{tc.comingSoon}</h3>
            <p>{tc.comingSoonDesc}</p>
        </div>
    );
}
