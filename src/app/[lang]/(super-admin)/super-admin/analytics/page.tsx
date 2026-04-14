import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    Users,
    MessageSquare,
    TrendingUp,
    Bot,
    Sparkles,
    Hash,
    Activity,
    Coins,
    BarChart3,
} from 'lucide-react';
import { getDictionary, Locale } from '@/lib/dictionary';

async function safeCount(fn: () => Promise<number>): Promise<number> {
    try { return await fn(); } catch { return 0; }
}

async function getAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        totalCompanies, totalUsers, totalConversations, totalMessages,
        totalContacts, totalChannels, totalAiAgents, totalChatbots,
        newCompanies30d, newUsers30d, newConversations7d, newMessages7d,
    ] = await Promise.all([
        safeCount(() => prisma.company.count()),
        safeCount(() => prisma.user.count()),
        safeCount(() => prisma.conversation.count()),
        safeCount(() => prisma.message.count()),
        safeCount(() => prisma.contact.count()),
        safeCount(() => prisma.channel.count()),
        safeCount(() => prisma.aiAgent.count()),
        safeCount(() => prisma.chatbot.count()),
        safeCount(() => prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } })),
        safeCount(() => prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } })),
        safeCount(() => prisma.conversation.count({ where: { createdAt: { gte: sevenDaysAgo } } })),
        safeCount(() => prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo } } })),
    ]);

    let totalCredits = 0;
    let totalAiUsageCost = 0;
    try {
        const creditsAgg = await prisma.company.aggregate({ _sum: { creditBalance: true } });
        totalCredits = creditsAgg._sum.creditBalance || 0;
    } catch { /* ok */ }
    try {
        const aiAgg = await prisma.aiUsageLog.aggregate({ _sum: { costCop: true } });
        totalAiUsageCost = aiAgg._sum.costCop || 0;
    } catch { /* ok */ }

    let planDistribution: { plan: string; _count: number }[] = [];
    try {
        const raw = await prisma.company.groupBy({
            by: ['plan'],
            _count: true,
            orderBy: { _count: { plan: 'desc' } },
        });
        planDistribution = raw.map(r => ({ plan: r.plan, _count: r._count }));
    } catch { /* ok */ }

    let topCompanies: { name: string; count: number }[] = [];
    try {
        const companies = await prisma.company.findMany({
            select: { name: true, _count: { select: { conversations: true } } },
            orderBy: { conversations: { _count: 'desc' } },
            take: 5,
        });
        topCompanies = companies.map(c => ({ name: c.name, count: c._count.conversations }));
    } catch { /* ok */ }

    return {
        totalCompanies, totalUsers, totalConversations, totalMessages,
        totalContacts, totalChannels, totalAiAgents, totalChatbots,
        newCompanies30d, newUsers30d, newConversations7d, newMessages7d,
        totalCredits, totalAiUsageCost, planDistribution, topCompanies,
    };
}

const PLAN_COLORS: Record<string, string> = {
    STARTER: 'bg-slate-100 text-slate-600',
    PRO:     'bg-blue-100 text-blue-700',
    SCALE:   'bg-violet-100 text-violet-700',
};

export default async function AnalyticsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const t = dict.dashboard.superAdminAnalytics;
    const tc = dict.dashboard.common;
    const locale = tc.locale || 'es-CO';

    function fmt(n: number): string {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
        return n.toLocaleString(locale);
    }
    function fmtCOP(amount: number): string {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    }

    const data = await getAnalytics();

    // Main KPIs
    const kpis = [
        { title: t.companies,     value: data.totalCompanies,    delta: `+${data.newCompanies30d} ${t.last30d}`,            icon: Building2,    iconClass: 'text-blue-600 bg-blue-50' },
        { title: t.users,         value: data.totalUsers,        delta: `+${data.newUsers30d} ${t.last30d}`,                icon: Users,        iconClass: 'text-violet-600 bg-violet-50' },
        { title: t.conversations, value: data.totalConversations,delta: `+${data.newConversations7d} ${t.last7d}`,          icon: MessageSquare, iconClass: 'text-emerald-600 bg-emerald-50' },
        { title: t.messagesLabel, value: data.totalMessages,     delta: `+${fmt(data.newMessages7d)} ${t.last7d}`,          icon: TrendingUp,   iconClass: 'text-amber-600 bg-amber-50' },
    ];

    // Platform resources
    const resources = [
        { title: t.contacts,  value: data.totalContacts,  icon: Hash,     iconClass: 'text-sky-600 bg-sky-50' },
        { title: t.channels,  value: data.totalChannels,  icon: Activity, iconClass: 'text-emerald-600 bg-emerald-50' },
        { title: t.aiAgents,  value: data.totalAiAgents,  icon: Sparkles, iconClass: 'text-violet-600 bg-violet-50' },
        { title: t.chatbots,  value: data.totalChatbots,  icon: Bot,      iconClass: 'text-amber-600 bg-amber-50' },
    ];

    const maxConversations = data.topCompanies[0]?.count || 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-[28px] font-bold text-foreground">{t.title}</h1>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => (
                    <div key={kpi.title} className="bg-card rounded-xl border p-5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] text-[#71717A]">{kpi.title}</p>
                            <div className={`p-2 rounded-lg ${kpi.iconClass}`}>
                                <kpi.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-[32px] font-bold text-foreground leading-none">{fmt(kpi.value)}</p>
                        <p className="text-xs text-[#71717A]">{kpi.delta}</p>
                    </div>
                ))}
            </div>

            {/* Bottom section: 2 columns */}
            <div className="grid gap-6 lg:grid-cols-3">

                {/* Left: Platform + Financials (takes 2 cols) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Platform resources - mini grid */}
                    <div>
                        <h2 className="text-sm font-semibold text-foreground mb-3">{t.platformResources}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {resources.map((r) => (
                                <div key={r.title} className="bg-card rounded-xl border p-4 flex flex-col gap-3">
                                    <div className={`p-2 rounded-lg w-fit ${r.iconClass}`}>
                                        <r.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[22px] font-bold text-foreground leading-none">{fmt(r.value)}</p>
                                        <p className="text-[12px] text-[#71717A] mt-1">{r.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial summary */}
                    <div>
                        <h2 className="text-sm font-semibold text-foreground mb-3">Resumen financiero</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                                    <Coins className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[13px] text-[#71717A]">{t.circulatingCredits}</p>
                                    <p className="text-lg font-bold text-foreground">{fmtCOP(data.totalCredits)}</p>
                                </div>
                            </div>
                            <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-violet-50 text-violet-600">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[13px] text-[#71717A]">{t.accumulatedAiSpend}</p>
                                    <p className="text-lg font-bold text-foreground">{fmtCOP(data.totalAiUsageCost)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Plan distribution + Top companies */}
                <div className="space-y-6">

                    {/* Plan distribution */}
                    <div className="bg-card rounded-xl border overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#F4F4F5] dark:border-[#27272A]">
                            <h2 className="text-sm font-semibold text-foreground">{t.distributionByPlan}</h2>
                        </div>
                        <div className="p-5">
                            {data.planDistribution.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">{t.noData}</p>
                            ) : (
                                <div className="space-y-4">
                                    {data.planDistribution.map((item) => {
                                        const pct = data.totalCompanies > 0
                                            ? Math.round((item._count / data.totalCompanies) * 100)
                                            : 0;
                                        return (
                                            <div key={item.plan} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[item.plan] || 'bg-muted text-muted-foreground'}`}>
                                                        {item.plan}
                                                    </span>
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {item._count} <span className="text-[#71717A] font-normal text-xs">({pct}%)</span>
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-primary transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top companies */}
                    <div className="bg-card rounded-xl border overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#F4F4F5] dark:border-[#27272A]">
                            <h2 className="text-sm font-semibold text-foreground">{t.topCompaniesByConv}</h2>
                        </div>
                        {data.topCompanies.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                                {t.noData}
                            </div>
                        ) : (
                            <div className="p-5 space-y-3">
                                {data.topCompanies.map((company, idx) => {
                                    const barWidth = Math.round((company.count / maxConversations) * 100);
                                    return (
                                        <div key={company.name} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[11px] font-bold text-[#71717A] w-4 shrink-0">#{idx + 1}</span>
                                                    <p className="text-[13px] font-medium text-foreground truncate">{company.name}</p>
                                                </div>
                                                <span className="text-[13px] font-semibold text-foreground shrink-0 ml-2">
                                                    {fmt(company.count)}
                                                </span>
                                            </div>
                                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-primary/40 transition-all"
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
