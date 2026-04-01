'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, MessageSquare, AlertCircle, Loader2, ExternalLink } from "lucide-react";

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

export function WhatsAppConnectionForm({
    initialPhoneNumberId,
    hasAccessToken,
    channelId,
    automationPriority,
    phoneDisplay,
}: {
    initialPhoneNumberId?: string;
    initialVerifyToken?: string;
    initialWabaId?: string;
    hasAccessToken?: boolean;
    channelId?: string | null;
    automationPriority?: string;
    phoneDisplay?: string;
}) {
    const router = useRouter();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [priority, setPriority] = useState(automationPriority || 'CHATBOT_FIRST');
    const [isSavingPriority, setIsSavingPriority] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [fbReady, setFbReady] = useState(false);

    const isConnected = hasAccessToken;

    // Load Facebook SDK
    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID || '25771963149145801';

        function initFB() {
            if (window.FB) {
                window.FB.init({
                    appId,
                    autoLogAppEvents: true,
                    xfbml: true,
                    version: 'v21.0',
                });
                setFbReady(true);
            }
        }

        if (window.FB) {
            initFB();
            return;
        }

        window.fbAsyncInit = initFB;

        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            document.body.appendChild(script);
        }

        // Fallback: check every second if FB loaded (ad blockers can delay it)
        const interval = setInterval(() => {
            if (window.FB) {
                initFB();
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleEmbeddedSignup = useCallback(() => {
        if (!window.FB) {
            setError('Facebook SDK no cargado. Recarga la página.');
            return;
        }

        setError(null);
        setIsConnecting(true);

        window.FB.login(
            (response: any) => {
                if (response.authResponse?.code) {
                    // Exchange code for token via our API
                    exchangeCode(response.authResponse.code);
                } else {
                    setIsConnecting(false);
                    if (response.status === 'connected') {
                        setError('Ya estás conectado pero no se recibió el código.');
                    }
                    // User cancelled - no error needed
                }
            },
            {
                config_id: '', // Will use scope-based login
                response_type: 'code',
                override_default_response_type: true,
                scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
                extras: {
                    feature: 'whatsapp_embedded_signup',
                    sessionInfoVersion: 2,
                },
            }
        );
    }, []);

    const exchangeCode = async (code: string) => {
        try {
            const res = await fetch('/api/auth/meta/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSuccess(`WhatsApp conectado: ${data.phoneDisplay}`);
                setTimeout(() => router.refresh(), 1500);
            } else {
                setError(data.error || 'Error al conectar WhatsApp');
            }
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setIsConnecting(false);
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

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const { testWhatsAppConnection } = await import('./actions');
            const result = await testWhatsAppConnection();
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: 'Error al probar conexión.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar WhatsApp? Dejarás de recibir mensajes.')) return;
        setIsDisconnecting(true);
        try {
            const { disconnectWhatsApp } = await import('./actions');
            await disconnectWhatsApp();
            router.refresh();
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
                    <div className="h-10 w-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-[#10B981]" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-[#09090B]">WhatsApp conectado</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        </div>
                        <p className="text-[13px] text-[#71717A]">
                            {phoneDisplay || initialPhoneNumberId || 'Número conectado'}
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

    // Not connected - show Embedded Signup
    return (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[#10B981]" />
                </div>
                <div>
                    <h3 className="text-[15px] font-semibold text-[#09090B]">Conectar WhatsApp Business</h3>
                    <p className="text-[13px] text-[#71717A]">Recibe y envía mensajes de WhatsApp</p>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-[#ECFDF5] text-[#10B981]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            <div className="space-y-3">
                <div className="bg-[#F4F4F5] rounded-lg p-4 space-y-2">
                    <p className="text-[13px] text-[#3F3F46]">
                        Al conectar, podrás:
                    </p>
                    <ul className="text-[13px] text-[#71717A] space-y-1">
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Recibir mensajes de WhatsApp en tu bandeja
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Responder desde Varylo con agentes o IA
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Enviar plantillas y difusiones masivas
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-[#71717A]" />
                            Automatizar con chatbots y agentes IA
                        </li>
                    </ul>
                </div>

                <p className="text-[12px] text-[#A1A1AA]">
                    Necesitas una cuenta de Meta Business y un número de teléfono para WhatsApp Business.
                </p>
            </div>

            <button
                onClick={handleEmbeddedSignup}
                disabled={isConnecting || !fbReady}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-[14px] py-2.5 px-4 transition-colors disabled:opacity-50"
            >
                {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <MessageSquare className="h-5 w-5" />
                )}
                {isConnecting ? 'Conectando...' : 'Conectar con WhatsApp'}
                {!isConnecting && <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />}
            </button>

            {!fbReady && (
                <p className="text-[12px] text-[#A1A1AA] text-center">Cargando Facebook SDK...</p>
            )}
        </div>
    );
}
