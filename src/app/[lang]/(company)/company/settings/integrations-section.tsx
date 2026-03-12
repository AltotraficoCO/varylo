'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Key, Coins, Calendar, ShoppingBag } from 'lucide-react';
import { OpenAIKeyForm } from './openai-form';
import { CreditBalanceCard } from './credit-balance-card';
import { GoogleCalendarForm } from './google-calendar-form';
import { EcommerceForm } from './ecommerce-form';

type IntegrationItem = {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badge: string;
    badgeVariant: 'default' | 'secondary' | 'outline';
};

type IntegrationsSectionProps = {
    openai: {
        hasApiKey: boolean;
        updatedAt: string | null;
    };
    credits: {
        balance: number;
        hasOwnKey: boolean;
        companyId: string;
        companyEmail: string;
    };
    googleCalendar: {
        isConnected: boolean;
        email: string | null;
        connectedAt: string | null;
    };
    ecommerce: {
        isConnected: boolean;
        platform: string | null;
        storeUrl: string | null;
    };
};

export function IntegrationsSection({ openai, credits, googleCalendar, ecommerce }: IntegrationsSectionProps) {
    const [activeItem, setActiveItem] = useState<string | null>(null);

    const formatBalance = (balance: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(balance);
    };

    const integrations: IntegrationItem[] = [
        {
            id: 'openai',
            name: 'OpenAI API Key',
            description: 'Configura tu propia clave de OpenAI para usar GPT directamente.',
            icon: Key,
            color: 'bg-orange-50 text-orange-600 border-orange-200',
            badge: openai.hasApiKey ? 'Configurada' : 'No configurada',
            badgeVariant: openai.hasApiKey ? 'default' : 'secondary',
        },
        {
            id: 'credits',
            name: 'Créditos IA',
            description: 'Recarga créditos para usar la IA de Varylo sin clave propia.',
            icon: Coins,
            color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
            badge: `Saldo: ${formatBalance(credits.balance)}`,
            badgeVariant: credits.balance > 0 ? 'default' : 'secondary',
        },
        {
            id: 'google-calendar',
            name: 'Google Calendar',
            description: 'Conecta Google Calendar para agendar citas desde el chat.',
            icon: Calendar,
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            badge: googleCalendar.isConnected ? 'Conectado' : 'No conectado',
            badgeVariant: googleCalendar.isConnected ? 'default' : 'secondary',
        },
        {
            id: 'ecommerce',
            name: 'Tienda Online',
            description: 'Conecta Shopify o WooCommerce para consultar productos e inventario.',
            icon: ShoppingBag,
            color: 'bg-purple-50 text-purple-600 border-purple-200',
            badge: ecommerce.isConnected
                ? `${ecommerce.platform === 'shopify' ? 'Shopify' : 'WooCommerce'}`
                : 'No conectada',
            badgeVariant: ecommerce.isConnected ? 'default' : 'secondary',
        },
    ];

    if (activeItem === 'openai') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a integraciones
                </Button>
                <OpenAIKeyForm hasApiKey={openai.hasApiKey} updatedAt={openai.updatedAt} />
            </div>
        );
    }

    if (activeItem === 'credits') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a integraciones
                </Button>
                <CreditBalanceCard
                    balance={credits.balance}
                    hasOwnKey={credits.hasOwnKey}
                    companyId={credits.companyId}
                    companyEmail={credits.companyEmail}
                />
            </div>
        );
    }

    if (activeItem === 'google-calendar') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a integraciones
                </Button>
                <GoogleCalendarForm
                    isConnected={googleCalendar.isConnected}
                    email={googleCalendar.email}
                    connectedAt={googleCalendar.connectedAt}
                />
            </div>
        );
    }

    if (activeItem === 'ecommerce') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a integraciones
                </Button>
                <EcommerceForm
                    isConnected={ecommerce.isConnected}
                    platform={ecommerce.platform}
                    storeUrl={ecommerce.storeUrl}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Selecciona una integración para configurarla.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {integrations.map((item) => (
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
                                Configurar
                                <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
