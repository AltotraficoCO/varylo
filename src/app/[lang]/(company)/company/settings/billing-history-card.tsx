'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type BillingAttemptRow = {
    id: string;
    amountInCents: number;
    currency: string;
    status: string;
    attemptNumber: number;
    createdAt: string;
    subscription: {
        planPricing: {
            landingPlan: { name: string };
        };
    };
};

function formatCOP(cents: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(cents / 100);
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    APPROVED: { label: 'Aprobado', variant: 'default' },
    PENDING: { label: 'Pendiente', variant: 'secondary' },
    DECLINED: { label: 'Rechazado', variant: 'destructive' },
    ERROR: { label: 'Error', variant: 'destructive' },
    VOIDED: { label: 'Anulado', variant: 'outline' },
};

export function BillingHistoryCard({ attempts }: { attempts: BillingAttemptRow[] }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    <CardTitle>Historial de Facturación</CardTitle>
                </div>
                <CardDescription>Tus cobros recientes de suscripción.</CardDescription>
            </CardHeader>
            <CardContent>
                {attempts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No hay cobros registrados aún.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Intento</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attempts.map((a) => {
                                const status = STATUS_BADGE[a.status] || STATUS_BADGE.PENDING;
                                return (
                                    <TableRow key={a.id}>
                                        <TableCell className="text-sm">
                                            {new Date(a.createdAt).toLocaleDateString('es-CO')}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {a.subscription.planPricing.landingPlan.name}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {formatCOP(a.amountInCents)}
                                        </TableCell>
                                        <TableCell className="text-sm">#{a.attemptNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
