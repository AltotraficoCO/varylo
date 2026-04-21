'use client';

import { useActionState, useState, useEffect } from 'react';
import { updateAiAgent } from './actions';
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
import { Loader2, Pencil } from "lucide-react";
import { AGENT_TYPE_CONFIGS, AI_AGENT_TYPES } from '@/lib/ai-agent-types';
import type { AiAgentType } from '@/lib/ai-agent-types';
import { useDictionary } from '@/lib/i18n-context';

interface AiAgentData {
    id: string;
    name: string;
    agentType: string;
    systemPrompt: string;
    contextInfo: string | null;
    model: string;
    temperature: number;
    transferKeywords: string[];
    channelIds: string[];
    dataCaptureEnabled: boolean;
    calendarEnabled: boolean;
    calendarId: string;
    ecommerceEnabled: boolean;
    webhookConfigJson: { url: string; secret?: string; headers?: Record<string, string> } | null;
}

interface Channel {
    id: string;
    type: string;
}

export function EditAiAgentDialog({ agent, channels, hasGoogleCalendar, hasEcommerce }: { agent: AiAgentData; channels: Channel[]; hasGoogleCalendar: boolean; hasEcommerce: boolean }) {
    const dict = useDictionary();
    const t = dict.aiAgents || {};
    const ui = dict.ui || {};
    const [state, action, isPending] = useActionState(updateAiAgent, undefined);
    const [open, setOpen] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>(agent.channelIds);
    const [agentType, setAgentType] = useState<AiAgentType>(
        (AI_AGENT_TYPES as readonly string[]).includes(agent.agentType) ? (agent.agentType as AiAgentType) : 'CUSTOM'
    );
    const [calendarEnabled, setCalendarEnabled] = useState(agent.calendarEnabled);
    const [ecommerceEnabled, setEcommerceEnabled] = useState(agent.ecommerceEnabled);
    const [dataCaptureEnabled, setDataCaptureEnabled] = useState(agent.dataCaptureEnabled);
    const [webhookEnabled, setWebhookEnabled] = useState(!!agent.webhookConfigJson?.url);
    const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);

    useEffect(() => {
        if (state?.startsWith('Success')) {
            setOpen(false);
        }
    }, [state]);

    const handleTypeChange = (type: AiAgentType) => {
        const config = AGENT_TYPE_CONFIGS[type];
        setAgentType(type);

        // Only replace prompt if the type has a default and user confirms
        if (config.defaultPrompt && type !== 'CUSTOM') {
            if (confirm(t.replacePromptConfirm)) {
                setSystemPrompt(config.defaultPrompt);
            }
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
                <Button variant="ghost" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    {t.editBtn || ui.edit}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t.editAgentTitle}</DialogTitle>
                    <DialogDescription>
                        {t.editAgentDesc}
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <input type="hidden" name="id" value={agent.id} />
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
                                        {AGENT_TYPE_CONFIGS[type].label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {(AGENT_TYPE_CONFIGS[agentType] || AGENT_TYPE_CONFIGS.CUSTOM).description}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-name">{ui.name}</Label>
                        <Input
                            id="edit-name"
                            name="name"
                            defaultValue={agent.name}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-systemPrompt">{t.systemPrompt}</Label>
                        <Textarea
                            id="edit-systemPrompt"
                            name="systemPrompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            rows={5}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-contextInfo">{t.contextInfo}</Label>
                        <Textarea
                            id="edit-contextInfo"
                            name="contextInfo"
                            defaultValue={agent.contextInfo || ''}
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-model">{t.model}</Label>
                            <Select name="model" defaultValue={agent.model}>
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
                            <Label htmlFor="edit-temperature">{t.temperature}</Label>
                            <Input
                                id="edit-temperature"
                                name="temperature"
                                type="number"
                                min="0"
                                max="2"
                                step="0.1"
                                defaultValue={agent.temperature}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-transferKeywords">{t.transferKeywords}</Label>
                        <Input
                            id="edit-transferKeywords"
                            name="transferKeywords"
                            defaultValue={agent.transferKeywords.join(', ')}
                            placeholder="humano, agente, persona"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t.transferKeywordsHint}
                        </p>
                    </div>

                    {/* Data Capture Toggle */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-dataCaptureEnabled" className="flex flex-col gap-1">
                                <span>{t.dataCaptureLabel}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {t.dataCaptureDesc}
                                </span>
                            </Label>
                            <Switch
                                id="edit-dataCaptureEnabled"
                                checked={dataCaptureEnabled}
                                onCheckedChange={setDataCaptureEnabled}
                            />
                        </div>
                        <input type="hidden" name="dataCaptureEnabled" value={dataCaptureEnabled ? 'on' : 'off'} />
                    </div>

                    {/* Calendar */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-calendarEnabled" className="flex flex-col gap-1">
                                <span>{t.googleCalendar}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasGoogleCalendar
                                        ? t.googleCalendarConnected
                                        : t.googleCalendarDisconnected}
                                </span>
                            </Label>
                            <Switch
                                id="edit-calendarEnabled"
                                checked={calendarEnabled}
                                onCheckedChange={setCalendarEnabled}
                                disabled={!hasGoogleCalendar}
                            />
                        </div>
                        <input type="hidden" name="calendarEnabled" value={calendarEnabled ? 'on' : 'off'} />
                        {calendarEnabled && (
                            <div className="space-y-2 mt-2">
                                <Label htmlFor="edit-calendarId">{t.calendarIdLabel}</Label>
                                <Input
                                    id="edit-calendarId"
                                    name="calendarId"
                                    defaultValue={agent.calendarId}
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
                            <Label htmlFor="edit-ecommerceEnabled" className="flex flex-col gap-1">
                                <span>{t.onlineStore}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasEcommerce
                                        ? t.onlineStoreConnected
                                        : t.onlineStoreDisconnected}
                                </span>
                            </Label>
                            <Switch
                                id="edit-ecommerceEnabled"
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
                            <Label htmlFor="edit-webhookEnabled" className="flex flex-col gap-1">
                                <span>{t.webhookErp}</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {t.webhookErpDesc}
                                </span>
                            </Label>
                            <Switch
                                id="edit-webhookEnabled"
                                checked={webhookEnabled}
                                onCheckedChange={setWebhookEnabled}
                            />
                        </div>
                        {webhookEnabled && (
                            <div className="space-y-3 mt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-webhookUrl">{t.webhookUrlLabel}</Label>
                                    <Input
                                        id="edit-webhookUrl"
                                        name="webhookUrl"
                                        defaultValue={agent.webhookConfigJson?.url || ''}
                                        placeholder="https://tu-erp.com/api/webhook"
                                        required={webhookEnabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-webhookSecret">{t.webhookSecretLabel}</Label>
                                    <Input
                                        id="edit-webhookSecret"
                                        name="webhookSecret"
                                        defaultValue={agent.webhookConfigJson?.secret || ''}
                                        placeholder={t.webhookSecretPlaceholder}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-webhookHeaders">{t.webhookHeadersLabel}</Label>
                                    <Textarea
                                        id="edit-webhookHeaders"
                                        name="webhookHeaders"
                                        defaultValue={agent.webhookConfigJson?.headers ? JSON.stringify(agent.webhookConfigJson.headers, null, 2) : ''}
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
                            {channels.map(channel => (
                                <div key={channel.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`edit-channel-${channel.id}`}
                                        checked={selectedChannels.includes(channel.id)}
                                        onCheckedChange={() => toggleChannel(channel.id)}
                                    />
                                    <input
                                        type="hidden"
                                        name="channelIds"
                                        value={channel.id}
                                        disabled={!selectedChannels.includes(channel.id)}
                                    />
                                    <Label htmlFor={`edit-channel-${channel.id}`} className="font-normal cursor-pointer">
                                        {channel.type}
                                    </Label>
                                </div>
                            ))}
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
                            {t.saveChanges}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
