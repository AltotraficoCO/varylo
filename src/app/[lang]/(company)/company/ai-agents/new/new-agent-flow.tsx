'use client';

import { useState, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    ArrowLeft, Search, Sparkles, Loader2, ChevronRight,
    Brain, Calendar, ShoppingBag, Webhook, FileText, Zap,
    Plus, X, GripVertical, Kanban,
} from 'lucide-react';
import { AGENT_TYPE_CONFIGS, AGENT_CATEGORIES, type AiAgentType } from '@/lib/ai-agent-types';
import { createAiAgent } from '../actions';
import { useDictionary } from '@/lib/i18n-context';

type Channel = { id: string; type: string };

interface NewAgentFlowProps {
    lang: string;
    channels: Channel[];
    hasGoogleCalendar: boolean;
    hasShopify: boolean;
    hasWooCommerce: boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
    WHATSAPP: 'WhatsApp',
    INSTAGRAM: 'Instagram',
    WEB_CHAT: 'Web Chat',
    MESSENGER: 'Messenger',
    TELEGRAM: 'Telegram',
};

export function NewAgentFlow({ lang, channels, hasGoogleCalendar, hasShopify, hasWooCommerce }: NewAgentFlowProps) {
    const dict = useDictionary();
    const t = dict.aiAgents || {};
    const ui = dict.ui || {};
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedType, setSelectedType] = useState<AiAgentType | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Form state for step 2
    const [name, setName] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [contextInfo, setContextInfo] = useState('');
    const [model, setModel] = useState('gpt-4o-mini');
    const [temperature, setTemperature] = useState('0.7');
    const [transferKeywords, setTransferKeywords] = useState('humano, agente, persona');
    const [dataCaptureEnabled, setDataCaptureEnabled] = useState(true);
    const [captureFields, setCaptureFields] = useState<{ key: string; label: string; required: boolean }[]>([
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'email', label: 'Email', required: false },
        { key: 'telefono', label: 'Teléfono', required: false },
    ]);
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [calendarEnabled, setCalendarEnabled] = useState(false);
    const [shopifyEnabled, setShopifyEnabled] = useState(false);
    const [woocommerceEnabled, setWoocommerceEnabled] = useState(false);
    const [crmEnabled, setCrmEnabled] = useState(false);
    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

    const [state, formAction, isPending] = useActionState(createAiAgent, undefined);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');

    if (isSuccess) {
        router.push(`/${lang}/company/ai-agents`);
    }

    function selectTemplate(type: AiAgentType) {
        const config = AGENT_TYPE_CONFIGS[type];
        setSelectedType(type);
        setName(config.label !== 'Personalizado' ? `Agente ${config.label}` : '');
        setSystemPrompt(config.defaultPrompt);
        setDataCaptureEnabled(config.suggestedCapabilities.dataCaptureEnabled);
        setCalendarEnabled(config.suggestedCapabilities.calendarEnabled && hasGoogleCalendar);
        setShopifyEnabled(config.suggestedCapabilities.ecommerceEnabled && hasShopify);
        setWoocommerceEnabled(config.suggestedCapabilities.ecommerceEnabled && hasWooCommerce);
        setCrmEnabled(config.suggestedCapabilities.crmEnabled);
        setWebhookEnabled(config.suggestedCapabilities.webhookEnabled);
        setStep(2);
    }

    // Filter templates
    const templateEntries = Object.entries(AGENT_TYPE_CONFIGS) as [AiAgentType, typeof AGENT_TYPE_CONFIGS[AiAgentType]][];
    const filtered = templateEntries.filter(([, config]) => {
        if (categoryFilter !== 'all' && config.category !== categoryFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return config.label.toLowerCase().includes(q) || config.description.toLowerCase().includes(q);
        }
        return true;
    });

    // ===== STEP 1: Template Selection =====
    if (step === 1) {
        return (
            <div className="space-y-6 max-w-5xl">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/${lang}/company/ai-agents`)}
                        className="h-10 w-10 rounded-xl border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[#09090B]">{t.createAgentPage}</h1>
                        <p className="text-[14px] text-[#71717A] mt-0.5">{t.createAgentPageDesc}</p>
                    </div>
                </div>

                {/* Search + Category filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
                        <Input
                            placeholder={t.searchTemplate}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl border-[#E4E4E7] text-[14px] placeholder:text-[#A1A1AA]"
                        />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {AGENT_CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setCategoryFilter(cat.key)}
                                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                                    categoryFilter === cat.key
                                        ? 'bg-[#09090B] text-white shadow-sm'
                                        : 'bg-white border border-[#E4E4E7] text-[#3F3F46] hover:border-[#D4D4D8] hover:bg-[#FAFAFA]'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(([type, config], index) => (
                        <button
                            key={type}
                            onClick={() => selectTemplate(type)}
                            className="group relative bg-white rounded-2xl border border-[#E4E4E7] p-5 text-left transition-all duration-200 hover:border-[#10B981] hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            {/* Emoji + Category */}
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
                                    style={{ backgroundColor: config.bgColor }}
                                >
                                    {config.icon}
                                </div>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#71717A]">
                                    {config.category}
                                </span>
                            </div>

                            {/* Name + Description */}
                            <h3 className="text-[15px] font-semibold text-[#09090B] mb-1.5 group-hover:text-[#10B981] transition-colors">
                                {config.label}
                            </h3>
                            <p className="text-[13px] text-[#71717A] leading-relaxed line-clamp-2">
                                {config.description}
                            </p>

                            {/* Capabilities */}
                            <div className="flex gap-1.5 mt-4">
                                {config.suggestedCapabilities.dataCaptureEnabled && (
                                    <span className="h-6 px-2 rounded-md bg-[#F4F4F5] text-[#71717A] text-[10px] font-medium flex items-center gap-1">
                                        <FileText className="h-2.5 w-2.5" /> Datos
                                    </span>
                                )}
                                {config.suggestedCapabilities.calendarEnabled && (
                                    <span className="h-6 px-2 rounded-md bg-[#EFF6FF] text-[#3B82F6] text-[10px] font-medium flex items-center gap-1">
                                        <Calendar className="h-2.5 w-2.5" /> Calendar
                                    </span>
                                )}
                                {config.suggestedCapabilities.ecommerceEnabled && (
                                    <span className="h-6 px-2 rounded-md bg-[#F5F3FF] text-[#8B5CF6] text-[10px] font-medium flex items-center gap-1">
                                        <ShoppingBag className="h-2.5 w-2.5" /> Tienda
                                    </span>
                                )}
                                {config.suggestedCapabilities.webhookEnabled && (
                                    <span className="h-6 px-2 rounded-md bg-[#FFF7ED] text-[#F97316] text-[10px] font-medium flex items-center gap-1">
                                        <Webhook className="h-2.5 w-2.5" /> Webhook
                                    </span>
                                )}
                            </div>

                            {/* Hover arrow */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="h-5 w-5 text-[#10B981]" />
                            </div>
                        </button>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="text-center py-16">
                        <Sparkles className="h-8 w-8 text-[#A1A1AA] mx-auto mb-3" />
                        <p className="text-[#71717A]">{t.noTemplatesFound}</p>
                    </div>
                )}
            </div>
        );
    }

    // ===== STEP 2: Configuration =====
    const config = selectedType ? AGENT_TYPE_CONFIGS[selectedType] : null;

    return (
        <div className="max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setStep(1)}
                    className="h-10 w-10 rounded-xl border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                    {config && (
                        <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ backgroundColor: config.bgColor }}
                        >
                            {config.icon}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-[#09090B]">{t.configureAgent}</h1>
                        <p className="text-[14px] text-[#71717A] mt-0.5">
                            {config ? `${t.templateLabel} ${config.label}` : t.customLabel} — {t.customizeDetails}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error message */}
            {isError && (
                <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-[14px] text-[#DC2626]">
                    {state?.replace('Error: ', '')}
                </div>
            )}

            <form action={formAction} className="space-y-6">
                {/* Hidden fields */}
                <input type="hidden" name="agentType" value={selectedType || 'CUSTOM'} />
                <input type="hidden" name="model" value={model} />
                <input type="hidden" name="temperature" value={temperature} />
                <input type="hidden" name="transferKeywords" value={transferKeywords} />
                <input type="hidden" name="dataCaptureEnabled" value={dataCaptureEnabled ? 'on' : 'off'} />
                <input type="hidden" name="captureFields" value={JSON.stringify(captureFields)} />
                <input type="hidden" name="calendarEnabled" value={calendarEnabled ? 'on' : 'off'} />
                <input type="hidden" name="calendarId" value="primary" />
                <input type="hidden" name="ecommerceEnabled" value={(shopifyEnabled || woocommerceEnabled) ? 'on' : 'off'} />
                <input type="hidden" name="crmEnabled" value={crmEnabled ? 'on' : 'off'} />
                {webhookEnabled && webhookUrl && <input type="hidden" name="webhookUrl" value={webhookUrl} />}
                {selectedChannels.map(id => (
                    <input key={id} type="hidden" name="channelIds" value={id} />
                ))}

                {/* Section: Basic Info */}
                <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                        <h2 className="text-[15px] font-semibold text-[#09090B]">{t.basicInfo}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">{t.agentNameLabel}</Label>
                            <Input
                                name="name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={t.agentNamePlaceholder}
                                className="h-10 rounded-lg border-[#E4E4E7] text-[14px]"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">{t.systemPromptLabel}</Label>
                            <Textarea
                                name="systemPrompt"
                                value={systemPrompt}
                                onChange={e => setSystemPrompt(e.target.value)}
                                placeholder={t.promptInstructions}
                                rows={8}
                                className="rounded-lg border-[#E4E4E7] text-[14px] resize-none"
                                required
                            />
                            <p className="text-[12px] text-[#A1A1AA]">{t.systemPromptHint}</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">
                                {t.additionalContext} <span className="text-[#A1A1AA] font-normal">({t.contextInfoOptionalLabel || ui.optional})</span>
                            </Label>
                            <Textarea
                                name="contextInfo"
                                value={contextInfo}
                                onChange={e => setContextInfo(e.target.value)}
                                placeholder={t.contextInfoPlaceholder2}
                                rows={3}
                                className="rounded-lg border-[#E4E4E7] text-[14px] resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Model & Behavior */}
                <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                        <h2 className="text-[15px] font-semibold text-[#09090B]">{t.modelAndBehavior}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46]">{t.modelLabel}</Label>
                                <select
                                    value={model}
                                    onChange={e => setModel(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-[#E4E4E7] bg-white px-3 text-[14px] text-[#09090B]"
                                >
                                    <option value="gpt-4o-mini">{t.modelFastEconomic}</option>
                                    <option value="gpt-4o">{t.modelSmarter}</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46]">{t.temperatureLabel}: {temperature}</Label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={temperature}
                                    onChange={e => setTemperature(e.target.value)}
                                    className="w-full h-10 accent-[#10B981]"
                                />
                                <div className="flex justify-between text-[11px] text-[#A1A1AA]">
                                    <span>{t.precise}</span>
                                    <span>{t.creative}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#3F3F46]">{t.transferToHumanWords}</Label>
                            <Input
                                value={transferKeywords}
                                onChange={e => setTransferKeywords(e.target.value)}
                                placeholder="humano, agente, persona"
                                className="h-10 rounded-lg border-[#E4E4E7] text-[14px]"
                            />
                            <p className="text-[12px] text-[#A1A1AA]">{t.transferToHumanWordsHint}</p>
                        </div>
                    </div>
                </div>

                {/* Section: Capabilities */}
                <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                        <h2 className="text-[15px] font-semibold text-[#09090B]">{t.capabilities}</h2>
                    </div>
                    <div className="divide-y divide-[#F4F4F5]">
                        {/* Data Capture */}
                        <div className="px-6 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-[#10B981]" />
                                    </div>
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
                                        <div key={idx} className="flex items-center gap-2 group">
                                            <span className="text-[#D4D4D8]"><GripVertical className="h-3.5 w-3.5" /></span>
                                            <div className="flex-1 flex items-center gap-2 rounded-lg border border-[#E4E4E7] px-3 py-2">
                                                <span className="text-[13px] text-[#09090B] flex-1">{field.label}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCaptureFields(prev =>
                                                        prev.map((f, i) => i === idx ? { ...f, required: !f.required } : f)
                                                    )}
                                                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                                                        field.required
                                                            ? 'bg-[#ECFDF5] text-[#10B981]'
                                                            : 'bg-[#F4F4F5] text-[#A1A1AA]'
                                                    }`}
                                                >
                                                    {field.required ? t.mandatory : t.optionalField}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCaptureFields(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-[#D4D4D8] hover:text-[#EF4444] transition-colors p-1"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Add new field */}
                                    <div className="flex items-center gap-2">
                                        <span className="w-[18px]" />
                                        <Input
                                            value={newFieldLabel}
                                            onChange={e => setNewFieldLabel(e.target.value)}
                                            placeholder={t.newFieldPlaceholder2}
                                            className="h-9 rounded-lg border-[#E4E4E7] text-[13px] flex-1"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newFieldLabel.trim()) {
                                                    e.preventDefault();
                                                    const key = newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                                    if (captureFields.some(f => f.key === key)) return;
                                                    setCaptureFields(prev => [...prev, { key, label: newFieldLabel.trim(), required: false }]);
                                                    setNewFieldLabel('');
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (!newFieldLabel.trim()) return;
                                                const key = newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                                if (captureFields.some(f => f.key === key)) return;
                                                setCaptureFields(prev => [...prev, { key, label: newFieldLabel.trim(), required: false }]);
                                                setNewFieldLabel('');
                                            }}
                                            className="h-9 rounded-lg border-[#E4E4E7]"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Google Calendar */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-[#3B82F6]" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">{t.googleCalendar}</p>
                                    <p className="text-[12px] text-[#71717A]">
                                        {hasGoogleCalendar ? t.scheduleAppointments : t.connectCalendarIntegrations}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={calendarEnabled}
                                onCheckedChange={setCalendarEnabled}
                                disabled={!hasGoogleCalendar}
                            />
                        </div>

                        {/* Shopify */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                                    <ShoppingBag className="h-4 w-4 text-[#16A34A]" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">{t.shopify}</p>
                                    <p className="text-[12px] text-[#71717A]">
                                        {hasShopify ? t.shopifyProducts : t.shopifyConnect}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={shopifyEnabled}
                                onCheckedChange={setShopifyEnabled}
                                disabled={!hasShopify}
                            />
                        </div>

                        {/* WordPress / WooCommerce */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                                    <ShoppingBag className="h-4 w-4 text-[#2563EB]" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">{t.wordpress}</p>
                                    <p className="text-[12px] text-[#71717A]">
                                        {hasWooCommerce ? t.wordpressProducts : t.wordpressConnect}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={woocommerceEnabled}
                                onCheckedChange={setWoocommerceEnabled}
                                disabled={!hasWooCommerce}
                            />
                        </div>

                        {/* CRM Pipeline */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                                    <Kanban className="h-4 w-4 text-[#10B981]" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">{t.crmPipeline}</p>
                                    <p className="text-[12px] text-[#71717A]">{t.crmPipelineDescFull}</p>
                                </div>
                            </div>
                            <Switch checked={crmEnabled} onCheckedChange={setCrmEnabled} />
                        </div>

                        {/* Webhook */}
                        <div className="px-6 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-[#FFF7ED] flex items-center justify-center">
                                        <Webhook className="h-4 w-4 text-[#F97316]" />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-medium text-[#09090B]">{t.webhookErpTitle}</p>
                                        <p className="text-[12px] text-[#71717A]">{t.webhookSendCaptured}</p>
                                    </div>
                                </div>
                                <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
                            </div>
                            {webhookEnabled && (
                                <div className="ml-12 space-y-1.5">
                                    <Input
                                        value={webhookUrl}
                                        onChange={e => setWebhookUrl(e.target.value)}
                                        placeholder="https://tu-erp.com/api/webhook"
                                        className="h-9 rounded-lg border-[#E4E4E7] text-[13px]"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section: Channels */}
                {channels.length > 0 && (
                    <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                            <h2 className="text-[15px] font-semibold text-[#09090B]">{t.channels}</h2>
                            <p className="text-[12px] text-[#71717A] mt-0.5">{t.channelsSubtitle}</p>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {channels.map(ch => {
                                    const isSelected = selectedChannels.includes(ch.id);
                                    return (
                                        <button
                                            key={ch.id}
                                            type="button"
                                            onClick={() => setSelectedChannels(prev =>
                                                isSelected ? prev.filter(id => id !== ch.id) : [...prev, ch.id]
                                            )}
                                            className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${
                                                isSelected
                                                    ? 'bg-[#ECFDF5] border-[#10B981] text-[#059669]'
                                                    : 'bg-white border-[#E4E4E7] text-[#3F3F46] hover:border-[#D4D4D8]'
                                            }`}
                                        >
                                            {CHANNEL_LABELS[ch.type] || ch.type}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 pb-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="rounded-lg border-[#E4E4E7] text-[14px]"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        {t.changeTemplate}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[14px] font-medium px-6"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                            <Sparkles className="h-4 w-4 mr-1.5" />
                        )}
                        {t.createAgentBtn2}
                    </Button>
                </div>
            </form>
        </div>
    );
}
