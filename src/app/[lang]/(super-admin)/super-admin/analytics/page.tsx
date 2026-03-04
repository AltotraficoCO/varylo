import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('es-CO');
}

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount);
}

async function safeCount(fn: () => Promise<number>): Promise<number> {
    try { return await fn(); } catch { return 0; }
}

async function getAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        totalCompanies,
        totalUsers,
        totalConversations,
        totalMessages,
        totalContacts,
        totalChannels,
        totalAiAgents,
        totalChatbots,
        newCompanies30d,
        newUsers30d,
        newConversations7d,
        newMessages7d,
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

    // Plan distribution
    let planDistribution: { plan: string; _count: number }[] = [];
    try {
        const raw = await prisma.company.groupBy({
            by: ['plan'],
            _count: true,
            orderBy: { _count: { plan: 'desc' } },
        });
        planDistribution = raw.map(r => ({ plan: r.plan, _count: r._count }));
    } catch { /* ok */ }

    // Top companies by conversations
    let topCompanies: { name: string; count: number }[] = [];
    try {
        const companies = await prisma.company.findMany({
            select: {
                name: true,
                _count: { select: { conversations: true } },
            },
            orderBy: { conversations: { _count: 'desc' } },
            take: 5,
        });
        topCompanies = companies.map(c => ({ name: c.name, count: c._count.conversations }));
    } catch { /* ok */ }

    return {
        totalCompanies, totalUsers, totalConversations, totalMessages,
        totalContacts, totalChannels, totalAiAgents, totalChatbots,
        newCompanies30d, newUsers30d, newConversations7d, newMessages7d,
        totalCredits, totalAiUsageCost,
        planDistribution, topCompanies,
    };
}

const PLAN_COLORS: Record<string, string> = {
    STARTER: 'bg-slate-100 text-slate-700',
    PRO: 'bg-blue-100 text-blue-700',
    SCALE: 'bg-violet-100 text-violet-700',
};

export default async function AnalyticsPage() {
    const data = await getAnalytics();

    const mainStats = [
        { title: 'Empresas', value: data.totalCompanies, delta: `+${data.newCompanies30d} (30d)`, icon: Building2, color: 'text-blue-600 bg-blue-50' },
        { title: 'Usuarios', value: data.totalUsers, delta: `+${data.newUsers30d} (30d)`, icon: Users, color: 'text-violet-600 bg-violet-50' },
        { title: 'Conversaciones', value: data.totalConversations, delta: `+${data.newConversations7d} (7d)`, icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50' },
        { title: 'Mensajes', value: data.totalMessages, delta: `+${formatNumber(data.newMessages7d)} (7d)`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    ];

    const platformStats = [
        { title: 'Contactos', value: data.totalContacts, icon: Hash },
        { title: 'Canales', value: data.totalChannels, icon: Activity },
        { title: 'Agentes IA', value: data.totalAiAgents, icon: Sparkles },
        { title: 'Chatbots', value: data.totalChatbots, icon: Bot },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Analíticas</h2>
                <p className="text-muted-foreground">
                    Métricas de uso y rendimiento de la plataforma.
                </p>
            </div>

            {/* Main stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {mainStats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.color}`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatNumber(stat.value)}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.delta}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Platform resources */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recursos de la plataforma</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {platformStats.map((stat) => (
                            <div key={stat.title} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-md bg-muted">
                                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm">{stat.title}</span>
                                </div>
                                <span className="font-semibold text-sm">{formatNumber(stat.value)}</span>
                            </div>
                        ))}
                        <div className="border-t pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Créditos en circulación</span>
                                <span className="font-semibold text-sm">{formatCOP(data.totalCredits)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Gasto IA acumulado</span>
                                <span className="font-semibold text-sm">{formatCOP(data.totalAiUsageCost)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Plan distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Distribución por plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.planDistribution.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
                        ) : (
                            <div className="space-y-4">
                                {data.planDistribution.map((item) => {
                                    const pct = data.totalCompanies > 0
                                        ? Math.round((item._count / data.totalCompanies) * 100)
                                        : 0;
                                    return (
                                        <div key={item.plan} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={PLAN_COLORS[item.plan] || ''} variant="secondary">
                                                        {item.plan}
                                                    </Badge>
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {item._count} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
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
                    </CardContent>
                </Card>

                {/* Top companies */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top empresas por conversaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.topCompanies.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
                        ) : (
                            <div className="space-y-3">
                                {data.topCompanies.map((company, idx) => (
                                    <div key={company.name} className="flex items-center gap-3">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{company.name}</p>
                                        </div>
                                        <span className="text-sm text-muted-foreground font-mono">
                                            {formatNumber(company.count)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
