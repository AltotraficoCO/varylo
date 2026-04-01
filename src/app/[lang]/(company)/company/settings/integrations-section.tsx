'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Key, Calendar } from 'lucide-react';
import { OpenAIKeyForm } from './openai-form';
import { CreditBalanceCard } from './credit-balance-card';
import { GoogleCalendarForm } from './google-calendar-form';
import { EcommerceForm } from './ecommerce-form';

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

    const getUpdatedDaysAgo = () => {
        if (!openai.updatedAt) return null;
        const days = Math.floor((Date.now() - new Date(openai.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Actualizado hoy';
        if (days === 1) return 'Actualizado hace 1 día';
        return `Actualizado hace ${days} días`;
    };

    return (
        <div
            className="rounded-2xl border border-[#E4E4E7] bg-white p-6"
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >
            {/* Section title */}
            <h2 className="text-[15px] font-semibold text-[#09090B]">IA y Créditos</h2>

            {/* API Key row */}
            <div className="flex items-center gap-3 w-full">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#ECFDF5]">
                    <Key className="h-5 w-5 text-[#10B981]" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#09090B]">
                        {openai.hasApiKey ? 'API Key configurada' : 'API Key no configurada'}
                    </p>
                    {openai.hasApiKey && getUpdatedDaysAgo() && (
                        <p className="text-[13px] text-[#71717A]">{getUpdatedDaysAgo()}</p>
                    )}
                    {!openai.hasApiKey && (
                        <p className="text-[13px] text-[#71717A]">Configura tu clave de OpenAI</p>
                    )}
                </div>
                <button
                    onClick={() => setActiveItem('openai')}
                    className="text-[13px] font-medium text-[#10B981] hover:underline cursor-pointer bg-transparent border-none"
                >
                    {openai.hasApiKey ? 'Cambiar' : 'Configurar'}
                </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-[#F4F4F5]" />

            {/* Credits row */}
            <div className="flex items-center justify-between w-full">
                <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-bold text-[#09090B] leading-none">
                        {formatBalance(credits.balance)}
                    </span>
                    <span className="text-[13px] text-[#71717A]">COP disponibles</span>
                </div>
                <button
                    onClick={() => setActiveItem('credits')}
                    className="bg-[#10B981] text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:bg-[#059669] transition-colors cursor-pointer border-none"
                >
                    Recargar créditos
                </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-[#F4F4F5]" />

            {/* Google Calendar row */}
            <div className="flex items-center gap-3 w-full">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#EFF6FF]">
                    <Calendar className="h-5 w-5 text-[#3B82F6]" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#09090B]">
                        {googleCalendar.isConnected ? 'Google Calendar conectado' : 'Google Calendar no conectado'}
                    </p>
                    {googleCalendar.isConnected && googleCalendar.email && (
                        <p className="text-[13px] text-[#71717A] truncate">{googleCalendar.email}</p>
                    )}
                    {!googleCalendar.isConnected && (
                        <p className="text-[13px] text-[#71717A]">Conecta para agendar citas</p>
                    )}
                </div>
                <button
                    onClick={() => setActiveItem('google-calendar')}
                    className={`text-[13px] font-medium hover:underline cursor-pointer bg-transparent border-none ${
                        googleCalendar.isConnected ? 'text-[#EF4444]' : 'text-[#3B82F6]'
                    }`}
                >
                    {googleCalendar.isConnected ? 'Desconectar' : 'Conectar'}
                </button>
            </div>
        </div>
    );
}
