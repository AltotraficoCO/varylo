'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveWhatsAppCredentials } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { WhatsAppLogo } from "@/components/channel-logos";

const OAUTH_ERROR_MESSAGE: Record<string, string> = {
    missing_params: 'Facebook no envió los parámetros necesarios. Vuelve a intentar.',
    unauthorized: 'Sesión expirada. Inicia sesión y vuelve a intentar.',
    invalid_state: 'El parámetro de estado no es válido. Vuelve a intentar.',
    company_mismatch: 'La sesión no coincide con la empresa. Cierra y vuelve a iniciar sesión.',
    token_failed: 'Facebook no devolvió un token de acceso. Verifica que tu app esté en modo Live y que tu usuario tenga rol en la app si aún no tienes Advanced Access.',
    no_waba: 'No se encontró una cuenta de WhatsApp Business asociada. Verifica en Meta Business Suite que tengas un WABA creado y que aceptaste los permisos.',
    no_phone: 'Tu cuenta de WhatsApp Business no tiene un número asignado. Agrégalo desde Meta Business Suite.',
    internal: 'Ocurrió un error interno. Revisa los logs.',
    access_denied: 'Cancelaste el acceso desde Facebook.',
    limit: 'Alcanzaste el límite de 10 números de WhatsApp. Desconecta uno para agregar otro.',
};

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
    initialLabel,
    isAdditional,
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
    initialLabel?: string,
    isAdditional?: boolean,
}) {
    const searchParams = useSearchParams();
    const waResult = searchParams.get('wa');
    const waReason = searchParams.get('reason');
    const waPhone = searchParams.get('phone');

    const [state, action, isPending] = useActionState(saveWhatsAppCredentials, undefined);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [priority, setPriority] = useState(automationPriority || 'CHATBOT_FIRST');
    const [isSavingPriority, setIsSavingPriority] = useState(false);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyMsg, setVerifyMsg] = useState<{ success: boolean; message: string } | null>(null);
    const [verifyLoading, setVerifyLoading] = useState<'request' | 'confirm' | null>(null);

    const [label, setLabel] = useState(initialLabel || '');
    const [savingLabel, setSavingLabel] = useState(false);
    const [labelSaved, setLabelSaved] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleRequestVerification = async (method: 'SMS' | 'VOICE') => {
        setVerifyLoading('request');
        setVerifyMsg(null);
        try {
            const { requestWhatsAppVerification } = await import('./actions');
            const result = await requestWhatsAppVerification(channelId || undefined, method);
            setVerifyMsg(result);
        } catch {
            setVerifyMsg({ success: false, message: 'Error al solicitar código' });
        } finally {
            setVerifyLoading(null);
        }
    };

    const handleVerifyCode = async () => {
        setVerifyLoading('confirm');
        setVerifyMsg(null);
        try {
            const { verifyWhatsAppCode } = await import('./actions');
            const result = await verifyWhatsAppCode(channelId || undefined, verifyCode);
            setVerifyMsg(result);
            if (result.success) setVerifyCode('');
        } catch {
            setVerifyMsg({ success: false, message: 'Error al confirmar código' });
        } finally {
            setVerifyLoading(null);
        }
    };

    const handleSaveLabel = async () => {
        if (!channelId) return;
        setSavingLabel(true);
        setLabelSaved(false);
        try {
            const { updateWhatsAppLabel } = await import('./actions');
            await updateWhatsAppLabel(channelId, label.trim());
            setLabelSaved(true);
            setTimeout(() => setLabelSaved(false), 2000);
        } catch {
            /* noop */
        } finally {
            setSavingLabel(false);
        }
    };

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
            const result = await testWhatsAppConnection(channelId || undefined);
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
            await disconnectWhatsApp(channelId || undefined);
        } catch {
            alert('Error al desconectar.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    // ----- Connected state -----
    if (isConnected) {
        const phoneText = phoneDisplay || initialPhoneNumberId || 'Cuenta conectada';
        const statusBadge = status === 'EXPIRED'
            ? { label: 'Conexión expirada', className: 'bg-[#FEF2F2] text-[#EF4444]' }
            : status === 'WARNING' && daysLeft !== null
                ? { label: `Expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`, className: 'bg-[#FFFBEB] text-[#D97706]' }
                : isOauth && status === 'ACTIVE' && daysLeft !== null
                    ? { label: `${daysLeft} día${daysLeft === 1 ? '' : 's'} restantes`, className: 'bg-[#ECFDF5] text-[#10B981]' }
                    : null;

        const needsAttention = status === 'EXPIRED' || status === 'WARNING';
        const open = expanded || needsAttention;
        const titleText = label.trim() || 'WhatsApp Business';

        return (
            <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                {/* Compact header row — click to expand settings */}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FAFAFA] transition-colors"
                >
                    <div className="h-10 w-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center shrink-0">
                        <WhatsAppLogo className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-[15px] font-semibold text-[#09090B] truncate">{titleText}</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                        </div>
                        <p className="text-[13px] text-[#71717A] truncate">{phoneText}</p>
                    </div>
                    {statusBadge && (
                        <span className={`hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge.className}`}>
                            {statusBadge.label}
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-[#A1A1AA] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {!open ? null : (
                <div className="px-4 pb-4 space-y-5 border-t border-[#F4F4F5] pt-4">

                {statusBadge && (
                    <div className={`text-[13px] px-3 py-2 rounded-lg ${statusBadge.className}`}>
                        {statusBadge.label}
                        {status === 'EXPIRED' && ' — reconecta para seguir enviando mensajes.'}
                        {status === 'WARNING' && ' — reconecta pronto para no perder el servicio.'}
                    </div>
                )}

                {channelId && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-[#71717A]">Nombre de la bandeja (etiqueta)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Ej. Ventas, Soporte…"
                                maxLength={40}
                                className="rounded-lg flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSaveLabel}
                                disabled={savingLabel}
                                className="rounded-lg shrink-0"
                            >
                                {savingLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : labelSaved ? <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" /> : 'Guardar'}
                            </Button>
                        </div>
                        <p className="text-[11px] text-[#A1A1AA]">Se usa para separar la bandeja por número en el menú lateral.</p>
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

                {/* TEMPORAL: re-verificación del número */}
                {isOauth && (
                    <details
                        className="group rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-3"
                        open={verifyOpen}
                        onToggle={(e) => setVerifyOpen((e.target as HTMLDetailsElement).open)}
                    >
                        <summary className="cursor-pointer list-none flex items-center justify-between text-[13px] font-medium text-[#3F3F46]">
                            <span className="flex items-center gap-1.5">
                                <ChevronDown className="h-4 w-4 group-open:hidden" />
                                <ChevronUp className="h-4 w-4 hidden group-open:inline" />
                                Re-verificar número
                            </span>
                            <span className="text-[11px] text-[#A1A1AA]">si no envías mensajes</span>
                        </summary>

                        <div className="mt-3 space-y-3">
                            <p className="text-[12px] text-[#71717A]">
                                Si Meta dice &ldquo;permisos insuficientes&rdquo; al enviar, el número está vencido y hay que re-verificarlo.
                            </p>

                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={verifyLoading !== null}
                                    onClick={() => handleRequestVerification('SMS')}
                                    className="rounded-lg"
                                >
                                    {verifyLoading === 'request' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                                    Recibir código por SMS
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={verifyLoading !== null}
                                    onClick={() => handleRequestVerification('VOICE')}
                                    className="rounded-lg"
                                >
                                    Recibir por llamada
                                </Button>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    inputMode="numeric"
                                    placeholder="Código de 6 dígitos"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="rounded-lg flex-1"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={verifyLoading !== null || verifyCode.length !== 6}
                                    onClick={handleVerifyCode}
                                    className="rounded-lg"
                                >
                                    {verifyLoading === 'confirm' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                                    Confirmar
                                </Button>
                            </div>

                            {verifyMsg && (
                                <div className={`flex items-start gap-2 text-[12px] p-2.5 rounded-lg ${verifyMsg.success ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FEF2F2] text-[#991B1B]'}`}>
                                    {verifyMsg.success ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                                    <span>{verifyMsg.message}</span>
                                </div>
                            )}
                        </div>
                    </details>
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
                )}
            </div>
        );
    }

    // ----- Not connected -----
    // When adding an extra number (there's already at least one), collapse the
    // whole connect card behind a compact dashed button so the list stays clean.
    if (isAdditional && !expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D4D4D8] bg-white py-3.5 text-[14px] font-medium text-[#3F3F46] hover:border-[#10B981] hover:text-[#10B981] transition-colors"
            >
                <WhatsAppLogo className="h-4 w-4" />
                Agregar otro número
            </button>
        );
    }

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

            {waResult === 'error' && (
                <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{(waReason && OAUTH_ERROR_MESSAGE[waReason]) || `Error al conectar (${waReason || 'desconocido'}).`}</span>
                </div>
            )}

            {waResult === 'connected' && (
                <div className="flex flex-col gap-2 text-sm p-3 rounded-lg bg-[#ECFDF5] text-[#065F46]">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span className="font-semibold">WhatsApp conectado{waPhone ? ` (${waPhone})` : ''}</span>
                    </div>
                    <p className="text-[12px] text-[#047857]">
                        Antes de enviar mensajes, asegúrate de autorizar el envío en tu Business Manager:
                    </p>
                    <ol className="text-[12px] text-[#065F46] list-decimal list-inside space-y-0.5 ml-1">
                        <li>Entra a business.facebook.com</li>
                        <li>Configuración → Cuentas → Cuentas de WhatsApp → tu WABA</li>
                        <li>Apps conectadas → Agregar app → busca y agrega Varylo</li>
                        <li>Asigna el permiso "Mensajería"</li>
                    </ol>
                </div>
            )}

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

            <details className="group border-t border-[#E4E4E7] pt-4">
                <summary className="cursor-pointer list-none flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#09090B] transition-colors">
                    <ChevronDown className="h-4 w-4 group-open:hidden" />
                    <ChevronUp className="h-4 w-4 hidden group-open:inline" />
                    Configuración avanzada (usar mi propia app de Meta)
                </summary>

                <form action={action} className="flex flex-col gap-4 mt-4">
                    <input type="hidden" name="channelId" value={channelId || ''} />
                    <div className="space-y-1.5">
                        <Label htmlFor="label" className="text-xs text-[#71717A]">Nombre de la bandeja (opcional)</Label>
                        <Input
                            id="label"
                            name="label"
                            placeholder="Ej. Ventas, Soporte…"
                            defaultValue={initialLabel}
                            maxLength={40}
                            className="rounded-lg"
                        />
                    </div>
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
            </details>
        </div>
    );
}
