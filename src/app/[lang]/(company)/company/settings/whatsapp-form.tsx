'use client';

import { useActionState, useState } from 'react';
import { saveWhatsAppCredentials } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { WhatsAppLogo } from "@/components/channel-logos";

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

    // ----- Connected state -----
    if (isConnected) {
        const headerSubtitle = phoneDisplay || initialPhoneNumberId || 'Cuenta conectada';
        const statusBadge = status === 'EXPIRED'
            ? { label: 'Conexión expirada', className: 'bg-[#FEF2F2] text-[#EF4444]' }
            : status === 'WARNING' && daysLeft !== null
                ? { label: `Expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`, className: 'bg-[#FFFBEB] text-[#D97706]' }
                : isOauth && status === 'ACTIVE' && daysLeft !== null
                    ? { label: `${daysLeft} día${daysLeft === 1 ? '' : 's'} restantes`, className: 'bg-[#ECFDF5] text-[#10B981]' }
                    : null;

        return (
            <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                        <WhatsAppLogo className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-[#09090B]">WhatsApp Business conectado</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <p className="text-[13px] text-[#71717A] truncate">{headerSubtitle}</p>
                    </div>
                </div>

                {statusBadge && (
                    <div className={`text-[13px] px-3 py-2 rounded-lg ${statusBadge.className}`}>
                        {statusBadge.label}
                        {status === 'EXPIRED' && ' — reconecta para seguir enviando mensajes.'}
                        {status === 'WARNING' && ' — reconecta pronto para no perder el servicio.'}
                    </div>
                )}

                {channelId && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-[#71717A]">Prioridad de automatización</Label>
                        <select
                            value={priority}
                            onChange={(e) => handlePriorityChange(e.target.value)}
                            disabled={isSavingPriority}
                            className="flex h-9 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-1 text-sm focus:outline-none focus:border-[#10B981]"
                        >
                            <option value="CHATBOT_FIRST">Chatbot primero (recomendado)</option>
                            <option value="AI_FIRST">Agente IA primero</option>
                        </select>
                    </div>
                )}

                {testResult && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${testResult.success ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                        {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {testResult.message}
                    </div>
                )}

                <div className="flex gap-3 pt-2 flex-wrap">
                    {isOauth && (status === 'WARNING' || status === 'EXPIRED') && (
                        <a
                            href="/api/auth/meta/whatsapp/redirect"
                            className="flex items-center justify-center gap-2 rounded-lg bg-[#10B981] hover:bg-[#0EA371] text-white font-semibold text-[14px] py-2 px-4 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reconectar
                        </a>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting || isDisconnecting}
                        className="rounded-lg"
                    >
                        {isTesting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Probando...</> : 'Probar conexión'}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting || isTesting}
                        className="rounded-lg"
                    >
                        {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                    </Button>
                </div>
            </div>
        );
    }

    // ----- Not connected -----
    return (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                    <WhatsAppLogo className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-[15px] font-semibold text-[#09090B]">Conectar WhatsApp Business</h3>
                    <p className="text-[13px] text-[#71717A]">Recibe y responde mensajes en tu número de WhatsApp Business</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="bg-[#F4F4F5] rounded-lg p-4 space-y-2">
                    <p className="text-[13px] text-[#3F3F46]">
                        Al conectar, autorizarás a Varylo a:
                    </p>
                    <ul className="text-[13px] text-[#71717A] space-y-1">
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Recibir mensajes de tus contactos en WhatsApp
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Responder mensajes en tu nombre
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Acceder a tus plantillas y datos del WABA
                        </li>
                    </ul>
                </div>

                <p className="text-[12px] text-[#A1A1AA]">
                    Necesitas tener tu cuenta de WhatsApp Business creada en Meta Business Suite.
                </p>
            </div>

            <a
                href="/api/auth/meta/whatsapp/redirect"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] hover:bg-[#1EBE5C] text-white font-semibold text-[14px] py-2.5 px-4 transition-colors"
            >
                <WhatsAppLogo className="h-5 w-5" />
                Conectar con WhatsApp
                <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </a>

            <div className="border-t border-[#E4E4E7] pt-4">
                <button
                    type="button"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#09090B] transition-colors"
                >
                    {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Configuración avanzada (usar mi propia app de Meta)
                </button>

                {advancedOpen && (
                    <form action={action} className="flex flex-col gap-4 mt-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="phoneNumberId" className="text-xs text-[#71717A]">Phone Number ID</Label>
                            <Input
                                id="phoneNumberId"
                                name="phoneNumberId"
                                placeholder="Ej. 10456..."
                                defaultValue={initialPhoneNumberId}
                                className="rounded-lg"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="accessToken" className="text-xs text-[#71717A]">Access Token</Label>
                            <Input
                                id="accessToken"
                                name="accessToken"
                                type="password"
                                placeholder="EAAG..."
                                className="rounded-lg"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="appSecret" className="text-xs text-[#71717A]">App Secret</Label>
                            <Input
                                id="appSecret"
                                name="appSecret"
                                type="password"
                                placeholder="Tu App Secret de Meta"
                                className="rounded-lg"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="verifyToken" className="text-xs text-[#71717A]">Verify Token (Webhook)</Label>
                            <Input
                                id="verifyToken"
                                name="verifyToken"
                                placeholder="MiTokenSecreto"
                                defaultValue={initialVerifyToken}
                                className="rounded-lg"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="wabaId" className="text-xs text-[#71717A]">WhatsApp Business Account ID</Label>
                            <Input
                                id="wabaId"
                                name="wabaId"
                                placeholder="Ej. 10234..."
                                defaultValue={initialWabaId}
                                className="rounded-lg"
                            />
                        </div>

                        {isError && (
                            <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {state}
                            </div>
                        )}

                        <Button type="submit" disabled={isPending} className="rounded-lg">
                            {isPending ? 'Guardando...' : 'Guardar credenciales'}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
