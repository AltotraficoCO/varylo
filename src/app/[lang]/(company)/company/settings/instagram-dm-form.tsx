'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { InstagramLogo } from "@/components/channel-logos";
import { useDictionary } from '@/lib/i18n-context';

export function InstagramDMForm({
    initialPageId,
    hasAccessToken,
    channelId,
    automationPriority,
    pageName,
}: {
    initialPageId?: string;
    initialVerifyToken?: string;
    hasAccessToken?: boolean;
    channelId?: string | null;
    automationPriority?: string;
    pageName?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [priority, setPriority] = useState(automationPriority || 'CHATBOT_FIRST');
    const [isSavingPriority, setIsSavingPriority] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const dict = useDictionary();
    const t = dict.settingsUI?.instagramDmForm || {};
    const st = dict.settingsUI || {};
    const ui = dict.ui || {};

    // Check for OAuth callback result
    const igResult = searchParams.get('ig');
    const igReason = searchParams.get('reason');
    const igPage = searchParams.get('page');

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
            const { testInstagramConnection } = await import('./actions');
            const result = await testInstagramConnection();
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: t.testError || 'Error al probar conexión.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm(t.disconnectConfirm || '¿Estás seguro de que quieres desconectar Instagram? Dejarás de recibir DMs.')) return;
        setIsDisconnecting(true);
        try {
            const { disconnectInstagram } = await import('./actions');
            const result = await disconnectInstagram();
            if (result.success) {
                router.refresh();
            } else {
                alert(result.message || (ui.errorOccurred || 'Error al desconectar.'));
            }
        } catch {
            alert(ui.errorOccurred || 'Error al desconectar.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Connected state
    if (isConnected) {
        return (
            <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#FDF2F8] flex items-center justify-center">
                        <InstagramLogo className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-[#09090B]">{t.connected || 'Instagram DM conectado'}</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <p className="text-[13px] text-[#71717A]">
                            {pageName || initialPageId || (t.connectedAccount || 'Cuenta conectada')}
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
                    <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting || isDisconnecting}
                        className="rounded-lg"
                    >
                        {isTesting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> {st.whatsappForm?.testing || 'Probando...'}</> : (st.whatsappForm?.testConnection || 'Probar conexión')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting || isTesting}
                        className="rounded-lg"
                    >
                        {isDisconnecting ? (st.whatsappForm?.disconnecting || 'Desconectando...') : (ui.disconnect || 'Desconectar')}
                    </Button>
                </div>
            </div>
        );
    }

    // Not connected - show OAuth button
    return (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#FDF2F8] flex items-center justify-center">
                    <InstagramLogo className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-[15px] font-semibold text-[#09090B]">{t.connectTitle || 'Conectar Instagram DM'}</h3>
                    <p className="text-[13px] text-[#71717A]">{t.connectSubtitle || 'Recibe y responde mensajes directos de Instagram'}</p>
                </div>
            </div>

            {/* OAuth error message */}
            {igResult === 'error' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        {igReason === 'no_pages' ? (t.noPages || 'No se encontraron páginas de Facebook. Asegúrate de tener una página con Instagram Business conectado.')
                            : igReason === 'token_failed' ? (t.tokenFailed || 'Error al obtener el token de acceso. Intenta de nuevo.')
                            : igReason === 'unauthorized' ? (t.unauthorized || 'Sesión expirada. Inicia sesión y vuelve a intentar.')
                            : (t.connectError || 'Error al conectar Instagram. Intenta de nuevo.')}
                    </span>
                </div>
            )}

            {/* Success message */}
            {igResult === 'connected' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#ECFDF5] text-[#10B981]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t.connectedSuccess || 'Instagram conectado exitosamente'}{igPage ? ` (${igPage})` : ''}. {t.reloadToSee || 'Recarga la página para ver los cambios.'}</span>
                </div>
            )}

            <div className="space-y-3">
                <div className="bg-[#F4F4F5] rounded-lg p-4 space-y-2">
                    <p className="text-[13px] text-[#3F3F46]">
                        {t.authIntro || 'Al conectar, autorizarás a Varylo a:'}
                    </p>
                    <ul className="text-[13px] text-[#71717A] space-y-1">
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            {t.authFeature1 || 'Recibir mensajes directos de Instagram'}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            {t.authFeature2 || 'Responder mensajes en tu nombre'}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            {t.authFeature3 || 'Ver información básica de tu cuenta'}
                        </li>
                    </ul>
                </div>

                <p className="text-[12px] text-[#A1A1AA]">
                    {t.requiresFbPage || 'Necesitas una página de Facebook con una cuenta de Instagram Business conectada.'}
                </p>
            </div>

            <a
                href="/api/auth/meta/instagram"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white font-semibold text-[14px] py-2.5 px-4 hover:opacity-90 transition-opacity"
            >
                <InstagramLogo className="h-5 w-5" />
                {t.connectButton || 'Conectar con Instagram'}
                <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </a>
        </div>
    );
}
