'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { createAiAgent } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { AGENT_TYPE_CONFIGS, AI_AGENT_TYPES } from '@/lib/ai-agent-types';
import type { AiAgentType } from '@/lib/ai-agent-types';
import { useDictionary } from '@/lib/i18n-context';

interface Channel {
    id: string;
    type: string;
}

export function CreateAiAgentDialog({ channels, hasGoogleCalendar, hasEcommerce }: { channels: Channel[]; hasGoogleCalendar: boolean; hasEcommerce: boolean }) {
    const dict = useDictionary();
    const t = dict.aiAgents || {};
    const ui = dict.ui || {};
    const [state, action, isPending] = useActionState(createAiAgent, undefined);
    const [open, setOpen] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [agentType, setAgentType] = useState<AiAgentType>('CUSTOM');
    const [calendarEnabled, setCalendarEnabled] = useState(false);
    const [ecommerceEnabled, setEcommerceEnabled] = useState(false);
    const [dataCaptureEnabled, setDataCaptureEnabled] = useState(true);
    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');

    const promptRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (state?.startsWith('Success')) {
            setOpen(false);
            setSelectedChannels([]);
            setAgentType('CUSTOM');
            setSystemPrompt('');
        }
    }, [state]);

    const handleTypeChange = (type: AiAgentType) => {
        setAgentType(type);
        const config = AGENT_TYPE_CONFIGS[type];

        // Pre-fill system prompt
        if (config.defaultPrompt) {
            setSystemPrompt(config.defaultPrompt);
        }

        // Apply suggested capabilities
        setDataCaptureEnabled(config.suggestedCapabilities.dataCaptureEnabled);
        setWebhookEnabled(config.suggestedCapabilities.webhookEnabled);
        if (hasGoogleCalendar) setCalendarEnabled(config.suggestedCapabilities.calendarEnabled);
        if (hasEcommerce) setEcommerceEnabled(config.suggestedCapabilities.ecommerceEnabled);
    };

    const toggleChannel = (channelId: string) => {
        setSelectedChannels(prev =>
            prev.includes(channelId)
                ? prev.filter(id => id !== channelId)
                : [...prev, channelId]
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="text-white font-semibold text-sm"
                    style={{
                        backgroundColor: '#10B981',
                        borderRadius: '8px',
                        padding: '10px 20px',
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    {t.newAgent}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t.newAgentTitle}</DialogTitle>
                    <DialogDescription>
                        {t.newAgentDesc}
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <input type="hidden" name="agentType" value={agentType} />

                    {/* Agent Type Selector */}
                    <div className="space-y-2">
                        <Label>{t.agentTypeLabel}</Label>
                        <Select value={agentType} onValueChange={(v) => handleTypeChange(v as AiAgentType)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {AI_AGENT_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>
                                        <div className="flex flex-col">
                                            <span>{AGENT_TYPE_CONFIGS[type].label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {AGENT_TYPE_CONFIGS[agentType].description}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">{ui.name}</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t.agentNamePlaceholder}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="systemPrompt">{t.systemPrompt}</Label>
                        <Textarea
                            id="systemPrompt"
                            name="systemPrompt"
                            ref={promptRef}
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder={t.systemPromptPlaceholder}
                            rows={5}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            {t.agentTypeDesc}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contextInfo">{t.contextInfoOptional}</Label>
                        <Textarea
                            id="contextInfo"
                            name="contextInfo"
                            placeholder={t.contextInfoPlaceholder}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t.contextInfoHint}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="model">{t.model}</Label>
                            <Select name="model" defaultValue="gpt-4o-mini">
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4o-mini">GPT-4o Mini — Rápido y económico</SelectItem>
                                    <SelectItem value="gpt-4o">GPT-4o — Más inteligente</SelectItem>
                                    <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — Rápido</SelectItem>
                                    <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6 — Equilibrado</SelectItem>
                                    <SelectItem value="claude-opus-4-6">Claude Opus 4.6 — Avanzado</SelectItem>
                                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash — Rápido y económico</SelectItem>
                                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro — Avanzado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="temperature">{t.temperature}</Label>
                            <Input
                                id="temperature"
                                name="temperature"
                                type="number"
                                min="0"
                                max="2"
                                step="0.1"
                                defaultValue="0.7"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="transferKeywords">{t.transferKeywords}</Label>
                        <Input
                            id="transferKeywords"
                            name="transferKeywords"
                            defaultValue="humano, agente, persona"
                            placeholder="humano, agente, persona"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t.transferKeywordsHint}
                        </p>
                    </div>

                    {/* Data Capture Toggle */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="dataCaptureEnabled" className="flex flex-col gap-1">
                                <span>{t.dataCaptureLabel}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {t.dataCaptureDesc}
                                </span>
                            </Label>
                            <Switch
                                id="dataCaptureEnabled"
                                checked={dataCaptureEnabled}
                                onCheckedChange={setDataCaptureEnabled}
                            />
                        </div>
                        <input type="hidden" name="dataCaptureEnabled" value={dataCaptureEnabled ? 'on' : 'off'} />
                    </div>

                    {/* Calendar */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="calendarEnabled" className="flex flex-col gap-1">
                                <span>{t.googleCalendar}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasGoogleCalendar
                                        ? t.googleCalendarConnected
                                        : t.googleCalendarDisconnected}
                                </span>
                            </Label>
                            <Switch
                                id="calendarEnabled"
                                checked={calendarEnabled}
                                onCheckedChange={setCalendarEnabled}
                                disabled={!hasGoogleCalendar}
                            />
                        </div>
                        <input type="hidden" name="calendarEnabled" value={calendarEnabled ? 'on' : 'off'} />
                        {calendarEnabled && (
                            <div className="space-y-2 mt-2">
                                <Label htmlFor="calendarId">{t.calendarIdLabel}</Label>
                                <Input
                                    id="calendarId"
                                    name="calendarId"
                                    defaultValue="primary"
                                    placeholder="primary"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t.calendarIdHint}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Ecommerce */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="ecommerceEnabled" className="flex flex-col gap-1">
                                <span>{t.onlineStore}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasEcommerce
                                        ? t.onlineStoreConnected
                                        : t.onlineStoreDisconnected}
                                </span>
                            </Label>
                            <Switch
                                id="ecommerceEnabled"
                                checked={ecommerceEnabled}
                                onCheckedChange={setEcommerceEnabled}
                                disabled={!hasEcommerce}
                            />
                        </div>
                        <input type="hidden" name="ecommerceEnabled" value={ecommerceEnabled ? 'on' : 'off'} />
                    </div>

                    {/* Webhook */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="webhookEnabled" className="flex flex-col gap-1">
                                <span>{t.webhookErp}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {t.webhookErpDesc}
                                </span>
                            </Label>
                            <Switch
                                id="webhookEnabled"
                                checked={webhookEnabled}
                                onCheckedChange={setWebhookEnabled}
                            />
                        </div>
                        {webhookEnabled && (
                            <div className="space-y-3 mt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="webhookUrl">{t.webhookUrlLabel}</Label>
                                    <Input
                                        id="webhookUrl"
                                        name="webhookUrl"
                                        placeholder="https://tu-erp.com/api/webhook"
                                        required={webhookEnabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="webhookSecret">{t.webhookSecretLabel}</Label>
                                    <Input
                                        id="webhookSecret"
                                        name="webhookSecret"
                                        placeholder={t.webhookSecretPlaceholder}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="webhookHeaders">{t.webhookHeadersLabel}</Label>
                                    <Textarea
                                        id="webhookHeaders"
                                        name="webhookHeaders"
                                        placeholder='{"Authorization": "Bearer tu-api-key"}'
                                        rows={2}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t.webhookHeadersHint} {`{"Authorization": "Bearer key"}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Channels */}
                    <div className="space-y-2">
                        <Label>{t.channels}</Label>
                        <div className="space-y-2 rounded-md border p-3">
                            {channels.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t.noChannelsConfigured}</p>
                            ) : (
                                channels.map(channel => (
                                    <div key={channel.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`channel-${channel.id}`}
                                            checked={selectedChannels.includes(channel.id)}
                                            onCheckedChange={() => toggleChannel(channel.id)}
                                        />
                                        <input
                                            type="hidden"
                                            name="channelIds"
                                            value={channel.id}
                                            disabled={!selectedChannels.includes(channel.id)}
                                        />
                                        <Label htmlFor={`channel-${channel.id}`} className="font-normal cursor-pointer">
                                            {channel.type}
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {state && (
                        <div className={`text-sm text-center ${state.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                            {state}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.createAgentBtn}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
