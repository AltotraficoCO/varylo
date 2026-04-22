import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    Users,
    MessageSquare,
    CreditCard,
    Activity,
    Zap,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { getDictionary, Locale } from '@/lib/dictionary';

async function getStats() {
    try {
        const [
            totalCompanies,
            activeCompanies,
            totalUsers,
            totalConversations,
            totalMessages,
            recentCompanies,
        ] = await Promise.all([
            prisma.company.count(),
            prisma.company.count({ where: { status: 'ACTIVE' } }),
            prisma.user.count(),
            prisma.conversation.count().catch(() => 0),
            prisma.message.count().catch(() => 0),
            prisma.company.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    plan: true,
                    status: true,
                    createdAt: true,
                    _count: { select: { users: true } },
                },
            }),
        ]);

        let totalCredits = 0;
        try {
            const result = await prisma.company.aggregate({ _sum: { creditBalance: true } });
            totalCredits = result._sum.creditBalance || 0;
        } catch { /* table may not exist */ }

        return {
            totalCompanies,
            activeCompanies,
            totalUsers,
            totalConversations,
            totalMessages,
            totalCredits,
            recentCompanies,
        };
    } catch {
        return {
            totalCompanies: 0,
            activeCompanies: 0,
            totalUsers: 0,
            totalConversations: 0,
            totalMessages: 0,
            totalCredits: 0,
            recentCompanies: [],
        };
    }
}

const PLAN_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
    STARTER: 'outline',
    PRO: 'default',
    SCALE: 'secondary',
};

function formatNumber(n: number, locale: string): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString(locale);
}

function formatCOP(amount: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default async function SuperAdminDashboard({
    params,
}: {
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const t = dict.dashboard.superAdminHome;
    const tc = dict.dashboard.common;
    const locale = tc.locale || 'es-CO';
    const stats = await getStats();

    const statCards = [
        {
            title: t.companies,
            value: stats.totalCompanies,
            subtitle: t.nActive.replace('{n}', String(stats.activeCompanies)),
            icon: Building2,
            href: `/${lang}/super-admin/companies`,
            iconClass: 'text-blue-600 bg-blue-50',
        },
        {
            title: t.users,
            value: stats.totalUsers,
            subtitle: t.registered,
            icon: Users,
            href: `/${lang}/super-admin/companies`,
            iconClass: 'text-violet-600 bg-violet-50',
        },
        {
            title: t.conversations,
            value: formatNumber(stats.totalConversations, locale),
            subtitle: t.nMessages.replace('{n}', formatNumber(stats.totalMessages, locale)),
            icon: MessageSquare,
            href: `/${lang}/super-admin/analytics`,
            iconClass: 'text-emerald-600 bg-emerald-50',
        },
        {
            title: t.circulatingCredits,
            value: formatCOP(stats.totalCredits, locale),
            subtitle: t.totalBalance,
            icon: CreditCard,
            href: `/${lang}/super-admin/billing`,
            iconClass: 'text-amber-600 bg-amber-50',
        },
    ];

    const quickActions = [
        {
            label: t.manageCompanies,
            desc: t.manageCompaniesDesc,
            href: `/${lang}/super-admin/companies`,
            icon: Building2,
            iconClass: 'bg-blue-50 text-blue-600',
        },
        {
            label: t.plansAndPayments,
            desc: t.plansAndPaymentsDesc,
            href: `/${lang}/super-admin/billing`,
            icon: CreditCard,
            iconClass: 'bg-amber-50 text-amber-600',
        },
        {
            label: t.analyticsAction,
            desc: t.analyticsActionDesc,
            href: `/${lang}/super-admin/analytics`,
            icon: Activity,
            iconClass: 'bg-violet-50 text-violet-600',
        },
        {
            label: t.websiteAction,
            desc: t.websiteActionDesc,
            href: `/${lang}/super-admin/site-settings`,
            icon: Zap,
            iconClass: 'bg-emerald-50 text-emerald-600',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-[28px] font-bold text-foreground">{t.controlPanel}</h1>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Link key={card.title} href={card.href}>
                        <div className="bg-card rounded-xl border p-5 space-y-2.5 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center justify-between">
                                <p className="text-[13px] text-[#71717A]">{card.title}</p>
                                <div className={`p-2 rounded-lg ${card.iconClass}`}>
                                    <card.icon className="h-4 w-4" />
                                </div>
                            </div>
                            <p className="text-[32px] font-bold text-foreground leading-none">
                                {typeof card.value === 'number'
                                    ? card.value.toLocaleString(locale)
                                    : card.value}
                            </p>
                            <p className="text-xs text-[#71717A]">{card.subtitle}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                {/* Recent Companies */}
                <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">{t.recentCompanies}</h2>
                        <Link
                            href={`/${lang}/super-admin/companies`}
                            className="text-sm text-primary hover:underline"
                        >
                            {t.viewAll}
                        </Link>
                    </div>
                    <div className="bg-card rounded-xl border overflow-hidden">
                        {stats.recentCompanies.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                                {t.noCompaniesYet}
                            </div>
                        ) : (
                            <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                                {stats.recentCompanies.map((company: any) => {
                                    const userCount = company._count.users;
                                    const usersText =
                                        userCount !== 1
                                            ? t.nUsersPlural.replace('{n}', String(userCount))
                                            : t.nUsers.replace('{n}', String(userCount));
                                    return (
                                        <div
                                            key={company.id}
                                            className="flex items-center gap-4 px-5 py-4"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                                                {company.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {company.name}
                                                </p>
                                                <p className="text-[13px] text-muted-foreground">
                                                    {usersText} &middot;{' '}
                                                    {new Date(company.createdAt).toLocaleDateString(locale)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={PLAN_COLORS[company.plan] || 'outline'}>
                                                    {company.plan}
                                                </Badge>
                                                <div
                                                    className={`h-2 w-2 rounded-full ${
                                                        company.status === 'ACTIVE'
                                                            ? 'bg-emerald-500'
                                                            : 'bg-red-400'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-semibold text-foreground mb-4">{t.quickActions}</h2>
                    <div className="bg-card rounded-xl border overflow-hidden">
                        <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                            {quickActions.map((action) => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
                                >
                                    <div className={`p-2 rounded-lg ${action.iconClass}`}>
                                        <action.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {action.label}
                                        </p>
                                        <p className="text-[13px] text-muted-foreground">
                                            {action.desc}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
