'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Key, Calendar, ShoppingBag, Plus, Settings2, Trash2, Loader2 } from 'lucide-react';
import { OpenAIKeyForm } from '../settings/openai-form';
import { GoogleCalendarForm } from '../settings/google-calendar-form';
import { EcommerceForm } from '../settings/ecommerce-form';
import { disconnectEcommerceById } from './actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type EcommerceStore = {
    id: string;
    name: string;
    platform: string;
    storeUrl: string;
    active: boolean;
    createdAt: string;
};

type IntegrationsClientProps = {
    openai: {
        hasApiKey: boolean;
        updatedAt: string | null;
    };
    googleCalendar: {
        isConnected: boolean;
        email: string | null;
        connectedAt: string | null;
    };
    ecommerceStores: EcommerceStore[];
};

export function IntegrationsClient({ openai, googleCalendar, ecommerceStores }: IntegrationsClientProps) {
    const [activeView, setActiveView] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    async function handleDeleteStore(storeId: string) {
        if (!confirm('Desconectar esta tienda?')) return;
        setDeletingId(storeId);
        const result = await disconnectEcommerceById(storeId);
        if (result.success) {
            toast.success('Tienda desconectada');
            router.refresh();
        } else {
            toast.error(result.error || 'Error');
        }
        setDeletingId(null);
    }

    // Drill-down views
    if (activeView === 'openai') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Volver a integraciones
                </Button>
                <OpenAIKeyForm hasApiKey={openai.hasApiKey} updatedAt={openai.updatedAt} />
            </div>
        );
    }

    if (activeView === 'google-calendar') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Volver a integraciones
                </Button>
                <GoogleCalendarForm
                    isConnected={googleCalendar.isConnected}
                    email={googleCalendar.email}
                    connectedAt={googleCalendar.connectedAt}
                />
            </div>
        );
    }

    if (activeView === 'add-ecommerce') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Volver a integraciones
                </Button>
                <EcommerceForm isConnected={false} platform={null} storeUrl={null} />
            </div>
        );
    }

    const platformLabel: Record<string, string> = {
        shopify: 'Shopify',
        woocommerce: 'WooCommerce',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-[#09090B]">Integraciones</h1>
                <p className="text-sm text-[#71717A] mt-1">
                    Conecta servicios externos para potenciar tu espacio de trabajo.
                </p>
            </div>

            {/* Integration list */}
            <div className="rounded-xl border border-[#E4E4E7] bg-white divide-y divide-[#F4F4F5]">

                {/* OpenAI */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <div className="h-11 w-11 rounded-lg bg-[#ECFDF5] flex items-center justify-center shrink-0">
                        <Key className="h-5 w-5 text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#09090B]">OpenAI</span>
                            {openai.hasApiKey && (
                                <Badge variant="default" className="text-[11px] px-2 py-0">Conectado</Badge>
                            )}
                        </div>
                        <p className="text-[13px] text-[#71717A] mt-0.5">
                            Conecta tu API Key de OpenAI para usar modelos de IA en tus agentes.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveView('openai')} className="shrink-0">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        {openai.hasApiKey ? 'Gestionar' : 'Conectar'}
                    </Button>
                </div>

                {/* Google Calendar */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <div className="h-11 w-11 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-[#3B82F6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#09090B]">Google Calendar</span>
                            {googleCalendar.isConnected && (
                                <Badge variant="default" className="text-[11px] px-2 py-0">Conectado</Badge>
                            )}
                        </div>
                        <p className="text-[13px] text-[#71717A] mt-0.5">
                            {googleCalendar.isConnected && googleCalendar.email
                                ? googleCalendar.email
                                : 'Permite a tus agentes IA consultar disponibilidad y agendar reuniones.'}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveView('google-calendar')} className="shrink-0">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        {googleCalendar.isConnected ? 'Gestionar' : 'Conectar'}
                    </Button>
                </div>

                {/* Ecommerce header */}
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-lg bg-[#F5F3FF] flex items-center justify-center shrink-0">
                                <ShoppingBag className="h-5 w-5 text-[#8B5CF6]" />
                            </div>
                            <div>
                                <span className="text-[15px] font-medium text-[#09090B]">Tiendas online</span>
                                <p className="text-[13px] text-[#71717A] mt-0.5">
                                    Conecta Shopify o WooCommerce para que el agente IA consulte productos y precios.
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setActiveView('add-ecommerce')} className="shrink-0">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Agregar tienda
                        </Button>
                    </div>

                    {/* Connected stores */}
                    {ecommerceStores.length > 0 ? (
                        <div className="ml-14 space-y-2">
                            {ecommerceStores.map((store) => (
                                <div key={store.id} className="flex items-center justify-between rounded-lg border border-[#E4E4E7] px-4 py-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] font-medium text-[#09090B]">{store.name}</span>
                                                <span className="text-[12px] text-[#71717A] bg-[#F4F4F5] rounded px-1.5 py-0.5">
                                                    {platformLabel[store.platform] || store.platform}
                                                </span>
                                                {store.active ? (
                                                    <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                                                ) : (
                                                    <span className="h-2 w-2 rounded-full bg-[#A1A1AA]" />
                                                )}
                                            </div>
                                            <p className="text-[13px] text-[#71717A] truncate">{store.storeUrl}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteStore(store.id)}
                                        disabled={deletingId === store.id}
                                        className="text-[#A1A1AA] hover:text-[#EF4444] transition-colors p-1.5 rounded-md hover:bg-red-50"
                                    >
                                        {deletingId === store.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="ml-14 text-[13px] text-[#A1A1AA]">No hay tiendas conectadas.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
