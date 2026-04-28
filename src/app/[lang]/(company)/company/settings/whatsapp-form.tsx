'use client';

import { useActionState, useState } from 'react';
import { saveWhatsAppCredentials } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

type TokenStatus = 'ACTIVE' | 'WARNING' | 'EXPIRED';

function daysUntil(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function WhatsAppConnectionForm({
    initialPhoneNumberId,
    initialVerifyToken,
    initialWabaId,
    hasAccessToken,
    channelId,
    automationPriority,
    phoneDisplay,
    connectionMode,
    tokenStatus,
    tokenExpiresAt,
}: {
    initialPhoneNumberId?: string,
    initialVerifyToken?: string,
    initialWabaId?: string,
    hasAccessToken?: boolean,
    channelId?: string | null,
    automationPriority?: string,
    phoneDisplay?: string,
    connectionMode?: 'oauth' | 'manual',
    tokenStatus?: string | null,
    tokenExpiresAt?: string | null,
}) {
    const [state, action, isPending] = useActionState(saveWhatsAppCredentials, undefined);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [priority, setPriority] = useState(automationPriority || 'CHATBOT_FIRST');
    const [isSavingPriority, setIsSavingPriority] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');
    const isConnected = hasAccessToken || isSuccess;
    const isOauth = connectionMode === 'oauth';
    const status = (tokenStatus as TokenStatus | null) || null;
    const daysLeft = daysUntil(tokenExpiresAt);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const { testWhatsAppConnection } = await import('./actions');
            const result = await testWhatsAppConnection();
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: 'Failed to run test.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        if (!channelId) return;
        setPriority(newPriority);
        setIsSavingPriority(true);
        try {
            const { updateChannelPriority } = await import('./actions');
            await updateChannelPriority(channelId, newPriority as 'CHATBOT_FIRST' | 'AI_FIRST');
        } catch {
            setPriority(priority);
        } finally {
            setIsSavingPriority(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar WhatsApp? Dejarás de recibir mensajes.')) return;
        setIsDisconnecting(true);
        try {
            const { disconnectWhatsApp } = await import('./actions');
            await disconnectWhatsApp();
        } catch {
            alert('Error al desconectar.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    if (isConnected) {
        const cardClass = status === 'EXPIRED'
            ? 'border-red-200 bg-red-50 dark:bg-red-950/10'
            : status === 'WARNING'
                ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/10'
                : 'border-green-200 bg-green-50 dark:bg-green-950/10';

        const titleClass = status === 'EXPIRED'
            ? 'text-red-700'
            : status === 'WARNING'
                ? 'text-amber-700'
                : 'text-green-700';

        const iconClass = status === 'EXPIRED'
            ? 'text-red-600'
            : status === 'WARNING'
                ? 'text-amber-600'
                : 'text-green-600';

        return (
            <Card className={cardClass}>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        {status === 'EXPIRED' || status === 'WARNING'
                            ? <AlertCircle className={`h-6 w-6 ${iconClass}`} />
                            : <CheckCircle2 className={`h-6 w-6 ${iconClass}`} />}
                        <CardTitle className={titleClass}>
                            {status === 'EXPIRED' ? 'WhatsApp Desconectado' : 'WhatsApp Configurado'}
                        </CardTitle>
                    </div>
                    <CardDescription>
                        {status === 'EXPIRED'
                            ? 'Tu conexión expiró. Reconecta para seguir enviando y recibiendo mensajes.'
                            : status === 'WARNING' && daysLeft !== null
                                ? `Tu conexión expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}. Reconecta pronto para no perder el servicio.`
                                : 'Tu cuenta de WhatsApp Business está conectada y lista para recibir mensajes.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {phoneDisplay && (
                        <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">Número</Label>
                            <p className="font-mono text-sm">{phoneDisplay}</p>
                        </div>
                    )}

                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Phone Number ID</Label>
                        <p className="font-mono text-sm">{initialPhoneNumberId}</p>
                    </div>

                    {isOauth && status === 'ACTIVE' && daysLeft !== null && (
                        <div className="text-xs text-muted-foreground">
                            Conexión válida por {daysLeft} día{daysLeft === 1 ? '' : 's'} más.
                        </div>
                    )}

                    {channelId && (
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Prioridad de automatización</Label>
                            <select
                                value={priority}
                                onChange={(e) => handlePriorityChange(e.target.value)}
                                disabled={isSavingPriority}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="CHATBOT_FIRST">Chatbot primero (recomendado)</option>
                                <option value="AI_FIRST">Agente IA primero</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                                {priority === 'CHATBOT_FIRST'
                                    ? 'Los mensajes pasan primero por el chatbot, luego al agente IA si no es manejado.'
                                    : 'Los mensajes pasan primero al agente IA, luego al chatbot si no es manejado.'}
                            </p>
                        </div>
                    )}

                    {testResult && (
                        <div className={`flex items-center gap-2 text-sm p-3 rounded-md bg-background border ${testResult.success ? 'text-green-600 border-green-200' : 'text-destructive border-red-200'}`}>
                            {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            {testResult.message}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex gap-3 justify-end flex-wrap">
                    {isOauth && (status === 'WARNING' || status === 'EXPIRED') && (
                        <Button
                            type="button"
                            onClick={() => { window.location.href = '/api/auth/meta/whatsapp/redirect'; }}
                            className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reconectar con Facebook
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting || isDisconnecting}
                        className="bg-background"
                    >
                        {isTesting ? 'Probando...' : 'Probar Conexión'}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting || isTesting}
                    >
                        {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conexión de WhatsApp Business</CardTitle>
                <CardDescription>
                    Conecta tu número de WhatsApp Business con un solo click.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button
                    type="button"
                    onClick={() => { window.location.href = '/api/auth/meta/whatsapp/redirect'; }}
                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                >
                    Conectar con Facebook
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                    Necesitas tener tu cuenta de WhatsApp Business creada en Meta Business Suite.
                </p>

                <div className="border-t pt-4">
                    <button
                        type="button"
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Configuración avanzada (usar mi propia app de Meta)
                    </button>

                    {advancedOpen && (
                        <form action={action} className="flex flex-col gap-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                                <Input
                                    id="phoneNumberId"
                                    name="phoneNumberId"
                                    placeholder="Ej. 10456..."
                                    defaultValue={initialPhoneNumberId}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accessToken">Permanent Access Token</Label>
                                <Input
                                    id="accessToken"
                                    name="accessToken"
                                    type="password"
                                    placeholder="EAAG..."
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appSecret">App Secret</Label>
                                <Input
                                    id="appSecret"
                                    name="appSecret"
                                    type="password"
                                    placeholder="Tu App Secret de Meta"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Meta for Developers → Tu App → Settings → Basic → App Secret
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="verifyToken">Verify Token (Webhook)</Label>
                                <Input
                                    id="verifyToken"
                                    name="verifyToken"
                                    placeholder="MiTokenSecreto"
                                    defaultValue={initialVerifyToken}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wabaId">WhatsApp Business Account ID (opcional)</Label>
                                <Input
                                    id="wabaId"
                                    name="wabaId"
                                    placeholder="Ej. 10234..."
                                    defaultValue={initialWabaId}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Necesario para enviar plantillas. Meta Business Suite → WhatsApp → Configuración → WABA ID
                                </p>
                            </div>

                            {isError && (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    {state}
                                </div>
                            )}

                            <Button type="submit" disabled={isPending} className="w-full">
                                {isPending ? 'Guardando...' : 'Guardar credenciales manuales'}
                            </Button>
                        </form>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
