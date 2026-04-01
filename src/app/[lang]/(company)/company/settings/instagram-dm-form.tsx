'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Instagram, AlertCircle, Loader2, ExternalLink } from "lucide-react";

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
            setTestResult({ success: false, message: 'Error al probar conexión.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar Instagram? Dejarás de recibir DMs.')) return;
        setIsDisconnecting(true);
        try {
            const { disconnectInstagram } = await import('./actions');
            const result = await disconnectInstagram();
            if (result.success) {
                router.refresh();
            } else {
                alert(result.message || 'Error al desconectar.');
            }
        } catch {
            alert('Error al desconectar.');
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
                        <Instagram className="h-5 w-5 text-[#EC4899]" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-[#09090B]">Instagram DM conectado</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <p className="text-[13px] text-[#71717A]">
                            {pageName || initialPageId || 'Cuenta conectada'}
                        </p>
                    </div>
                </div>

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

                <div className="flex gap-3 pt-2">
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

    // Not connected - show OAuth button
    return (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#FDF2F8] flex items-center justify-center">
                    <Instagram className="h-5 w-5 text-[#EC4899]" />
                </div>
                <div>
                    <h3 className="text-[15px] font-semibold text-[#09090B]">Conectar Instagram DM</h3>
                    <p className="text-[13px] text-[#71717A]">Recibe y responde mensajes directos de Instagram</p>
                </div>
            </div>

            {/* OAuth error message */}
            {igResult === 'error' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        {igReason === 'no_pages' ? 'No se encontraron páginas de Facebook. Asegúrate de tener una página con Instagram Business conectado.'
                            : igReason === 'token_failed' ? 'Error al obtener el token de acceso. Intenta de nuevo.'
                            : igReason === 'unauthorized' ? 'Sesión expirada. Inicia sesión y vuelve a intentar.'
                            : 'Error al conectar Instagram. Intenta de nuevo.'}
                    </span>
                </div>
            )}

            {/* Success message */}
            {igResult === 'connected' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#ECFDF5] text-[#10B981]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Instagram conectado exitosamente{igPage ? ` (${igPage})` : ''}. Recarga la página para ver los cambios.</span>
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
                            Recibir mensajes directos de Instagram
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Responder mensajes en tu nombre
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Ver información básica de tu cuenta
                        </li>
                    </ul>
                </div>

                <p className="text-[12px] text-[#A1A1AA]">
                    Necesitas una página de Facebook con una cuenta de Instagram Business conectada.
                </p>
            </div>

            <a
                href="/api/auth/meta/instagram"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white font-semibold text-[14px] py-2.5 px-4 hover:opacity-90 transition-opacity"
            >
                <Instagram className="h-5 w-5" />
                Conectar con Instagram
                <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </a>
        </div>
    );
}
