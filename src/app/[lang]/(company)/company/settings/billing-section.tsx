'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Crown, CreditCard, Receipt } from 'lucide-react';
import { SubscriptionCard } from './subscription-card';
import { PaymentMethodsCard } from './payment-methods-card';
import { BillingHistoryCard } from './billing-history-card';

type BillingItem = {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badge: string;
    badgeVariant: 'default' | 'secondary' | 'outline';
};

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
    const [activeItem, setActiveItem] = useState<string | null>(null);

    const isExpired = subscription?.currentPeriodEnd
        && new Date(subscription.currentPeriodEnd).getTime() < Date.now()
        && (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL');

    const items: BillingItem[] = [
        {
            id: 'subscription',
            name: 'Suscripción',
            description: 'Gestiona tu plan actual, cambia de plan o cancela tu suscripción.',
            icon: Crown,
            color: isExpired
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-purple-50 text-purple-600 border-purple-200',
            badge: subscription
                ? isExpired ? 'Vencida' : 'Activa'
                : 'Sin suscripción',
            badgeVariant: subscription
                ? isExpired ? 'outline' : 'default'
                : 'secondary',
        },
        {
            id: 'payment-methods',
            name: 'Métodos de Pago',
            description: 'Administra tus tarjetas y métodos de pago guardados.',
            icon: CreditCard,
            color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            badge: sources.length > 0 ? `${sources.length} tarjeta${sources.length > 1 ? 's' : ''}` : 'Sin tarjetas',
            badgeVariant: sources.length > 0 ? 'default' : 'secondary',
        },
        {
            id: 'history',
            name: 'Historial de Cobros',
            description: 'Revisa el historial de pagos y transacciones de tu cuenta.',
            icon: Receipt,
            color: 'bg-gray-50 text-gray-600 border-gray-200',
            badge: attempts.length > 0 ? `${attempts.length} cobro${attempts.length > 1 ? 's' : ''}` : 'Sin cobros',
            badgeVariant: attempts.length > 0 ? 'default' : 'secondary',
        },
    ];

    if (activeItem === 'subscription') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
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

    if (activeItem === 'payment-methods') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
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

    if (activeItem === 'history') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a facturación
                </Button>
                <BillingHistoryCard attempts={attempts} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Selecciona una opción para ver los detalles.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                    <Card
                        key={item.id}
                        className="transition-all cursor-pointer hover:shadow-md hover:border-primary/40"
                        onClick={() => setActiveItem(item.id)}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-lg border ${item.color}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <Badge variant={item.badgeVariant} className="text-xs">
                                    {item.badge}
                                </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{item.name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                            </p>
                            <div className="mt-4 flex items-center text-sm text-primary font-medium gap-1">
                                Ver detalles
                                <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
