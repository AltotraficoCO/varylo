'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cancelMySubscription, subscribeToPlan } from './billing-actions';
import { useDictionary } from '@/lib/i18n-context';

type ActiveSubscription = {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelledAt: string | null;
    planPricing: {
        landingPlan: { name: string; slug: string };
    };
    paymentSource: { brand: string | null; lastFour: string | null };
} | null;

type AvailablePlan = {
    id: string;
    priceInCents: number;
    billingPeriodDays: number;
    trialDays: number;
    landingPlan: {
        name: string;
        slug: string;
        description: string;
        features: string[];
    };
};

function formatCOP(cents: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(cents / 100);
}

export function SubscriptionCard({
    subscription,
    availablePlans,
    hasPaymentSource,
}: {
    subscription: ActiveSubscription;
    availablePlans: AvailablePlan[];
    hasPaymentSource: boolean;
}) {
    const [loading, setLoading] = useState('');
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [installments, setInstallments] = useState<Record<string, number>>({});

    const dict = useDictionary();
    const t = dict.settingsUI?.subscriptionCard || {};
    const ui = dict.ui || {};

    const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        ACTIVE: { label: t.statusActive || 'Activa', variant: 'default' },
        TRIAL: { label: t.statusTrial || 'Prueba', variant: 'secondary' },
        PAST_DUE: { label: t.statusPastDue || 'Pago pendiente', variant: 'destructive' },
        CANCELLED: { label: t.statusCancelled || 'Cancelada', variant: 'outline' },
    };

    async function handleSubscribe(planPricingId: string, planInstallments: number) {
        setLoading(planPricingId);
        setError('');
        setWarning('');
        const result = await subscribeToPlan(planPricingId, planInstallments);
        setLoading('');
        if (!result.success) {
            setError(result.error || 'Error');
        } else if (result.warning) {
            setWarning(result.warning);
        }
    }

    async function handleCancel() {
        if (!confirm(t.cancelConfirm || '¿Estás seguro de cancelar tu suscripción?')) return;
        setLoading('cancel');
        setError('');
        const result = await cancelMySubscription();
        setLoading('');
        if (!result.success) setError(result.error || 'Error');
    }

    if (subscription) {
        const status = STATUS_LABELS[subscription.status] || STATUS_LABELS.ACTIVE;
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Crown className="h-5 w-5" />
                            <CardTitle>{t.yourSubscription || 'Tu Suscripción'}</CardTitle>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <p className="text-sm text-muted-foreground">{t.currentPlan || 'Plan actual'}</p>
                        <p className="text-xl font-bold">{subscription.planPricing.landingPlan.name}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">{t.currentPeriod || 'Período actual:'}</span>{' '}
                            {new Date(subscription.currentPeriodStart).toLocaleDateString('es-CO')} —{' '}
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-CO')}
                        </div>
                        {subscription.paymentSource.lastFour && (
                            <div>
                                <span className="text-muted-foreground">{t.cardLabel || 'Tarjeta:'}</span>{' '}
                                {subscription.paymentSource.brand} •••• {subscription.paymentSource.lastFour}
                            </div>
                        )}
                    </div>
                    {subscription.status === 'PAST_DUE' && (
                        <div className="flex items-center gap-2 text-amber-700 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{t.paymentIssue || 'Hay un problema con tu pago. Actualiza tu tarjeta.'}</span>
                        </div>
                    )}
                    {subscription.cancelledAt && subscription.status !== 'CANCELLED' && (
                        <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>
                                {t.cancelledNotice || 'Tu suscripción fue cancelada. El plan seguirá activo hasta el'}{' '}
                                <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString('es-CO')}</strong>.
                                {' '}{t.noMoreCharges || 'No se realizarán más cobros.'}
                            </span>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </CardContent>
                <CardFooter>
                    {!subscription.cancelledAt && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleCancel}
                            disabled={loading === 'cancel'}
                        >
                            {loading === 'cancel' ? (t.cancelling || 'Cancelando...') : (t.cancelButton || 'Cancelar suscripción')}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

    // No subscription — show available plans
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    <CardTitle>{t.plansTitle || 'Planes de Suscripción'}</CardTitle>
                </div>
                <CardDescription>
                    {t.plansDesc || 'Elige un plan para activar tu suscripción recurrente.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!hasPaymentSource && (
                    <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 dark:bg-amber-950/10 p-3 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{t.addCardFirst || 'Primero agrega una tarjeta de pago abajo.'}</span>
                    </div>
                )}
                {availablePlans.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t.noPlansAvailable || 'No hay planes disponibles.'}</p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {availablePlans.map((plan) => (
                        <div key={plan.id} className="border rounded-lg p-4 space-y-3">
                            <div>
                                <h4 className="font-semibold">{plan.landingPlan.name}</h4>
                                <p className="text-sm text-muted-foreground">{plan.landingPlan.description}</p>
                            </div>
                            <p className="text-2xl font-bold">
                                {formatCOP(plan.priceInCents)}
                                <span className="text-sm font-normal text-muted-foreground">
                                    /{plan.billingPeriodDays} {ui.date === 'Date' ? 'days' : 'días'}
                                </span>
                            </p>
                            {plan.trialDays > 0 && (
                                <Badge variant="secondary">{plan.trialDays} {t.freeTrialDays || 'días gratis'}</Badge>
                            )}
                            <ul className="space-y-1">
                                {plan.landingPlan.features.slice(0, 4).map((f, i) => (
                                    <li key={i} className="flex items-center gap-1 text-xs">
                                        <Check className="h-3 w-3 text-green-500" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t.installments || 'Cuotas'}</Label>
                                <select
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    value={installments[plan.id] || 1}
                                    onChange={(e) => setInstallments(prev => ({ ...prev, [plan.id]: Number(e.target.value) }))}
                                >
                                    <option value={1}>1 {t.installment || 'cuota'}</option>
                                    <option value={2}>2 {t.installmentsPlural || 'cuotas'}</option>
                                    <option value={3}>3 {t.installmentsPlural || 'cuotas'}</option>
                                    <option value={6}>6 {t.installmentsPlural || 'cuotas'}</option>
                                    <option value={12}>12 {t.installmentsPlural || 'cuotas'}</option>
                                </select>
                            </div>
                            <Button
                                className="w-full"
                                size="sm"
                                disabled={!hasPaymentSource || loading === plan.id}
                                onClick={() => handleSubscribe(plan.id, installments[plan.id] || 1)}
                            >
                                {loading === plan.id ? (t.subscribing || 'Suscribiendo...') : (t.subscribe || 'Suscribirse')}
                            </Button>
                        </div>
                    ))}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {warning && (
                    <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{warning}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
