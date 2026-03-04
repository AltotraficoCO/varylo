'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CreditCard, Banknote, Wallet } from 'lucide-react';
import { WompiConfigCard } from './wompi-config-card';

type Gateway = {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    status: 'active' | 'coming_soon';
    color: string;
};

const GATEWAYS: Gateway[] = [
    {
        id: 'wompi',
        name: 'Wompi',
        description: 'Pasarela de pagos para Colombia. Tarjetas, PSE, Nequi y más.',
        icon: CreditCard,
        status: 'active',
        color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Pagos internacionales con tarjeta de crédito y débito.',
        icon: Wallet,
        status: 'coming_soon',
        color: 'bg-violet-50 text-violet-600 border-violet-200',
    },
    {
        id: 'mercadopago',
        name: 'Mercado Pago',
        description: 'Pagos en Latinoamérica. Tarjetas, transferencias y efectivo.',
        icon: Banknote,
        status: 'coming_soon',
        color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
];

export function PaymentGateways() {
    const [activeGateway, setActiveGateway] = useState<string | null>(null);

    if (activeGateway === 'wompi') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveGateway(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a pasarelas
                </Button>
                <WompiConfigCard />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Selecciona una pasarela de pagos para configurarla.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {GATEWAYS.map((gw) => (
                    <Card
                        key={gw.id}
                        className={`transition-all ${
                            gw.status === 'active'
                                ? 'cursor-pointer hover:shadow-md hover:border-primary/40'
                                : 'opacity-60'
                        }`}
                        onClick={() => gw.status === 'active' && setActiveGateway(gw.id)}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-lg border ${gw.color}`}>
                                    <gw.icon className="h-5 w-5" />
                                </div>
                                {gw.status === 'active' ? (
                                    <Badge variant="default" className="text-xs">Activa</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-xs">Próximamente</Badge>
                                )}
                            </div>
                            <h3 className="font-semibold mb-1">{gw.name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {gw.description}
                            </p>
                            {gw.status === 'active' && (
                                <div className="mt-4 flex items-center text-sm text-primary font-medium gap-1">
                                    Configurar
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
