import { prisma } from '@/lib/prisma';
import { Badge } from "@/components/ui/badge"
import { Building2, Users, CheckCircle2, UserCircle2 } from "lucide-react"
import { EditCompanyDialog } from './edit-company-dialog';
import { CreateCompanyDialog } from './create-company-dialog';
import { ensureTablesExist } from './actions';
import { getDictionary, Locale } from '@/lib/dictionary';

const PLAN_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
    STARTER: 'outline',
    PRO: 'default',
    SCALE: 'secondary',
};

const SUB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    ACTIVE:    { label: 'Activa',          className: 'bg-[#ECFDF5] text-[#10B981]' },
    TRIAL:     { label: 'Prueba',          className: 'bg-amber-50 text-amber-600' },
    PAST_DUE:  { label: 'Pago pendiente',  className: 'bg-red-50 text-red-500' },
    CANCELLED: { label: 'Cancelada',       className: 'bg-[#F4F4F5] text-[#71717A]' },
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-[28px] font-bold text-foreground">{t.title}</h1>
                    <p className="text-sm text-muted-foreground">{t.subtitle}</p>
                </div>
                <CreateCompanyDialog />
            </div>

            {/* Summary stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="bg-card rounded-xl border p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[13px] text-[#71717A]">{t.totalCompanies}</p>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-[32px] font-bold text-foreground leading-none">{totalCompanies}</p>
                </div>
                <div className="bg-card rounded-xl border p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[13px] text-[#71717A]">{t.activeCompanies}</p>
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-[32px] font-bold text-foreground leading-none">{activeCompanies}</p>
                </div>
                <div className="bg-card rounded-xl border p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[13px] text-[#71717A]">{t.totalUsers}</p>
                        <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-[32px] font-bold text-foreground leading-none">{totalUsers}</p>
                </div>
            </div>

            {/* Companies list */}
            <div className="bg-card rounded-xl border overflow-x-auto">
              <div className="min-w-[560px]">
                {/* List header */}
                <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-[#F4F4F5] dark:border-[#27272A]">
                    <p className="text-[13px] font-medium text-[#71717A]">{t.company}</p>
                    <p className="text-[13px] font-medium text-[#71717A] hidden sm:block w-28 text-center">{t.subscription}</p>
                    <p className="text-[13px] font-medium text-[#71717A] w-20 text-center">{t.plan}</p>
                    <p className="text-[13px] font-medium text-[#71717A] w-24 text-right">{t.actions}</p>
                </div>

                {companies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <Building2 className="h-6 w-6 text-muted-foreground opacity-50" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">{t.noCompanies}</p>
                        <p className="text-[13px] text-muted-foreground">Usa el botón &quot;Nueva Empresa&quot; para crear una.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                        {companies.map((company) => {
                            const sub = company.subscriptions?.[0];
                            const subCfg = sub ? SUB_STATUS_CONFIG[sub.status] : null;
                            const userCount = company.users?.length || 0;
                            const daysLeft = sub?.currentPeriodEnd
                                ? Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                : null;

                            return (
                                <div
                                    key={company.id}
                                    className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5"
                                >
                                    {/* Company info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                                            {company.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {company.name}
                                                </p>
                                                <div
                                                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                                        company.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'
                                                    }`}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                                                <UserCircle2 className="h-3 w-3" />
                                                <span>{userCount} {userCount === 1 ? 'usuario' : 'usuarios'}</span>
                                                <span>·</span>
                                                <span>{new Date(company.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subscription status */}
                                    <div className="hidden sm:flex flex-col items-center gap-1 w-28">
                                        {subCfg ? (
                                            <>
                                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${subCfg.className}`}>
                                                    {subCfg.label}
                                                </span>
                                                {daysLeft !== null && (
                                                    <span className={`text-[11px] ${daysLeft <= 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                                        {daysLeft > 0 ? `${daysLeft}d restantes` : 'Vencida'}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin suscripción</span>
                                        )}
                                    </div>

                                    {/* Plan badge */}
                                    <div className="flex justify-center w-20">
                                        <Badge variant={PLAN_COLORS[company.plan] || 'outline'} className="text-xs">
                                            {company.plan}
                                        </Badge>
                                    </div>

                                    {/* Action */}
                                    <div className="flex justify-end w-24">
                                        <EditCompanyDialog company={company} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>
            </div>
        </div>
    );
}
