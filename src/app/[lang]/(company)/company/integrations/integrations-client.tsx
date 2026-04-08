'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings2, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
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

    const shopifyStores = ecommerceStores.filter(s => s.platform === 'shopify');
    const wooStores = ecommerceStores.filter(s => s.platform === 'woocommerce');

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

    function StoreList({ stores }: { stores: EcommerceStore[] }) {
        if (stores.length === 0) return null;
        return (
            <div className="space-y-2 mt-4">
                {stores.map((store) => (
                    <div key={store.id} className="flex items-center justify-between rounded-lg border border-[#E4E4E7] px-4 py-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[14px] font-medium text-[#09090B]">{store.name}</span>
                                {store.active ? (
                                    <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                                ) : (
                                    <span className="h-2 w-2 rounded-full bg-[#A1A1AA]" />
                                )}
                            </div>
                            <p className="text-[13px] text-[#71717A]">{store.storeUrl}</p>
                        </div>
                        <button
                            onClick={() => handleDeleteStore(store.id)}
                            disabled={deletingId === store.id}
                            className="text-[#A1A1AA] hover:text-[#EF4444] transition-colors p-1.5 rounded-md hover:bg-red-50"
                        >
                            {deletingId === store.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                    </div>
                ))}
            </div>
        );
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

    if (activeView === 'add-shopify') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Volver a integraciones
                </Button>
                <StoreList stores={shopifyStores} />
                <EcommerceForm isConnected={false} platform="shopify" storeUrl={null} />
            </div>
        );
    }

    if (activeView === 'add-woocommerce') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Volver a integraciones
                </Button>
                <StoreList stores={wooStores} />
                <EcommerceForm isConnected={false} platform="woocommerce" storeUrl={null} />
            </div>
        );
    }

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
                    <div className="h-11 w-11 rounded-lg bg-[#F5F5F5] flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#000000">
                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                        </svg>
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
                    <div className="h-11 w-11 rounded-lg bg-white border border-[#E4E4E7] flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="h-7 w-7">
                            <path d="M18.316 5.684H24v12.632h-5.684V5.684z" fill="#1967D2"/>
                            <path d="M5.684 24l-5.684-5.684h5.684V24z" fill="#1967D2"/>
                            <path d="M18.316 5.684V0L24 5.684h-5.684z" fill="#1A73E8"/>
                            <path d="M5.684 0v5.684H0L5.684 0z" fill="#EA4335"/>
                            <path d="M5.684 5.684h12.632v12.632H5.684V5.684z" fill="#FFFFFF"/>
                            <path d="M5.684 18.316H0V5.684h5.684v12.632z" fill="#4285F4"/>
                            <path d="M18.316 24H5.684v-5.684h12.632V24z" fill="#34A853"/>
                            <path d="M24 18.316h-5.684V24L24 18.316z" fill="#188038"/>
                            <path d="M18.316 0H5.684v5.684h12.632V0z" fill="#FBBC04"/>
                            <path d="M8.5 15.5l1.2-1.2 1.8 1.8 3.8-3.8 1.2 1.2-5 5-3-3z" fill="#1967D2"/>
                        </svg>
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

                {/* Shopify */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <div className="h-11 w-11 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#95BF47">
                            <path d="M15.337 23.979l7.216-1.561S19.811 5.15 19.794 5.055a.345.345 0 0 0-.325-.288c-.132 0-2.627-.184-2.627-.184s-1.739-1.717-1.939-1.918c-.055-.054-.126-.08-.199-.092l-.962 22.406zM12.736 7.326l-.762 2.322s-.893-.412-1.932-.344c-1.543.1-1.559 1.066-1.543 1.31.084 1.3 3.517 1.583 3.711 4.623.152 2.39-1.267 4.025-3.317 4.151-2.459.152-3.815-1.293-3.815-1.293l.521-2.213s1.363 1.041 2.455.973a.983.983 0 0 0 .951-1.041c-.109-1.696-2.906-1.596-3.084-4.372-.15-2.336 1.388-4.703 4.775-4.915 1.306-.08 1.97.247 1.97.247"/>
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#09090B]">Shopify</span>
                            {shopifyStores.length > 0 && (
                                <Badge variant="default" className="text-[11px] px-2 py-0">{shopifyStores.length} conectada{shopifyStores.length > 1 ? 's' : ''}</Badge>
                            )}
                        </div>
                        <p className="text-[13px] text-[#71717A] mt-0.5">
                            {shopifyStores.length > 0
                                ? shopifyStores.map(s => s.storeUrl).join(', ')
                                : 'Conecta tu tienda Shopify para consultar productos y precios.'}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveView('add-shopify')} className="shrink-0">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        {shopifyStores.length > 0 ? 'Gestionar' : 'Conectar'}
                    </Button>
                </div>

                {/* WordPress / WooCommerce */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <div className="h-11 w-11 rounded-lg bg-[#F0F0FF] flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#21759B">
                            <path d="M12.158 12.786l-2.698 7.84c.806.237 1.657.365 2.54.365 1.047 0 2.051-.181 2.986-.511a.506.506 0 0 1-.042-.08l-2.786-7.614zM3.009 12c0 3.56 2.07 6.634 5.068 8.093L3.788 8.341A8.975 8.975 0 0 0 3.009 12zm16.327-1.04c0-1.112-.399-1.881-.741-2.48-.456-.741-.883-1.368-.883-2.109 0-.826.627-1.596 1.51-1.596.04 0 .078.005.116.007A8.962 8.962 0 0 0 12 3.009a8.986 8.986 0 0 0-7.54 4.098c.212.007.412.011.583.011.948 0 2.416-.115 2.416-.115.489-.029.546.689.058.746 0 0-.491.058-.037.058l3.478 10.341 2.089-6.262-1.487-4.079c-.489-.029-.952-.058-.952-.058-.488-.028-.431-.774.058-.746 0 0 1.497.115 2.387.115.948 0 2.416-.115 2.416-.115.489-.029.547.689.058.746 0 0-.492.058-.981.086l3.45 10.262 .967-3.189c.439-1.368.741-2.338.741-3.168zM20.991 12c0 3.329-1.8 6.237-4.479 7.807l2.751-7.953c.514-1.283.685-2.309.685-3.221 0-.331-.022-.639-.063-.924A8.952 8.952 0 0 1 20.991 12zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 23.454C5.726 23.454.546 18.274.546 12S5.726.546 12 .546 23.454 5.726 23.454 12 18.274 23.454 12 23.454z"/>
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#09090B]">WordPress</span>
                            {wooStores.length > 0 && (
                                <Badge variant="default" className="text-[11px] px-2 py-0">{wooStores.length} conectada{wooStores.length > 1 ? 's' : ''}</Badge>
                            )}
                        </div>
                        <p className="text-[13px] text-[#71717A] mt-0.5">
                            {wooStores.length > 0
                                ? wooStores.map(s => s.storeUrl).join(', ')
                                : 'Conecta tu WooCommerce para consultar productos y precios.'}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveView('add-woocommerce')} className="shrink-0">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        {wooStores.length > 0 ? 'Gestionar' : 'Conectar'}
                    </Button>
                </div>

                {/* n8n */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <div className="h-11 w-11 rounded-lg bg-[#FFF1F0] flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#EA4B71"/>
                            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">n8n</text>
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#09090B]">n8n</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFF7ED] text-[#F97316] font-medium">Proximamente</span>
                        </div>
                        <p className="text-[13px] text-[#71717A] mt-0.5">
                            Automatiza flujos de trabajo conectando Varylo con miles de apps.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" disabled className="shrink-0 opacity-50">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        Conectar
                    </Button>
                </div>
            </div>
        </div>
    );
}
