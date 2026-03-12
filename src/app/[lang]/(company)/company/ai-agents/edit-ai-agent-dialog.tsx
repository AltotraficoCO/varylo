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

interface AiAgentData {
    id: string;
    name: string;
    systemPrompt: string;
    contextInfo: string | null;
    model: string;
    temperature: number;
    transferKeywords: string[];
    channelIds: string[];
    calendarEnabled: boolean;
    calendarId: string;
    ecommerceEnabled: boolean;
}

interface Channel {
    id: string;
    type: string;
}

export function EditAiAgentDialog({ agent, channels, hasGoogleCalendar, hasEcommerce }: { agent: AiAgentData; channels: Channel[]; hasGoogleCalendar: boolean; hasEcommerce: boolean }) {
    const [state, action, isPending] = useActionState(updateAiAgent, undefined);
    const [open, setOpen] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>(agent.channelIds);
    const [calendarEnabled, setCalendarEnabled] = useState(agent.calendarEnabled);
    const [ecommerceEnabled, setEcommerceEnabled] = useState(agent.ecommerceEnabled);

    useEffect(() => {
        if (state?.startsWith('Success')) {
            setOpen(false);
        }
    }, [state]);

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
                            defaultValue={agent.systemPrompt}
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
