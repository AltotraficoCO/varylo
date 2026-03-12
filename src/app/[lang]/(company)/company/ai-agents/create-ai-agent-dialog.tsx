'use client';

import { useActionState, useState, useEffect } from 'react';
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

interface Channel {
    id: string;
    type: string;
}

export function CreateAiAgentDialog({ channels, hasGoogleCalendar, hasEcommerce }: { channels: Channel[]; hasGoogleCalendar: boolean; hasEcommerce: boolean }) {
    const [state, action, isPending] = useActionState(createAiAgent, undefined);
    const [open, setOpen] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [calendarEnabled, setCalendarEnabled] = useState(false);
    const [ecommerceEnabled, setEcommerceEnabled] = useState(false);

    useEffect(() => {
        if (state?.startsWith('Success')) {
            setOpen(false);
            setSelectedChannels([]);
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
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Agente IA
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo Agente IA</DialogTitle>
                    <DialogDescription>
                        Crea un agente de inteligencia artificial que responderá automáticamente a tus clientes.
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Ej. Asistente de Ventas"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="systemPrompt">Prompt del Sistema</Label>
                        <Textarea
                            id="systemPrompt"
                            name="systemPrompt"
                            placeholder="Eres un asistente de atención al cliente amable y profesional..."
                            rows={5}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Define la personalidad y comportamiento del agente IA.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contextInfo">Información de Contexto (opcional)</Label>
                        <Textarea
                            id="contextInfo"
                            name="contextInfo"
                            placeholder="Horarios de atención, productos, precios, políticas..."
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Información adicional que el agente usará para responder.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="model">Modelo</Label>
                            <Select name="model" defaultValue="gpt-4o-mini">
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
                            <Label htmlFor="temperature">Temperatura</Label>
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
                        <Label htmlFor="transferKeywords">Keywords de Transferencia</Label>
                        <Input
                            id="transferKeywords"
                            name="transferKeywords"
                            defaultValue="humano, agente, persona"
                            placeholder="humano, agente, persona"
                        />
                        <p className="text-xs text-muted-foreground">
                            Separadas por coma. Si el cliente escribe alguna, se transfiere a un humano.
                        </p>
                    </div>

                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="calendarEnabled" className="flex flex-col gap-1">
                                <span>Google Calendar</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasGoogleCalendar
                                        ? 'Permite al agente consultar disponibilidad y agendar reuniones.'
                                        : 'Conecta Google Calendar en Settings > IA y Créditos primero.'}
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
                                <Label htmlFor="calendarId">Calendar ID</Label>
                                <Input
                                    id="calendarId"
                                    name="calendarId"
                                    defaultValue="primary"
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
                            <Label htmlFor="ecommerceEnabled" className="flex flex-col gap-1">
                                <span>Tienda Online</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    {hasEcommerce
                                        ? 'Permite al agente consultar productos, precios e inventario.'
                                        : 'Conecta tu tienda en Settings > IA y Créditos primero.'}
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

                    <div className="space-y-2">
                        <Label>Canales</Label>
                        <div className="space-y-2 rounded-md border p-3">
                            {channels.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay canales configurados. Configura uno en Settings.</p>
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
                            Crear Agente IA
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
