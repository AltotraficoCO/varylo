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

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' }> = {
    ACTIVE: { label: 'Activa', variant: 'default' },
    SUSPENDED: { label: 'Suspendida', variant: 'destructive' },
};

const PLAN_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
    STARTER: 'outline',
    PRO: 'default',
    SCALE: 'secondary',
};

const SUB_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ACTIVE: { label: 'Activa', variant: 'default' },
    TRIAL: { label: 'Prueba', variant: 'secondary' },
    PAST_DUE: { label: 'Pago pendiente', variant: 'destructive' },
    CANCELLED: { label: 'Cancelada', variant: 'outline' },
};

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default async function CompaniesPage() {
    let companies: any[] = [];
    try {
        companies = await prisma.company.findMany({
            include: {
                users: true,
                subscriptions: {
                    where: { status: { in: ['ACTIVE', 'PAST_DUE', 'TRIAL'] } },
                    take: 1,
                    include: {
                        planPricing: {
                            include: { landingPlan: { select: { name: true } } },
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
                    <h2 className="text-2xl font-bold tracking-tight">Empresas</h2>
                    <p className="text-muted-foreground">
                        Gestión de todas las empresas en la plataforma.
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
                            <p className="text-xs text-muted-foreground">Total empresas</p>
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
                            <p className="text-xs text-muted-foreground">Activas</p>
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
                            <p className="text-xs text-muted-foreground">Usuarios totales</p>
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
                                <TableHead>Empresa</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead className="hidden md:table-cell">Suscripción</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="hidden sm:table-cell">Usuarios</TableHead>
                                <TableHead className="hidden lg:table-cell">Créditos</TableHead>
                                <TableHead className="hidden lg:table-cell">Registro</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        No hay empresas registradas.
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
                                                {subStatus ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <Badge variant={subStatus.variant} className="text-xs w-fit">
                                                            {subStatus.label}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {sub.planPricing?.landingPlan?.name || '-'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Sin suscripción</span>
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
                                                {new Date(company.createdAt).toLocaleDateString('es-CO')}
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
