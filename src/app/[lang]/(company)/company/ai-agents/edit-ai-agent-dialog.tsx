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
    const [state, action, isPending] = useActionState(updateAiAgent, undefined);
    const [open, setOpen] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>(agent.channelIds);
    const [agentType, setAgentType] = useState<AiAgentType>((agent.agentType as AiAgentType) || 'CUSTOM');
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
            if (confirm('¿Quieres reemplazar el prompt actual con el del tipo seleccionado?')) {
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
                    Editar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Agente IA</DialogTitle>
                    <DialogDescription>
                        Modifica la configuración del agente IA.
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <input type="hidden" name="id" value={agent.id} />
                    <input type="hidden" name="agentType" value={agentType} />

                    {/* Agent Type Selector */}
                    <div className="space-y-2">
                        <Label>Tipo de Agente</Label>
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
                            {AGENT_TYPE_CONFIGS[agentType].description}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Nombre</Label>
                        <Input
                            id="edit-name"
                            name="name"
                            defaultValue={agent.name}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-systemPrompt">Prompt del Sistema</Label>
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
                        <Label htmlFor="edit-contextInfo">Información de Contexto</Label>
                        <Textarea
                            id="edit-contextInfo"
                            name="contextInfo"
                            defaultValue={agent.contextInfo || ''}
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-model">Modelo</Label>
                            <Select name="model" defaultValue={agent.model}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Rápido)</SelectItem>
                                    <SelectItem value="gpt-4o">GPT-4o (Inteligente)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-temperature">Temperatura</Label>
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
                        <Label htmlFor="edit-transferKeywords">Keywords de Transferencia</Label>
                        <Input
                            id="edit-transferKeywords"
                            name="transferKeywords"
                            defaultValue={agent.transferKeywords.join(', ')}
                            placeholder="humano, agente, persona"
                        />
                        <p className="text-xs text-muted-foreground">
                            Separadas por coma. Si el cliente escribe alguna, se transfiere a un humano.
                        </p>
                    </div>

                    {/* Data Capture Toggle */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-dataCaptureEnabled" className="flex flex-col gap-1">
                                <span>Captura de Datos</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    Permite al agente capturar automáticamente datos del cliente (nombre, email, teléfono, documentos).
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
                                <span>Google Calendar</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasGoogleCalendar
                                        ? 'Permite al agente consultar disponibilidad y agendar reuniones.'
                                        : 'Conecta Google Calendar en Settings > IA y Créditos primero.'}
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
                                <Label htmlFor="edit-calendarId">Calendar ID</Label>
                                <Input
                                    id="edit-calendarId"
                                    name="calendarId"
                                    defaultValue={agent.calendarId}
                                    placeholder="primary"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Usa &quot;primary&quot; para el calendario principal o el ID de otro calendario.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Ecommerce */}
                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-ecommerceEnabled" className="flex flex-col gap-1">
                                <span>Tienda Online</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasEcommerce
                                        ? 'Permite al agente consultar productos, precios e inventario.'
                                        : 'Conecta tu tienda en Settings > IA y Créditos primero.'}
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
                                <span>Webhook (ERP/CRM)</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    Envía los datos capturados a un sistema externo cuando el agente lo decida.
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
                                    <Label htmlFor="edit-webhookUrl">URL del Webhook</Label>
                                    <Input
                                        id="edit-webhookUrl"
                                        name="webhookUrl"
                                        defaultValue={agent.webhookConfigJson?.url || ''}
                                        placeholder="https://tu-erp.com/api/webhook"
                                        required={webhookEnabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-webhookSecret">Secret (opcional)</Label>
                                    <Input
                                        id="edit-webhookSecret"
                                        name="webhookSecret"
                                        defaultValue={agent.webhookConfigJson?.secret || ''}
                                        placeholder="Clave secreta para firmar payloads (HMAC-SHA256)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-webhookHeaders">Headers personalizados (opcional)</Label>
                                    <Textarea
                                        id="edit-webhookHeaders"
                                        name="webhookHeaders"
                                        defaultValue={agent.webhookConfigJson?.headers ? JSON.stringify(agent.webhookConfigJson.headers, null, 2) : ''}
                                        placeholder='{"Authorization": "Bearer tu-api-key"}'
                                        rows={2}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        JSON con headers adicionales. Ej: {`{"Authorization": "Bearer key"}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Channels */}
                    <div className="space-y-2">
                        <Label>Canales</Label>
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
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
