'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { WhatsAppLogo } from "@/components/channel-logos";
import { useDictionary } from '@/lib/i18n-context';

export function WhatsAppConnectionForm({
    initialPhoneNumberId,
    hasAccessToken,
    channelId,
    automationPriority,
    phoneDisplay,
}: {
    initialPhoneNumberId?: string;
    initialVerifyToken?: string;
    hasAccessToken?: boolean;
    channelId?: string | null;
    automationPriority?: string;
    phoneDisplay?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [priority, setPriority] = useState(automationPriority || 'CHATBOT_FIRST');
    const [isSavingPriority, setIsSavingPriority] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const dict = useDictionary();
    const t = dict.settingsUI?.whatsappForm || {};
    const st = dict.settingsUI || {};
    const ui = dict.ui || {};

    const waResult = searchParams.get('wa');
    const waReason = searchParams.get('reason');
    const waPhone = searchParams.get('phone');

    const isConnected = hasAccessToken;

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

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const { testWhatsAppConnection } = await import('./actions');
            const result = await testWhatsAppConnection();
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: t.testError || 'Error al probar conexión.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm(t.disconnectConfirm || '¿Estás seguro de que quieres desconectar WhatsApp?')) return;
        setIsDisconnecting(true);
        try {
            const { disconnectWhatsApp } = await import('./actions');
            await disconnectWhatsApp();
            router.refresh();
        } catch {
            alert(t.disconnectError || 'Error al desconectar.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Connected state
    if (isConnected) {
        return (
            <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                        <WhatsAppLogo className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-[#09090B]">{t.connected || 'WhatsApp conectado'}</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <p className="text-[13px] text-[#71717A]">
                            {phoneDisplay || initialPhoneNumberId || (t.connectedNumber || 'Número conectado')}
                        </p>
                    </div>
                </div>

                {channelId && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-[#71717A]">{st.automationPriority || 'Prioridad de automatización'}</Label>
                        <select
                            value={priority}
                            onChange={(e) => handlePriorityChange(e.target.value)}
                            disabled={isSavingPriority}
                            className="flex h-9 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-1 text-sm focus:outline-none focus:border-[#10B981]"
                        >
                            <option value="CHATBOT_FIRST">{st.chatbotFirstRecommended || 'Chatbot primero (recomendado)'}</option>
                            <option value="AI_FIRST">{st.aiFirstLabel || 'Agente IA primero'}</option>
                        </select>
                    </div>
                )}

                {testResult && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${testResult.success ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                        {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {testResult.message}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || isDisconnecting} className="rounded-lg">
                        {isTesting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> {t.testing || 'Probando...'}</> : (t.testConnection || 'Probar conexión')}
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting || isTesting} className="rounded-lg">
                        {isDisconnecting ? (t.disconnecting || 'Desconectando...') : (ui.disconnect || 'Desconectar')}
                    </Button>
                </div>
            </div>
        );
    }

    // Not connected
    return (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                    <WhatsAppLogo className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-[15px] font-semibold text-[#09090B]">{t.connectTitle || 'Conectar WhatsApp Business'}</h3>
                    <p className="text-[13px] text-[#71717A]">{t.connectSubtitle || 'Recibe y envía mensajes de WhatsApp'}</p>
                </div>
            </div>

            {waResult === 'error' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        {waReason === 'no_waba' ? (t.noWaba || 'No se encontró una cuenta de WhatsApp Business. Asegúrate de tener una WABA creada en Meta Business Suite.')
                            : waReason === 'token_failed' ? (t.tokenFailed || 'Error al obtener el token. Intenta de nuevo.')
                            : (t.connectError || 'Error al conectar WhatsApp. Intenta de nuevo.')}
                    </span>
                </div>
            )}

            {waResult === 'connected' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#ECFDF5] text-[#10B981]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t.connectedSuccess || 'WhatsApp conectado'}{waPhone ? ` (${waPhone})` : ''}. {t.reloadToSee || 'Recarga para ver los cambios.'}</span>
                </div>
            )}

            <div className="space-y-3">
                <div className="bg-[#F4F4F5] rounded-lg p-4 space-y-2">
                    <p className="text-[13px] text-[#3F3F46]">{t.onConnectIntro || 'Al conectar, podrás:'}</p>
                    <ul className="text-[13px] text-[#71717A] space-y-1">
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            {t.onConnectFeature1 || 'Recibir mensajes de WhatsApp en tu bandeja'}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            {t.onConnectFeature2 || 'Responder con agentes o IA'}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            {t.onConnectFeature3 || 'Enviar plantillas y difusiones masivas'}
                        </li>
                    </ul>
                </div>
                <p className="text-[12px] text-[#A1A1AA]">
                    {t.requiresMeta || 'Necesitas una cuenta de WhatsApp Business en Meta Business Suite.'}
                </p>
            </div>

            <a
                href="/api/auth/meta/whatsapp/redirect"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-[14px] py-2.5 px-4 transition-colors"
            >
                <WhatsAppLogo className="h-5 w-5" />
                {t.connectButton || 'Conectar con WhatsApp'}
                <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </a>
        </div>
    );
}
