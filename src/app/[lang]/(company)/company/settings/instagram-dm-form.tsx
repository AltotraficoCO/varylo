'use client';

import { useActionState, useState, useMemo } from 'react';
import { saveInstagramCredentials } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Copy, Check } from "lucide-react";

function generateVerifyToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'varylo_';
    for (let i = 0; i < 24; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function InstagramDMForm({
    initialPageId,
    initialVerifyToken,
    hasAccessToken,
    channelId,
    automationPriority,
}: {
    initialPageId?: string;
    initialVerifyToken?: string;
    hasAccessToken?: boolean;
    channelId?: string | null;
    automationPriority?: string;
}) {
    const [state, action, isPending] = useActionState(saveInstagramCredentials, undefined);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [priority, setPriority] = useState(automationPriority || 'CHATBOT_FIRST');
    const [isSavingPriority, setIsSavingPriority] = useState(false);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');
    const isConnected = hasAccessToken || isSuccess;
    const [copied, setCopied] = useState(false);

    // Generate a stable verify token per mount (or use existing one)
    const verifyToken = useMemo(() => initialVerifyToken || generateVerifyToken(), [initialVerifyToken]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const { testInstagramConnection } = await import('./actions');
            const result = await testInstagramConnection();
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: 'Error al probar conexión.' });
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
        if (!confirm('¿Estás seguro de que quieres desconectar Instagram? Dejarás de recibir DMs.')) return;

        setIsDisconnecting(true);
        try {
            const { disconnectInstagram } = await import('./actions');
            await disconnectInstagram();
        } catch {
            alert('Error al desconectar.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    if (isConnected) {
        return (
            <Card className="border-pink-200 bg-pink-50 dark:bg-pink-950/10">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-pink-600" />
                        <CardTitle className="text-pink-700">Instagram DM Configurado</CardTitle>
                    </div>
                    <CardDescription>
                        Tu cuenta de Instagram está conectada y lista para recibir mensajes directos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Page / Instagram ID</Label>
                        <p className="font-mono text-sm">{initialPageId}</p>
                    </div>

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
                <CardFooter className="flex gap-3 justify-end">
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
                <CardTitle>Conexión de Instagram DM</CardTitle>
                <CardDescription>
                    Ingresa las credenciales de tu app de Meta para conectar los mensajes directos de Instagram.
                </CardDescription>
            </CardHeader>
            <form action={action} className="flex flex-col gap-6">
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="pageId">Page ID / Instagram ID</Label>
                        <Input
                            id="pageId"
                            name="pageId"
                            placeholder="Ej. 17841400..."
                            defaultValue={initialPageId}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            El ID de tu página de Facebook conectada a Instagram, o el Instagram Business Account ID.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="accessToken">Access Token</Label>
                        <Input
                            id="accessToken"
                            name="accessToken"
                            type="password"
                            placeholder="EAAG..."
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Token con permisos: <code className="text-[11px] bg-muted px-1 rounded">instagram_manage_messages</code>, <code className="text-[11px] bg-muted px-1 rounded">pages_messaging</code>
                        </p>
                    </div>

                    {/* Hidden field to submit the auto-generated verify token */}
                    <input type="hidden" name="verifyToken" value={verifyToken} />

                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                        <h4 className="text-sm font-medium">Configuración del Webhook en Meta</h4>
                        <p className="text-xs text-muted-foreground">
                            Ve a Meta for Developers → Tu App → Webhooks → Instagram y configura:
                        </p>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Callback URL</Label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-background px-2 py-1.5 rounded border block break-all flex-1">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/instagram` : '/api/webhook/instagram'}
                                </code>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => handleCopy(typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/instagram` : '')}
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Verify Token</Label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-background px-2 py-1.5 rounded border block break-all flex-1 font-mono">
                                    {verifyToken}
                                </code>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => handleCopy(verifyToken)}
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Suscríbete al campo <code className="bg-muted px-1 rounded">messages</code>.
                        </p>
                    </div>

                    {isError && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {state}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? 'Guardando...' : 'Conectar Instagram'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
