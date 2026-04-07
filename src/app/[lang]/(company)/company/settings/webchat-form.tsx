'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, Loader2, RefreshCw, Check } from "lucide-react";
import { WebChatLogo } from "@/components/channel-logos";
import { activateWebChat, deactivateWebChat, regenerateWebChatKey, updateChannelPriority } from './actions';
import { toast } from 'sonner';

interface WebChatFormProps {
    isActive: boolean;
    apiKey: string | null;
    channelId: string | null;
    automationPriority: string;
}

export function WebChatForm({ isActive, apiKey, channelId, automationPriority }: WebChatFormProps) {
    const [loading, setLoading] = useState(false);
    const [currentKey, setCurrentKey] = useState(apiKey);
    const [active, setActive] = useState(isActive);
    const [copied, setCopied] = useState<string | null>(null);
    const [priority, setPriority] = useState(automationPriority);
    const [isSavingPriority, setIsSavingPriority] = useState(false);

    const apiUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/webchat`
        : 'https://tu-dominio.com/api/webchat';

    const handleActivate = async () => {
        setLoading(true);
        try {
            const result = await activateWebChat();
            if (result.success && result.apiKey) {
                setCurrentKey(result.apiKey);
                setActive(true);
                toast.success('Web Chat activado');
            } else {
                toast.error(result.error || 'Error al activar');
            }
        } catch {
            toast.error('Error inesperado');
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async () => {
        if (!confirm('¿Desactivar Web Chat? Las conversaciones existentes se mantendrán pero no se recibirán nuevos mensajes.')) return;
        setLoading(true);
        try {
            const result = await deactivateWebChat();
            if (result.success) {
                setActive(false);
                setCurrentKey(null);
                toast.success('Web Chat desactivado');
            } else {
                toast.error(result.error || 'Error al desactivar');
            }
        } catch {
            toast.error('Error inesperado');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        if (!confirm('¿Regenerar la API Key? La clave anterior dejará de funcionar inmediatamente.')) return;
        setLoading(true);
        try {
            const result = await regenerateWebChatKey();
            if (result.success && result.apiKey) {
                setCurrentKey(result.apiKey);
                toast.success('API Key regenerada');
            } else {
                toast.error(result.error || 'Error al regenerar');
            }
        } catch {
            toast.error('Error inesperado');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        toast.success('Copiado al portapapeles');
        setTimeout(() => setCopied(null), 2000);
    };

    const handlePriorityChange = async (newPriority: string) => {
        if (!channelId) return;
        setPriority(newPriority);
        setIsSavingPriority(true);
        try {
            await updateChannelPriority(channelId, newPriority as 'CHATBOT_FIRST' | 'AI_FIRST');
        } catch {
            setPriority(priority);
        } finally {
            setIsSavingPriority(false);
        }
    };

    if (active && currentKey) {
        return (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/10">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <CardTitle className="text-green-700">Web Chat Activo</CardTitle>
                    </div>
                    <CardDescription>
                        Tu canal de Web Chat está activo. Usa estas credenciales para conectar el chat de tu sitio web.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">API URL</Label>
                        <div className="flex gap-2">
                            <Input value={apiUrl} readOnly className="font-mono text-xs bg-background" />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopy(apiUrl, 'url')}
                                className="shrink-0 bg-background"
                            >
                                {copied === 'url' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">API Key</Label>
                        <div className="flex gap-2">
                            <Input value={currentKey} readOnly className="font-mono text-xs bg-background" />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopy(currentKey, 'key')}
                                className="shrink-0 bg-background"
                            >
                                {copied === 'key' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {channelId && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Prioridad de automatización</Label>
                            <select
                                value={priority}
                                onChange={(e) => handlePriorityChange(e.target.value)}
                                disabled={isSavingPriority}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="CHATBOT_FIRST">Chatbot primero (recomendado)</option>
                                <option value="AI_FIRST">Agente IA primero</option>
                            </select>
                        </div>
                    )}

                    <div className="p-3 rounded-md bg-background border text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">Integración rápida:</p>
                        <p>1. En tu sitio web, envía mensajes con <code className="bg-muted px-1 rounded">POST {apiUrl}</code></p>
                        <p>2. Header: <code className="bg-muted px-1 rounded">x-webchat-key: {currentKey.slice(0, 12)}...</code></p>
                        <p>3. Body: <code className="bg-muted px-1 rounded">{`{"action":"start_session"}`}</code> para iniciar</p>
                        <p>4. Luego: <code className="bg-muted px-1 rounded">{`{"action":"send_message","sessionId":"...","content":"Hola"}`}</code></p>
                        <p>5. Polling: <code className="bg-muted px-1 rounded">GET {apiUrl}?sessionId=...&after=timestamp</code></p>
                    </div>
                </CardContent>
                <CardFooter className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={handleRegenerate}
                        disabled={loading}
                        className="gap-1 bg-background"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerar Key
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeactivate}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Desactivar
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <WebChatLogo className="h-5 w-5" />
                    <CardTitle>Web Chat</CardTitle>
                </div>
                <CardDescription>
                    Conecta el chat de tu sitio web con Varylo. Los mensajes de tus visitantes llegarán aquí y podrás responder con IA o agentes humanos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Al activar se generará una API Key que debes configurar en tu sitio web para enviar y recibir mensajes.
                </p>
            </CardContent>
            <CardFooter>
                <Button onClick={handleActivate} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Activar Web Chat
                </Button>
            </CardFooter>
        </Card>
    );
}
