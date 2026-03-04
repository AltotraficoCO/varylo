import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    Users,
    MessageSquare,
    CreditCard,
    TrendingUp,
    ArrowUpRight,
    Activity,
    Zap,
} from 'lucide-react';
import Link from 'next/link';

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

export default async function SuperAdminDashboard({
    params,
}: {
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const stats = await getStats();

    const statCards = [
        {
            title: 'Empresas',
            value: stats.totalCompanies,
            subtitle: `${stats.activeCompanies} activas`,
            icon: Building2,
            href: `/${lang}/super-admin/companies`,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            title: 'Usuarios',
            value: stats.totalUsers,
            subtitle: 'registrados',
            icon: Users,
            href: `/${lang}/super-admin/companies`,
            color: 'text-violet-600 bg-violet-50',
        },
        {
            title: 'Conversaciones',
            value: formatNumber(stats.totalConversations),
            subtitle: `${formatNumber(stats.totalMessages)} mensajes`,
            icon: MessageSquare,
            href: `/${lang}/super-admin/analytics`,
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            title: 'Créditos en circulación',
            value: formatCOP(stats.totalCredits),
            subtitle: 'balance total',
            icon: CreditCard,
            href: `/${lang}/super-admin/billing`,
            color: 'text-amber-600 bg-amber-50',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Panel de Control</h2>
                <p className="text-muted-foreground">
                    Resumen general de la plataforma Varylo.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Link key={card.title} href={card.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                                <div className={`p-2 rounded-lg ${card.color}`}>
                                    <card.icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {typeof card.value === 'number' ? card.value.toLocaleString('es-CO') : card.value}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    {card.subtitle}
                                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                {/* Recent Companies */}
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Empresas recientes</CardTitle>
                        <Link
                            href={`/${lang}/super-admin/companies`}
                            className="text-sm text-primary hover:underline"
                        >
                            Ver todas
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {stats.recentCompanies.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No hay empresas registradas aún.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentCompanies.map((company: any) => (
                                    <div
                                        key={company.id}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                                                {company.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{company.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {company._count.users} usuario{company._count.users !== 1 ? 's' : ''} &middot;{' '}
                                                    {new Date(company.createdAt).toLocaleDateString('es-CO')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={PLAN_COLORS[company.plan] || 'outline'}>
                                                {company.plan}
                                            </Badge>
                                            <div
                                                className={`h-2 w-2 rounded-full ${
                                                    company.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">Acciones rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {[
                            {
                                label: 'Gestionar empresas',
                                desc: 'Crear, editar y administrar empresas',
                                href: `/${lang}/super-admin/companies`,
                                icon: Building2,
                            },
                            {
                                label: 'Planes y pagos',
                                desc: 'Configurar planes y Wompi',
                                href: `/${lang}/super-admin/billing`,
                                icon: CreditCard,
                            },
                            {
                                label: 'Analíticas',
                                desc: 'Métricas de uso de la plataforma',
                                href: `/${lang}/super-admin/analytics`,
                                icon: Activity,
                            },
                            {
                                label: 'Sitio Web',
                                desc: 'Favicon, footer y landing page',
                                href: `/${lang}/super-admin/site-settings`,
                                icon: Zap,
                            },
                        ].map((action) => (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                            >
                                <div className="p-2 rounded-md bg-muted group-hover:bg-background transition-colors">
                                    <action.icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{action.label}</p>
                                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
