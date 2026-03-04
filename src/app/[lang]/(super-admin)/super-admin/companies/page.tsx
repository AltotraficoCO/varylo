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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"
import { EditCompanyDialog } from './edit-company-dialog';
import { CreateCompanyDialog } from './create-company-dialog';

const SUB_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ACTIVE: { label: 'Activa', variant: 'default' },
    TRIAL: { label: 'Prueba', variant: 'secondary' },
    PAST_DUE: { label: 'Pago pendiente', variant: 'destructive' },
    CANCELLED: { label: 'Cancelada', variant: 'outline' },
};

export default async function CompaniesPage() {
    const companies = await prisma.company.findMany({
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
        orderBy: {
            createdAt: 'desc',
        }
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Empresas Registradas</CardTitle>
                    <CardDescription>Gestión de todas las empresas en la plataforma.</CardDescription>
                </div>
                <CreateCompanyDialog />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Suscripción</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Usuarios</TableHead>
                            <TableHead>Créditos</TableHead>
                            <TableHead>Fecha Registro</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {companies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                                    No hay empresas registradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            companies.map((company) => (
                                <TableRow key={company.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        {company.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{company.plan}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {company.subscriptions[0] ? (() => {
                                            const sub = company.subscriptions[0];
                                            const s = SUB_STATUS_LABELS[sub.status] || SUB_STATUS_LABELS.ACTIVE;
                                            return (
                                                <div className="flex flex-col gap-0.5">
                                                    <Badge variant={s.variant} className="text-xs w-fit">{s.label}</Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {sub.planPricing.landingPlan.name}
                                                    </span>
                                                </div>
                                            );
                                        })() : (
                                            <span className="text-xs text-muted-foreground">Sin suscripción</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={company.status === 'ACTIVE' ? 'default' : 'destructive'}>
                                            {company.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{company.users.length}</TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(company.creditBalance)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(company.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <EditCompanyDialog company={company} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
