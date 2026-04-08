import { prisma } from '@/lib/prisma';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, MessageSquare } from "lucide-react"
import { EditCompanyDialog } from './edit-company-dialog';
import { CreateCompanyDialog } from './create-company-dialog';
import { ensureTablesExist } from './actions';
import { getDictionary, Locale } from '@/lib/dictionary';

const PLAN_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
    STARTER: 'outline',
    PRO: 'default',
    SCALE: 'secondary',
};

export default async function CompaniesPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const t = dict.dashboard.companiesAdmin;
    const tc = dict.dashboard.common;
    const locale = tc.locale || 'es-CO';

    function formatCOP(amount: number): string {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    }

    const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' }> = {
        ACTIVE: { label: tc.active, variant: 'default' },
        SUSPENDED: { label: tc.suspended, variant: 'destructive' },
    };

    const SUB_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        ACTIVE: { label: t.subStatusActive, variant: 'default' },
        TRIAL: { label: t.subStatusTrial, variant: 'secondary' },
        PAST_DUE: { label: t.subStatusPending, variant: 'destructive' },
        CANCELLED: { label: t.subStatusCancelled, variant: 'outline' },
    };
    // Ensure all subscription tables/columns exist before querying
    await ensureTablesExist();

    let companies: any[] = [];
    try {
        companies = await prisma.company.findMany({
            include: {
                users: true,
                subscriptions: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        planPricing: {
                            include: { landingPlan: { select: { name: true, slug: true } } },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    } catch {
        try {
            companies = (await prisma.company.findMany({
                include: { users: true },
                orderBy: { createdAt: 'desc' },
            })).map(c => ({ ...c, subscriptions: [] }));
        } catch {
            companies = [];
        }
    }

    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => c.status === 'ACTIVE').length;
    const totalUsers = companies.reduce((sum, c) => sum + (c.users?.length || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t.title}</h2>
                    <p className="text-muted-foreground">
                        {t.subtitle}
                    </p>
                </div>
                <CreateCompanyDialog />
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalCompanies}</p>
                            <p className="text-xs text-muted-foreground">{t.totalCompanies}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{activeCompanies}</p>
                            <p className="text-xs text-muted-foreground">{t.activeCompanies}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                        <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalUsers}</p>
                            <p className="text-xs text-muted-foreground">{t.totalUsers}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Companies Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.company}</TableHead>
                                <TableHead>{t.plan}</TableHead>
                                <TableHead className="hidden md:table-cell">{t.subscription}</TableHead>
                                <TableHead>{t.status}</TableHead>
                                <TableHead className="hidden sm:table-cell">{t.usersCol}</TableHead>
                                <TableHead className="hidden lg:table-cell">{t.creditsCol}</TableHead>
                                <TableHead className="hidden lg:table-cell">{t.registration}</TableHead>
                                <TableHead className="text-right">{t.actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        {t.noCompanies}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                companies.map((company) => {
                                    const sub = company.subscriptions?.[0];
                                    const subStatus = sub ? SUB_STATUS_LABELS[sub.status] : null;
                                    return (
                                        <TableRow key={company.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                                                        {company.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium">{company.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={PLAN_COLORS[company.plan] || 'outline'}>
                                                    {company.plan}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {sub ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <Badge variant={subStatus?.variant || 'outline'} className="text-xs w-fit">
                                                            {subStatus?.label || sub.status}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {sub.planPricing?.landingPlan?.name || '-'}
                                                        </span>
                                                        {sub.currentPeriodEnd && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {(() => {
                                                                    const daysLeft = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                                    return daysLeft > 0
                                                                        ? t.nDaysLeft.replace('{n}', String(daysLeft))
                                                                        : t.expired;
                                                                })()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">{t.noSubscription}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${company.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                                    <span className="text-sm">
                                                        {STATUS_MAP[company.status]?.label || company.status}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                {company.users?.length || 0}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell font-mono text-sm">
                                                {formatCOP(company.creditBalance)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                                {new Date(company.createdAt).toLocaleDateString(locale)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <EditCompanyDialog company={company} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
