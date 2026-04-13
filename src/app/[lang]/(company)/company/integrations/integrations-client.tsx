'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings2, Trash2, Loader2, Plus, Zap, TestTube, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { OpenAIKeyForm } from '../settings/openai-form';
import { AnthropicKeyForm } from '../settings/anthropic-form';
import { GeminiKeyForm } from '../settings/gemini-form';
import { GoogleCalendarForm } from '../settings/google-calendar-form';
import { EcommerceForm } from '../settings/ecommerce-form';
import { disconnectEcommerceById, createWebhookIntegration, deleteWebhookIntegration, testWebhookIntegration } from './actions';
import { AVAILABLE_EVENTS } from './constants';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDictionary } from '@/lib/i18n-context';

type EcommerceStore = {
    id: string;
    name: string;
    platform: string;
    storeUrl: string;
    active: boolean;
    createdAt: string;
};

type N8nIntegration = {
    id: string;
    name: string;
    platform: string;
    webhookUrl: string;
    events: string[];
    active: boolean;
    lastUsedAt: string | null;
    createdAt: string;
};

type IntegrationsClientProps = {
    openai: {
        hasApiKey: boolean;
        updatedAt: string | null;
    };
    anthropic: {
        hasApiKey: boolean;
        updatedAt: string | null;
    };
    gemini: {
        hasApiKey: boolean;
        updatedAt: string | null;
    };
    googleCalendar: {
        isConnected: boolean;
        email: string | null;
        connectedAt: string | null;
    };
    ecommerceStores: EcommerceStore[];
    n8nIntegrations: N8nIntegration[];
};

export function IntegrationsClient({ openai, anthropic, gemini, googleCalendar, ecommerceStores, n8nIntegrations }: IntegrationsClientProps) {
    const [activeView, setActiveView] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();
    const dict = useDictionary();
    const t = dict.settingsUI?.integrationsClient || {};
    const ui = dict.ui || {};

    // n8n form state
    const [n8nUrl, setN8nUrl] = useState('');
    const [n8nName, setN8nName] = useState('');
    const [n8nSecret, setN8nSecret] = useState('');
    const [n8nEvents, setN8nEvents] = useState<string[]>(['message.received', 'conversation.created', 'data.captured']);
    const [n8nSaving, setN8nSaving] = useState(false);
    const [n8nTesting, setN8nTesting] = useState(false);
    const [n8nTestResult, setN8nTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const shopifyStores = ecommerceStores.filter(s => s.platform === 'shopify');
    const wooStores = ecommerceStores.filter(s => s.platform === 'woocommerce');

    async function handleDeleteN8n(integrationId: string) {
        if (!confirm(t.deleteConfirm || 'Eliminar esta integración?')) return;
        setDeletingId(integrationId);
        const result = await deleteWebhookIntegration(integrationId);
        if (result.success) {
            toast.success(t.integrationDeleted || 'Integración eliminada');
            router.refresh();
        } else {
            toast.error(result.error || 'Error');
        }
        setDeletingId(null);
    }

    async function handleCreateN8n() {
        if (!n8nUrl.trim()) { toast.error(t.webhookUrlRequired || 'URL del webhook es obligatoria'); return; }
        if (n8nEvents.length === 0) { toast.error(t.selectAtLeastOneEvent || 'Selecciona al menos un evento'); return; }
        setN8nSaving(true);
        const result = await createWebhookIntegration({
            platform: 'n8n',
            name: n8nName.trim() || 'n8n Webhook',
            webhookUrl: n8nUrl.trim(),
            secret: n8nSecret.trim() || undefined,
            events: n8nEvents,
        });
        if (result.success) {
            toast.success(t.n8nConnected || 'n8n conectado exitosamente');
            setN8nUrl(''); setN8nName(''); setN8nSecret('');
            setActiveView(null);
            router.refresh();
        } else {
            toast.error(result.error || 'Error');
        }
        setN8nSaving(false);
    }

    async function handleTestN8n() {
        if (!n8nUrl.trim()) { toast.error(t.enterUrlFirst || 'Ingresa la URL primero'); return; }
        setN8nTesting(true);
        setN8nTestResult(null);
        const result = await testWebhookIntegration(n8nUrl.trim());
        setN8nTestResult(result);
        setN8nTesting(false);
    }

    async function handleDeleteStore(storeId: string) {
        if (!confirm(t.disconnectStoreConfirm || 'Desconectar esta tienda?')) return;
        setDeletingId(storeId);
        const result = await disconnectEcommerceById(storeId);
        if (result.success) {
            toast.success(t.storeDisconnected || 'Tienda desconectada');
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
                    <ArrowLeft className="h-4 w-4" /> {t.backToIntegrations || 'Volver a integraciones'}
                </Button>
                <OpenAIKeyForm hasApiKey={openai.hasApiKey} updatedAt={openai.updatedAt} />
            </div>
        );
    }

    if (activeView === 'anthropic') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t.backToIntegrations || 'Volver a integraciones'}
                </Button>
                <AnthropicKeyForm hasApiKey={anthropic.hasApiKey} updatedAt={anthropic.updatedAt} />
            </div>
        );
    }

    if (activeView === 'gemini') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t.backToIntegrations || 'Volver a integraciones'}
                </Button>
                <GeminiKeyForm hasApiKey={gemini.hasApiKey} updatedAt={gemini.updatedAt} />
            </div>
        );
    }

    if (activeView === 'google-calendar') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t.backToIntegrations || 'Volver a integraciones'}
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
                    <ArrowLeft className="h-4 w-4" /> {t.backToIntegrations || 'Volver a integraciones'}
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
                    <ArrowLeft className="h-4 w-4" /> {t.backToIntegrations || 'Volver a integraciones'}
                </Button>
                <StoreList stores={wooStores} />
                <EcommerceForm isConnected={false} platform="woocommerce" storeUrl={null} />
            </div>
        );
    }

    if (activeView === 'add-n8n') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveView(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t.backToIntegrations || 'Volver a integraciones'}
                </Button>

                {/* Existing n8n integrations */}
                {n8nIntegrations.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-[14px] font-medium text-[#09090B]">Webhooks conectados</h3>
                        {n8nIntegrations.map(integration => (
                            <div key={integration.id} className="flex items-center justify-between rounded-lg border border-[#E4E4E7] px-4 py-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-medium text-[#09090B]">{integration.name}</span>
                                        {integration.active ? (
                                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#10B981] font-medium">Activo</span>
                                        ) : (
                                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#71717A] font-medium">Inactivo</span>
                                        )}
                                    </div>
                                    <p className="text-[12px] text-[#71717A] truncate max-w-[400px]">{integration.webhookUrl}</p>
                                    <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                                        Eventos: {integration.events.join(', ')}
                                        {integration.lastUsedAt && ` · Ultimo uso: ${new Date(integration.lastUsedAt).toLocaleDateString('es-CO')}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteN8n(integration.id)}
                                    disabled={deletingId === integration.id}
                                    className="text-[#A1A1AA] hover:text-[#EF4444] transition-colors p-1.5 rounded-md hover:bg-red-50"
                                >
                                    {deletingId === integration.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add new n8n webhook */}
                <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                        <h3 className="text-[15px] font-semibold text-[#09090B]">Conectar n8n</h3>
                        <p className="text-[12px] text-[#71717A] mt-0.5">Configura un webhook para recibir eventos de Varylo en n8n</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">Nombre</Label>
                            <Input
                                value={n8nName}
                                onChange={e => setN8nName(e.target.value)}
                                placeholder="Mi flujo de n8n"
                                className="h-10 rounded-lg border-[#E4E4E7] text-[14px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">URL del Webhook</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={n8nUrl}
                                    onChange={e => setN8nUrl(e.target.value)}
                                    placeholder="https://tu-n8n.com/webhook/xxx"
                                    className="h-10 rounded-lg border-[#E4E4E7] text-[14px] flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleTestN8n}
                                    disabled={n8nTesting || !n8nUrl.trim()}
                                    className="h-10 rounded-lg"
                                >
                                    {n8nTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                                </Button>
                            </div>
                            {n8nTestResult && (
                                <p className={`text-[12px] ${n8nTestResult.success ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                    {n8nTestResult.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">
                                Secret <span className="text-[#A1A1AA] font-normal">(opcional)</span>
                            </Label>
                            <Input
                                value={n8nSecret}
                                onChange={e => setN8nSecret(e.target.value)}
                                placeholder="HMAC secret para firmar los payloads"
                                className="h-10 rounded-lg border-[#E4E4E7] text-[14px]"
                                type="password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">Eventos</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {AVAILABLE_EVENTS.map(evt => (
                                    <label key={evt.key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E4E4E7] cursor-pointer hover:bg-[#FAFAFA]">
                                        <Checkbox
                                            checked={n8nEvents.includes(evt.key)}
                                            onCheckedChange={(checked) => {
                                                setN8nEvents(prev =>
                                                    checked ? [...prev, evt.key] : prev.filter(e => e !== evt.key)
                                                );
                                            }}
                                        />
                                        <span className="text-[13px] text-[#3F3F46]">{evt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <Button
                            onClick={handleCreateN8n}
                            disabled={n8nSaving}
                            className="w-full rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium"
                        >
                            {n8nSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                            <Zap className="h-4 w-4 mr-1.5" />
                            Conectar webhook
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-[#09090B]">{t.title || 'Integraciones'}</h1>
                <p className="text-sm text-[#71717A] mt-1">
                    {t.description || 'Conecta servicios externos para potenciar tu espacio de trabajo.'}
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
                            {t.openaiDesc || 'Conecta tu API Key de OpenAI para usar modelos de IA en tus agentes.'}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveView('openai')} className="shrink-0">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        {openai.hasApiKey ? 'Gestionar' : 'Conectar'}
                    </Button>
                </div>

                {/* Anthropic Claude */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <div className="h-11 w-11 rounded-lg bg-[#FFF8F0] flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#D97757">
                            <path d="M17.304 3.541 12.836 16H10.16l4.469-12.459h2.675ZM13.421 16 8.953 3.541H6.277L10.745 16h2.676Z"/>
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#09090B]">Anthropic Claude</span>
                            {anthropic.hasApiKey && (
                                <Badge variant="default" className="text-[11px] px-2 py-0">Conectado</Badge>
                            )}
                        </div>
                        <p className="text-[13px] text-[#71717A] mt-0.5">
                            Conecta tu API Key para usar modelos Claude en tus agentes IA.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveView('anthropic')} className="shrink-0">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        {anthropic.hasApiKey ? 'Gestionar' : 'Conectar'}
                    </Button>
                </div>

                {/* Google Gemini */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <div className="h-11 w-11 rounded-lg bg-[#F0F8FF] flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                            <path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.304 14.304 0 0 0 12 12 14.304 14.304 0 0 0-12 12z" fill="url(#geminiGrad)"/>
                            <defs>
                                <linearGradient id="geminiGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#4285F4"/>
                                    <stop offset="1" stopColor="#0F9D58"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#09090B]">Google Gemini</span>
                            {gemini.hasApiKey && (
                                <Badge variant="default" className="text-[11px] px-2 py-0">Conectado</Badge>
                            )}
                        </div>
                        <p className="text-[13px] text-[#71717A] mt-0.5">
                            Conecta tu API Key de Google AI Studio para usar modelos Gemini.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveView('gemini')} className="shrink-0">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        {gemini.hasApiKey ? 'Gestionar' : 'Conectar'}
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
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-lg bg-[#FFF1F0] flex items-center justify-center shrink-0 overflow-hidden">
                                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#EA4B71"/>
                                    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">n8n</text>
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[15px] font-medium text-[#09090B]">n8n</span>
                                    {n8nIntegrations.length > 0 && (
                                        <Badge variant="default" className="text-[11px] px-2 py-0">{n8nIntegrations.length} conectado{n8nIntegrations.length > 1 ? 's' : ''}</Badge>
                                    )}
                                </div>
                                <p className="text-[13px] text-[#71717A] mt-0.5">
                                    Automatiza flujos conectando Varylo con miles de apps via webhooks.
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setActiveView('add-n8n')} className="shrink-0">
                            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                            {n8nIntegrations.length > 0 ? 'Gestionar' : 'Conectar'}
                        </Button>
                    </div>

                    {/* Connected n8n webhooks */}
                    {n8nIntegrations.length > 0 && (
                        <div className="ml-14 space-y-2">
                            {n8nIntegrations.map(integration => (
                                <div key={integration.id} className="flex items-center justify-between rounded-lg border border-[#E4E4E7] px-4 py-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-medium text-[#09090B]">{integration.name}</span>
                                            {integration.active ? (
                                                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                                            ) : (
                                                <span className="h-2 w-2 rounded-full bg-[#A1A1AA]" />
                                            )}
                                        </div>
                                        <p className="text-[12px] text-[#71717A] truncate max-w-[300px]">{integration.webhookUrl}</p>
                                        <p className="text-[11px] text-[#A1A1AA]">{integration.events.length} evento{integration.events.length > 1 ? 's' : ''}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteN8n(integration.id)}
                                        disabled={deletingId === integration.id}
                                        className="text-[#A1A1AA] hover:text-[#EF4444] transition-colors p-1.5 rounded-md hover:bg-red-50"
                                    >
                                        {deletingId === integration.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
