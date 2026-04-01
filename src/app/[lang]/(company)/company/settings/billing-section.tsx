'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { SubscriptionCard } from './subscription-card';
import { PaymentMethodsCard } from './payment-methods-card';
import { BillingHistoryCard } from './billing-history-card';

type BillingSectionProps = {
    subscription: any;
    availablePlans: any[];
    hasPaymentSource: boolean;
    sources: any[];
    companyEmail: string;
    wompiPublicKey?: string;
    wompiIsSandbox?: boolean;
    attempts: any[];
};

function formatCOP(cents: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(cents / 100);
}

function formatDateLong(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatDateShort(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
    APPROVED: { label: 'Pagado', color: 'bg-[#ECFDF5] text-[#10B981]' },
    PENDING: { label: 'Pendiente', color: 'bg-amber-50 text-amber-600' },
    DECLINED: { label: 'Rechazado', color: 'bg-red-50 text-red-500' },
    ERROR: { label: 'Error', color: 'bg-red-50 text-red-500' },
    VOIDED: { label: 'Anulado', color: 'bg-gray-100 text-gray-500' },
};

export function BillingSection({
    subscription,
    availablePlans,
    hasPaymentSource,
    sources,
    companyEmail,
    wompiPublicKey,
    wompiIsSandbox,
    attempts,
}: BillingSectionProps) {
    const [activeView, setActiveView] = useState<string | null>(null);

    // Drill-down: Subscription management (change plan, cancel, etc.)
    if (activeView === 'subscription') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a facturación
                </Button>
                <SubscriptionCard
                    subscription={subscription}
                    availablePlans={availablePlans}
                    hasPaymentSource={hasPaymentSource}
                />
            </div>
        );
    }

    // Drill-down: Payment methods management
    if (activeView === 'payment-methods') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a facturación
                </Button>
                <PaymentMethodsCard
                    sources={sources}
                    companyEmail={companyEmail}
                    wompiPublicKey={wompiPublicKey}
                    wompiIsSandbox={wompiIsSandbox}
                />
            </div>
        );
    }

    // Drill-down: Full billing history
    if (activeView === 'history') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a facturación
                </Button>
                <BillingHistoryCard attempts={attempts} />
            </div>
        );
    }

    // Get the default/first payment source for display
    const defaultSource = sources.find((s) => s.isDefault) || sources[0] || null;

    // Get current plan info
    const planName = subscription?.planPricing?.landingPlan?.name || 'Sin plan';
    const planPricing = availablePlans.find(
        (p) => p.landingPlan?.slug === subscription?.planPricing?.landingPlan?.slug
    );
    const priceLabel = planPricing
        ? `${formatCOP(planPricing.priceInCents)} / mes`
        : subscription
            ? 'Plan activo'
            : 'Sin suscripción';
    const renewalDate = subscription?.currentPeriodEnd
        ? `Próximo cobro: ${formatDateLong(subscription.currentPeriodEnd)}`
        : null;

    // Recent attempts (show up to 5)
    const recentAttempts = attempts.slice(0, 5);

    return (
        <div
            className="rounded-2xl border border-[#E4E4E7] bg-white p-6"
            style={{ gap: '20px', display: 'flex', flexDirection: 'column' }}
        >
            {/* Section title */}
            <h2 className="text-[15px] font-semibold text-[#09090B]">Facturación</h2>

            {/* Plan row */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[16px] font-semibold text-[#09090B]">
                        {planName}
                    </span>
                    <span className="text-[14px] text-[#3F3F46]">
                        {priceLabel}
                    </span>
                    {renewalDate && (
                        <span className="text-[13px] text-[#71717A]">
                            {renewalDate}
                        </span>
                    )}
                    {!subscription && (
                        <span className="text-[13px] text-[#71717A]">
                            No tienes una suscripción activa
                        </span>
                    )}
                </div>
                <Button
                    variant="outline"
                    className="rounded-lg border-[#E4E4E7] px-4 py-2 text-[14px]"
                    onClick={() => setActiveView('subscription')}
                >
                    Cambiar plan
                </Button>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#F4F4F5]" />

            {/* Payment method row */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F4F4F5]">
                    <CreditCard className="h-5 w-5 text-[#71717A]" />
                </div>
                <div className="flex-1">
                    {defaultSource ? (
                        <>
                            <p className="text-[14px] font-medium text-[#09090B]">
                                {defaultSource.brand || 'Tarjeta'} **** {defaultSource.lastFour || '????'}
                            </p>
                            {defaultSource.expiresAt && (
                                <p className="text-[13px] text-[#71717A]">
                                    Expira {new Date(defaultSource.expiresAt).toLocaleDateString('es-CO', { month: '2-digit', year: 'numeric' })}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-[14px] font-medium text-[#09090B]">
                                Sin tarjeta registrada
                            </p>
                            <p className="text-[13px] text-[#71717A]">
                                Agrega una tarjeta para suscribirte
                            </p>
                        </>
                    )}
                </div>
                <button
                    className="text-[13px] font-medium text-[#10B981] hover:underline"
                    onClick={() => setActiveView('payment-methods')}
                >
                    Cambiar
                </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#F4F4F5]" />

            {/* Payment history title */}
            <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#09090B]">
                    Historial de pagos
                </h3>
                {attempts.length > 5 && (
                    <button
                        className="text-[13px] font-medium text-[#10B981] hover:underline"
                        onClick={() => setActiveView('history')}
                    >
                        Ver todo
                    </button>
                )}
            </div>

            {/* Payment history rows */}
            {recentAttempts.length === 0 ? (
                <p className="text-[13px] text-[#71717A]">
                    No hay cobros registrados aún.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {recentAttempts.map((a) => {
                        const status = STATUS_BADGE[a.status] || STATUS_BADGE.PENDING;
                        return (
                            <div key={a.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-[14px] text-[#71717A]">
                                        {formatDateShort(a.createdAt)}
                                    </span>
                                    <span className="text-[14px] text-[#3F3F46]">
                                        {a.subscription.planPricing.landingPlan.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[14px] font-semibold text-[#09090B]">
                                        {formatCOP(a.amountInCents)}
                                    </span>
                                    <span
                                        className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-[12px] font-medium ${status.color}`}
                                    >
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Show "Ver todo" link at bottom if there are more than 0 but <= 5 attempts */}
            {attempts.length > 0 && attempts.length <= 5 && (
                <button
                    className="text-[13px] font-medium text-[#10B981] hover:underline self-start"
                    onClick={() => setActiveView('history')}
                >
                    Ver historial completo
                </button>
            )}
        </div>
    );
}
