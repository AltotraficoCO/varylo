'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { MessengerLogo } from "@/components/channel-logos";

export function MessengerForm({
    hasAccessToken,
    channelId,
    automationPriority,
    pageName,
}: {
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

    const msResult = searchParams.get('ms');
    const msReason = searchParams.get('reason');
    const msPage = searchParams.get('page');

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
            const { testMessengerConnection } = await import('./actions');
            const result = await testMessengerConnection();
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: 'Error al probar conexión.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar Messenger? Dejarás de recibir mensajes.')) return;
        setIsDisconnecting(true);
        try {
            const { disconnectMessenger } = await import('./actions');
            const result = await disconnectMessenger();
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

    if (isConnected) {
        return (
            <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#EEF4FF] flex items-center justify-center">
                        <MessengerLogo className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-[#09090B]">Messenger conectado</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <p className="text-[13px] text-[#71717A]">{pageName || 'Página conectada'}</p>
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
                    <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || isDisconnecting} className="rounded-lg">
                        {isTesting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Probando...</> : 'Probar conexión'}
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting || isTesting} className="rounded-lg">
                        {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#EEF4FF] flex items-center justify-center">
                    <MessengerLogo className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-[15px] font-semibold text-[#09090B]">Conectar Facebook Messenger</h3>
                    <p className="text-[13px] text-[#71717A]">Recibe y responde mensajes de tu página de Facebook</p>
                </div>
            </div>

            {msResult === 'error' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        {msReason === 'no_pages' ? 'No se encontraron páginas de Facebook en tu cuenta.'
                            : msReason === 'token_failed' ? 'Error al obtener el token de acceso. Intenta de nuevo.'
                            : msReason === 'unauthorized' ? 'Sesión expirada. Inicia sesión y vuelve a intentar.'
                            : 'Error al conectar Messenger. Intenta de nuevo.'}
                    </span>
                </div>
            )}

            {msResult === 'connected' && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#ECFDF5] text-[#10B981]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>¡Messenger conectado exitosamente{msPage ? ` (${msPage})` : ''}!</span>
                </div>
            )}

            <div className="pt-2">
                <a href="/api/auth/meta/messenger">
                    <Button className="w-full bg-[#0866FF] hover:bg-[#0757D9] text-white rounded-lg h-10 flex items-center gap-2">
                        <MessengerLogo className="h-4 w-4" />
                        Continuar con Facebook
                    </Button>
                </a>
                <p className="text-xs text-[#71717A] text-center mt-3">
                    Necesitas ser administrador de la página de Facebook que quieres conectar.
                </p>
            </div>
        </div>
    );
}
