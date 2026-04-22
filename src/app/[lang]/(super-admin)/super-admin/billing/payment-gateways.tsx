'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Banknote, Wallet, ChevronRight } from 'lucide-react';
import { WompiConfigCard } from './wompi-config-card';
import { useDictionary } from '@/lib/i18n-context';
import { cn } from '@/lib/utils';

type GatewayId = 'wompi' | 'stripe' | 'mercadopago';

type Gateway = {
    id: GatewayId;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    status: 'active' | 'coming_soon';
    iconClass: string;
};

const GATEWAYS: Gateway[] = [
    {
        id: 'wompi',
        name: 'Wompi',
        description: 'Pasarela para Colombia. Tarjetas, PSE, Nequi y más.',
        icon: CreditCard,
        status: 'active',
        iconClass: 'bg-emerald-50 text-emerald-600',
    },
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Pagos internacionales con tarjeta de crédito y débito.',
        icon: Wallet,
        status: 'coming_soon',
        iconClass: 'bg-violet-50 text-violet-600',
    },
    {
        id: 'mercadopago',
        name: 'Mercado Pago',
        description: 'Pagos en Latinoamérica. Tarjetas, transferencias y efectivo.',
        icon: Banknote,
        status: 'coming_soon',
        iconClass: 'bg-blue-50 text-blue-600',
    },
];

export function PaymentGateways() {
    const [selected, setSelected] = useState<GatewayId | null>('wompi');
    const dict = useDictionary();
    const t = dict.superAdminUI?.paymentGateways || {};

    return (
        <div className="space-y-6">
            {/* Gateway selector */}
            <div className="bg-card rounded-xl border overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#F4F4F5] dark:border-[#27272A]">
                    <p className="text-[13px] text-[#71717A]">
                        {t.selectGateway || 'Selecciona una pasarela para configurarla.'}
                    </p>
                </div>
                <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                    {GATEWAYS.map((gw) => {
                        const isSelected = selected === gw.id;
                        const isActive = gw.status === 'active';
                        return (
                            <button
                                key={gw.id}
                                onClick={() => isActive && setSelected(isSelected ? null : gw.id)}
                                disabled={!isActive}
                                className={cn(
                                    'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors',
                                    isActive ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed',
                                    isSelected && 'bg-primary/5'
                                )}
                            >
                                <div className={`p-2.5 rounded-xl shrink-0 ${gw.iconClass}`}>
                                    <gw.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-semibold text-foreground">{gw.name}</p>
                                    <p className="text-[13px] text-muted-foreground">{gw.description}</p>
                                </div>
                                {isActive ? (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="default" className="text-xs bg-[#ECFDF5] text-[#10B981] border-0 hover:bg-[#ECFDF5]">
                                            {t.activeLabel || 'Activa'}
                                        </Badge>
                                        <ChevronRight className={cn(
                                            'h-4 w-4 text-muted-foreground transition-transform',
                                            isSelected && 'rotate-90'
                                        )} />
                                    </div>
                                ) : (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {t.comingSoon || 'Próximamente'}
                                    </Badge>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Inline config */}
            {selected === 'wompi' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-[#F4F4F5] dark:bg-[#27272A]" />
                        <span className="text-[13px] text-[#71717A] px-2">Configuración Wompi</span>
                        <div className="h-px flex-1 bg-[#F4F4F5] dark:bg-[#27272A]" />
                    </div>
                    <WompiConfigCard />
                </div>
            )}
        </div>
    );
}
