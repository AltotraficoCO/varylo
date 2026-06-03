'use client';

import { useState, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    ArrowLeft, Sparkles, Loader2, Calendar, ShoppingBag, Webhook, FileText,
    Plus, X, GripVertical, Pencil, Send, CheckCircle2, AlertCircle, Megaphone, Clock,
} from 'lucide-react';
import { updateAiAgent, testWebhook, type TestWebhookResult } from '../../actions';
import { useDictionary } from '@/lib/i18n-context';
import { PlaygroundPanel } from './playground-panel';

type Channel = { id: string; type: string; label?: string };
type FollowupStep = { delayMinutes: number; text?: string; templateName?: string; templateLang?: string };

const CHANNEL_LABELS: Record<string, string> = {
    WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', WEB_CHAT: 'Web Chat', MESSENGER: 'Messenger', TELEGRAM: 'Telegram',
};

interface EditAgentFlowProps {
    lang: string;
    agent: {
        id: string;
        name: string;
        agentType: string;
        systemPrompt: string;
        contextInfo: string;
        model: string;
        temperature: number;
        bufferSeconds: number;
        transferKeywords: string;
        dataCaptureEnabled: boolean;
        captureFields: { key: string; label: string; required: boolean }[] | null;
        calendarEnabled: boolean;
        ecommerceEnabled: boolean;
        crmEnabled: boolean;
        handlesAdLeads: boolean;
        followupJson: { enabled?: boolean; steps?: FollowupStep[] } | null;
        webhookConfigJson: { url?: string; secret?: string } | null;
        channelIds: string[];
    };
    channels: Channel[];
    hasGoogleCalendar: boolean;
    hasShopify: boolean;
    hasWooCommerce: boolean;
}

export function EditAgentFlow({ lang, agent, channels, hasGoogleCalendar, hasShopify, hasWooCommerce }: EditAgentFlowProps) {
    const dict = useDictionary();
    const t = dict.aiAgents || {};
    const ui = dict.ui || {};
    const router = useRouter();

    const [name, setName] = useState(agent.name);
    const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
    const [contextInfo, setContextInfo] = useState(agent.contextInfo);
    const [model, setModel] = useState(agent.model);
    const [temperature, setTemperature] = useState(String(agent.temperature));
    const [bufferSeconds, setBufferSeconds] = useState(String(agent.bufferSeconds ?? 0));
    const [transferKeywords, setTransferKeywords] = useState(agent.transferKeywords);
    const [dataCaptureEnabled, setDataCaptureEnabled] = useState(agent.dataCaptureEnabled);
    const [captureFields, setCaptureFields] = useState(agent.captureFields || [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'email', label: 'Email', required: false },
        { key: 'telefono', label: 'Teléfono', required: false },
    ]);
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [calendarEnabled, setCalendarEnabled] = useState(agent.calendarEnabled);
    const [handlesAdLeads, setHandlesAdLeads] = useState(agent.handlesAdLeads);
    const [followupEnabled, setFollowupEnabled] = useState(!!agent.followupJson?.enabled);
    const [followupSteps, setFollowupSteps] = useState<FollowupStep[]>(agent.followupJson?.steps || []);
    const [shopifyEnabled, setShopifyEnabled] = useState(agent.ecommerceEnabled && hasShopify);
    const [woocommerceEnabled, setWoocommerceEnabled] = useState(agent.ecommerceEnabled && hasWooCommerce);
    const [webhookEnabled, setWebhookEnabled] = useState(!!agent.webhookConfigJson?.url);
    const [webhookUrl, setWebhookUrl] = useState(agent.webhookConfigJson?.url || '');
    const [webhookTesting, setWebhookTesting] = useState(false);
    const [webhookTestResult, setWebhookTestResult] = useState<TestWebhookResult | null>(null);
    const [selectedChannels, setSelectedChannels] = useState<string[]>(agent.channelIds);

    const handleTestWebhook = async () => {
        setWebhookTesting(true);
        setWebhookTestResult(null);
        try {
            const result = await testWebhook({ url: webhookUrl, secret: agent.webhookConfigJson?.secret });
            setWebhookTestResult(result);
        } catch {
            setWebhookTestResult({ ok: false, error: 'Error inesperado al probar el webhook.' });
        } finally {
            setWebhookTesting(false);
        }
    };

    const [state, formAction, isPending] = useActionState(updateAiAgent, undefined);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');

    if (isSuccess) {
        router.push(`/${lang}/company/ai-agents`);
    }

    return (
        <div className="max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push(`/${lang}/company/ai-agents`)}
                    className="h-10 w-10 rounded-xl border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                        <Pencil className="h-5 w-5 text-[#3B82F6]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#09090B]">{t.editAgentPage}</h1>
                        <p className="text-[14px] text-[#71717A] mt-0.5">{agent.name}</p>
                    </div>
                </div>
            </div>

            {isError && (
                <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-[14px] text-[#DC2626]">
                    {state?.replace('Error: ', '')}
                </div>
            )}

            <form action={formAction} className="space-y-6">
                <input type="hidden" name="id" value={agent.id} />
                <input type="hidden" name="agentType" value={agent.agentType} />
                <input type="hidden" name="model" value={model} />
                <input type="hidden" name="temperature" value={temperature} />
                <input type="hidden" name="bufferSeconds" value={bufferSeconds} />
                <input type="hidden" name="transferKeywords" value={transferKeywords} />
                <input type="hidden" name="dataCaptureEnabled" value={dataCaptureEnabled ? 'on' : 'off'} />
                <input type="hidden" name="captureFields" value={JSON.stringify(captureFields)} />
                <input type="hidden" name="calendarEnabled" value={calendarEnabled ? 'on' : 'off'} />
                <input type="hidden" name="calendarId" value="primary" />
                <input type="hidden" name="ecommerceEnabled" value={(shopifyEnabled || woocommerceEnabled) ? 'on' : 'off'} />
                <input type="hidden" name="crmEnabled" value="off" />
                <input type="hidden" name="handlesAdLeads" value={handlesAdLeads ? 'on' : 'off'} />
                <input type="hidden" name="followupEnabled" value={followupEnabled ? 'on' : 'off'} />
                <input type="hidden" name="followupSteps" value={JSON.stringify(followupSteps)} />
                {webhookEnabled && webhookUrl && <input type="hidden" name="webhookUrl" value={webhookUrl} />}
                {selectedChannels.map(id => (
                    <input key={id} type="hidden" name="channelIds" value={id} />
                ))}

                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                        <h2 className="text-[15px] font-semibold text-[#09090B]">{t.basicInfo}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">{t.agentNameLabel}</Label>
                            <Input name="name" value={name} onChange={e => setName(e.target.value)} className="h-10 rounded-lg border-[#E4E4E7] text-[14px]" required />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">{t.systemPromptLabel}</Label>
                            <Textarea name="systemPrompt" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={8} className="rounded-lg border-[#E4E4E7] text-[14px] resize-none [field-sizing:fixed] max-h-80 overflow-y-auto" required />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">{t.additionalContext}</Label>
                            <Textarea name="contextInfo" value={contextInfo} onChange={e => setContextInfo(e.target.value)} rows={3} className="rounded-lg border-[#E4E4E7] text-[14px] resize-none [field-sizing:fixed] max-h-48 overflow-y-auto" />
                        </div>
                    </div>
                </div>

                {/* Model */}
                <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                        <h2 className="text-[15px] font-semibold text-[#09090B]">{t.modelAndBehavior}</h2>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46]">{t.modelLabel}</Label>
                                <select value={model} onChange={e => setModel(e.target.value)} className="w-full h-10 rounded-lg border border-[#E4E4E7] bg-white px-3 text-[14px]">
                                    <optgroup label="OpenAI">
                                        <option value="gpt-5.4-mini">GPT-5.4 Mini — Rápido y económico</option>
                                        <option value="gpt-5.4">GPT-5.4 — Equilibrado</option>
                                        <option value="gpt-5.5">GPT-5.5 — Más inteligente</option>
                                        <option value="gpt-4o-mini">GPT-4o Mini — Anterior</option>
                                        <option value="gpt-4o">GPT-4o — Anterior</option>
                                    </optgroup>
                                    <optgroup label="Anthropic Claude">
                                        <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — Rápido</option>
                                        <option value="claude-sonnet-4-6">Claude Sonnet 4.6 — Equilibrado</option>
                                        <option value="claude-opus-4-8">Claude Opus 4.8 — Más avanzado</option>
                                        <option value="claude-opus-4-6">Claude Opus 4.6 — Anterior</option>
                                    </optgroup>
                                    <optgroup label="Google Gemini">
                                        <option value="gemini-3.5-flash">Gemini 3.5 Flash — Más reciente</option>
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro — Avanzado</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash — Rápido y económico</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash — Anterior</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro — Anterior</option>
                                    </optgroup>
                                    <optgroup label="DeepSeek">
                                        <option value="deepseek-chat">DeepSeek Chat — Rápido y económico</option>
                                        <option value="deepseek-reasoner">DeepSeek Reasoner — Razonamiento avanzado</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46]">{t.temperatureLabel}: {temperature}</Label>
                                <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} className="w-full h-10 accent-[#10B981]" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">{t.transferWordsLabel}</Label>
                            <Input value={transferKeywords} onChange={e => setTransferKeywords(e.target.value)} className="h-10 rounded-lg border-[#E4E4E7] text-[14px]" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">Agrupar mensajes (segundos de espera)</Label>
                            <select
                                value={bufferSeconds}
                                onChange={e => setBufferSeconds(e.target.value)}
                                className="w-full h-10 rounded-lg border border-[#E4E4E7] text-[14px] px-3 bg-white"
                            >
                                <option value="0">Responder de inmediato</option>
                                <option value="5">Esperar 5 segundos</option>
                                <option value="8">Esperar 8 segundos</option>
                                <option value="10">Esperar 10 segundos</option>
                                <option value="15">Esperar 15 segundos</option>
                            </select>
                            <p className="text-[12px] text-[#A1A1AA]">Si el cliente envía varios mensajes seguidos, el agente espera este tiempo y responde a todos juntos en vez de contestar cada fragmento por separado.</p>
                        </div>
                    </div>
                </div>

                {/* Capabilities */}
                <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                        <h2 className="text-[15px] font-semibold text-[#09090B]">{t.capabilities}</h2>
                    </div>
                    <div className="divide-y divide-[#F4F4F5]">
                        {/* Data Capture */}
                        <div className="px-6 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-[#ECFDF5] flex items-center justify-center"><FileText className="h-4 w-4 text-[#10B981]" /></div>
                                    <div>
                                        <p className="text-[14px] font-medium text-[#09090B]">{t.dataCaptureTitle}</p>
                                        <p className="text-[12px] text-[#71717A]">{t.dataCaptureSubtitle}</p>
                                    </div>
                                </div>
                                <Switch checked={dataCaptureEnabled} onCheckedChange={setDataCaptureEnabled} />
                            </div>
                            {dataCaptureEnabled && (
                                <div className="ml-12 space-y-2">
                                    {captureFields.map((field, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-[#D4D4D8]"><GripVertical className="h-3.5 w-3.5" /></span>
                                            <div className="flex-1 flex items-center gap-2 rounded-lg border border-[#E4E4E7] px-3 py-2">
                                                <span className="text-[13px] text-[#09090B] flex-1">{field.label}</span>
                                                <button type="button" onClick={() => setCaptureFields(prev => prev.map((f, i) => i === idx ? { ...f, required: !f.required } : f))}
                                                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${field.required ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#F4F4F5] text-[#A1A1AA]'}`}>
                                                    {field.required ? t.mandatory : t.optionalField}
                                                </button>
                                            </div>
                                            <button type="button" onClick={() => setCaptureFields(prev => prev.filter((_, i) => i !== idx))} className="text-[#D4D4D8] hover:text-[#EF4444] p-1"><X className="h-3.5 w-3.5" /></button>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2">
                                        <span className="w-[18px]" />
                                        <Input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder={t.newFieldPlaceholder} className="h-9 rounded-lg text-[13px] flex-1"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newFieldLabel.trim()) {
                                                    e.preventDefault();
                                                    const key = newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                                    if (!captureFields.some(f => f.key === key)) {
                                                        setCaptureFields(prev => [...prev, { key, label: newFieldLabel.trim(), required: false }]);
                                                        setNewFieldLabel('');
                                                    }
                                                }
                                            }} />
                                        <Button type="button" variant="outline" size="sm" onClick={() => {
                                            if (!newFieldLabel.trim()) return;
                                            const key = newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                            if (!captureFields.some(f => f.key === key)) {
                                                setCaptureFields(prev => [...prev, { key, label: newFieldLabel.trim(), required: false }]);
                                                setNewFieldLabel('');
                                            }
                                        }} className="h-9 rounded-lg"><Plus className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Calendar */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center"><Calendar className="h-4 w-4 text-[#3B82F6]" /></div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">{t.googleCalendar}</p>
                                    <p className="text-[12px] text-[#71717A]">{hasGoogleCalendar ? t.scheduleAppointments : t.connectCalendarFirst}</p>
                                </div>
                            </div>
                            <Switch checked={calendarEnabled} onCheckedChange={setCalendarEnabled} disabled={!hasGoogleCalendar} />
                        </div>

                        {/* Shopify */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#F0FDF4] flex items-center justify-center"><ShoppingBag className="h-4 w-4 text-[#16A34A]" /></div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">{t.shopify}</p>
                                    <p className="text-[12px] text-[#71717A]">{hasShopify ? t.shopifyConnected : t.shopifyDisconnected}</p>
                                </div>
                            </div>
                            <Switch checked={shopifyEnabled} onCheckedChange={setShopifyEnabled} disabled={!hasShopify} />
                        </div>

                        {/* WordPress */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center"><ShoppingBag className="h-4 w-4 text-[#2563EB]" /></div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">{t.wordpress}</p>
                                    <p className="text-[12px] text-[#71717A]">{hasWooCommerce ? t.wordpressConnected : t.wordpressDisconnected}</p>
                                </div>
                            </div>
                            <Switch checked={woocommerceEnabled} onCheckedChange={setWoocommerceEnabled} disabled={!hasWooCommerce} />
                        </div>

                        {/* Ad leads (Click-to-WhatsApp / pauta) */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#ECFEFF] flex items-center justify-center"><Megaphone className="h-4 w-4 text-[#0891B2]" /></div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">Atender leads de anuncios (pauta)</p>
                                    <p className="text-[12px] text-[#71717A]">Solo este agente atiende los chats que llegan desde un anuncio Click-to-WhatsApp de Meta.</p>
                                </div>
                            </div>
                            <Switch checked={handlesAdLeads} onCheckedChange={setHandlesAdLeads} />
                        </div>

                        {/* Seguimientos automáticos */}
                        <div className="px-6 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-[#FEF2F2] flex items-center justify-center"><Clock className="h-4 w-4 text-[#DC2626]" /></div>
                                    <div>
                                        <p className="text-[14px] font-medium text-[#09090B]">Seguimientos automáticos</p>
                                        <p className="text-[12px] text-[#71717A]">Re-contacta al cliente si deja de responder.</p>
                                    </div>
                                </div>
                                <Switch checked={followupEnabled} onCheckedChange={setFollowupEnabled} />
                            </div>
                            {followupEnabled && (
                                <div className="ml-12 space-y-3">
                                    {followupSteps.map((step, i) => (
                                        <div key={i} className="rounded-lg border p-3 space-y-2 bg-[#FAFAFA]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-medium">Paso {i + 1}</span>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFollowupSteps(prev => prev.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] text-muted-foreground">Esperar</span>
                                                <Input type="number" min={1} value={Math.round((step.delayMinutes || 0) / 60) || ''}
                                                    onChange={e => { const h = parseInt(e.target.value || '0', 10) || 0; setFollowupSteps(prev => prev.map((s, j) => j === i ? { ...s, delayMinutes: h * 60 } : s)); }}
                                                    className="h-8 w-20 text-[13px]" />
                                                <span className="text-[12px] text-muted-foreground">horas sin respuesta del cliente</span>
                                            </div>
                                            <Textarea value={step.text || ''} onChange={e => setFollowupSteps(prev => prev.map((s, j) => j === i ? { ...s, text: e.target.value } : s))}
                                                placeholder="Mensaje (se usa si está dentro de 24h)" className="text-[12px] min-h-[60px]" />
                                            <Input value={step.templateName || ''} onChange={e => setFollowupSteps(prev => prev.map((s, j) => j === i ? { ...s, templateName: e.target.value } : s))}
                                                placeholder="Plantilla aprobada (para >24h, opcional)" className="h-8 text-[12px]" />
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => setFollowupSteps(prev => [...prev, { delayMinutes: 1440, text: '' }])}><Plus className="mr-2 h-3.5 w-3.5" />Agregar paso</Button>
                                    <p className="text-[11px] text-muted-foreground">WhatsApp solo permite texto libre dentro de las 24h del último mensaje del cliente. Para pasos posteriores (días después) necesitas una <span className="font-medium">plantilla aprobada</span> por Meta.</p>
                                </div>
                            )}
                        </div>

                        {/* Webhook */}
                        <div className="px-6 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-[#FFF7ED] flex items-center justify-center"><Webhook className="h-4 w-4 text-[#F97316]" /></div>
                                    <div>
                                        <p className="text-[14px] font-medium text-[#09090B]">{t.webhookErpTitle}</p>
                                        <p className="text-[12px] text-[#71717A]">{t.webhookErpSubtitle}</p>
                                    </div>
                                </div>
                                <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
                            </div>
                            {webhookEnabled && (
                                <div className="ml-12 space-y-2">
                                    <div className="flex gap-2">
                                        <Input value={webhookUrl} onChange={e => { setWebhookUrl(e.target.value); setWebhookTestResult(null); }} placeholder="https://tu-erp.com/api/webhook" className="h-9 rounded-lg border-[#E4E4E7] text-[13px]" />
                                        <Button type="button" variant="outline" onClick={handleTestWebhook} disabled={webhookTesting || !webhookUrl.trim()} className="h-9 shrink-0 gap-1.5 rounded-lg border-[#E4E4E7] text-[13px]">
                                            {webhookTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                            {t.testWebhook || 'Probar'}
                                        </Button>
                                    </div>
                                    {webhookTestResult && (
                                        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] ${webhookTestResult.ok ? 'border-[#10B981]/30 bg-[#ECFDF5] text-[#047857]' : 'border-[#EF4444]/30 bg-[#FEF2F2] text-[#B91C1C]'}`}>
                                            {webhookTestResult.ok
                                                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                                : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                                            <div className="space-y-0.5">
                                                <p className="font-medium">
                                                    {webhookTestResult.ok
                                                        ? `${t.testWebhookOk || 'Webhook OK'}${webhookTestResult.status ? ` (HTTP ${webhookTestResult.status})` : ''}${webhookTestResult.durationMs != null ? ` · ${webhookTestResult.durationMs} ms` : ''}`
                                                        : `${t.testWebhookFail || 'Falló la prueba'}${webhookTestResult.status ? ` (HTTP ${webhookTestResult.status})` : ''}`}
                                                </p>
                                                {!webhookTestResult.ok && webhookTestResult.error && <p className="opacity-90">{webhookTestResult.error}</p>}
                                                {webhookTestResult.hint && <p className="opacity-90">{webhookTestResult.hint}</p>}
                                                {webhookTestResult.ok && <p className="opacity-90">{t.testWebhookOkHint || 'Se envió un payload de prueba con datos de ejemplo.'}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Channels */}
                {channels.length > 0 && (
                    <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                            <h2 className="text-[15px] font-semibold text-[#09090B]">{t.channels}</h2>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {channels.map(ch => {
                                    const isSelected = selectedChannels.includes(ch.id);
                                    return (
                                        <button key={ch.id} type="button"
                                            onClick={() => setSelectedChannels(prev => isSelected ? prev.filter(id => id !== ch.id) : [...prev, ch.id])}
                                            className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${isSelected ? 'bg-[#ECFDF5] border-[#10B981] text-[#059669]' : 'bg-white border-[#E4E4E7] text-[#3F3F46] hover:border-[#D4D4D8]'}`}>
                                            {CHANNEL_LABELS[ch.type] || ch.type}{ch.label ? ` · ${ch.label}` : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 pb-8">
                    <Button type="button" variant="outline" onClick={() => router.push(`/${lang}/company/ai-agents`)} className="rounded-lg border-[#E4E4E7] text-[14px]">
                        <ArrowLeft className="h-4 w-4 mr-1.5" /> {t.cancelBtn || ui.cancel}
                    </Button>
                    <Button type="submit" disabled={isPending} className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[14px] font-medium px-6">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                        {t.saveChangesBtn}
                    </Button>
                </div>
            </form>

            {/* Test the agent with a simulated conversation */}
            <PlaygroundPanel agentId={agent.id} />
        </div>
    );
}
