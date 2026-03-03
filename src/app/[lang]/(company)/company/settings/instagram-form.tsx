'use client';

import { useActionState, useState, useEffect } from 'react';
import { saveInstagramCredentials } from './actions';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Instagram, Facebook } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Extend window interface for FB SDK
declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

export function InstagramConnectionForm({
    initialPageId,
    initialVerifyToken,
    hasAccessToken
}: {
    initialPageId?: string,
    initialVerifyToken?: string, // Legacy
    hasAccessToken?: boolean
}) {
    const [state, saveAction, isSaving] = useActionState(saveInstagramCredentials, undefined);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    // OAuth State
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [userAccessToken, setUserAccessToken] = useState<string | null>(null);
    const [pages, setPages] = useState<any[]>([]);
    // We need both the Page ID and the specific Page Access Token
    const [selectedPageId, setSelectedPageId] = useState<string>('');
    const [selectedPageToken, setSelectedPageToken] = useState<string>('');
    const [isLoadingPages, setIsLoadingPages] = useState(false);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');
    const isConnected = hasAccessToken || isSuccess;

    // Load FB SDK
    useEffect(() => {
        if (window.FB) {
            setSdkLoaded(true);
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v20.0' // Upgrade to latest version
            });
            setSdkLoaded(true);
        };

        const script = document.createElement('script');
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }, []);

    const handleLogin = () => {
        if (!window.FB) return;

        // Permissions required for:
        // 1. Listing Pages (pages_show_list)
        // 2. Getting Page Access Token (pages_show_list + others)
        // 3. Managing messages (instagram_basic, instagram_manage_messages, pages_manage_metadata)
        window.FB.login((response: any) => {
            if (response.authResponse) {
                setUserAccessToken(response.authResponse.accessToken);
                fetchPages(response.authResponse.userID, response.authResponse.accessToken);
            }
        }, {
            scope: 'pages_show_list,pages_manage_metadata,instagram_basic,instagram_manage_messages'
        });
    };

    const fetchPages = (userId: string, token: string) => {
        setIsLoadingPages(true);

        // Pass access_token explicitly as parameter
        window.FB.api('/me/accounts', 'get', {
            access_token: token,
            fields: 'name,access_token,instagram_business_account{id,username},id'
        }, (response: any) => {
            setIsLoadingPages(false);
            if (response && response.data) {
                const pagesWithInstagram = response.data.filter(
                    (p: any) => p.instagram_business_account?.id
                );
                setPages(pagesWithInstagram);
            } else {
                console.error('Error fetching pages:', response);
            }
        });
    };

    const handlePageSelection = (pageId: string) => {
        setSelectedPageId(pageId);
        // Find the page in our list to get its specific token
        const page = pages.find(p => p.id === pageId);
        if (page) {
            setSelectedPageToken(page.access_token);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar Instagram? Dejarás de recibir mensajes.')) return;

        setIsDisconnecting(true);
        try {
            const { disconnectInstagram } = await import('./actions');
            await disconnectInstagram();
            setPages([]);
            setSelectedPageId('');
            setSelectedPageToken('');
            setUserAccessToken(null);
        } catch (error) {
            alert('Error al desconectar.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const { testInstagramConnection } = await import('./actions');
            const result = await testInstagramConnection();
            setTestResult(result);
        } catch (error) {
            setTestResult({ success: false, message: 'Failed to run test.' });
        } finally {
            setIsTesting(false);
        }
    };

    // Derived state for the hidden input
    const selectedPage = pages.find(p => p.id === selectedPageId);
    const submissionPageId = selectedPage?.instagram_business_account?.id || selectedPageId;

    if (isConnected) {
        return (
            <Card className="border-pink-200 bg-pink-50 dark:bg-pink-950/10">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Instagram className="h-6 w-6 text-pink-600" />
                        <CardTitle className="text-pink-700">Instagram Configurado</CardTitle>
                    </div>
                    <CardDescription>
                        Tu cuenta de Instagram Business está conectada y lista.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">ID Conectado</Label>
                        <p className="font-mono text-sm">{initialPageId}</p>
                    </div>

                    {testResult && (
                        <div className={cn(
                            "flex items-center gap-2 text-sm p-3 rounded-md bg-background border",
                            testResult.success ? "text-green-600 border-green-200" : "text-destructive border-red-200"
                        )}>
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
                <div className="flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-600" />
                    <CardTitle>Conexión de Instagram DM</CardTitle>
                </div>
                <CardDescription>
                    Conecta tu cuenta Professional de Instagram (vía Facebook Page) para recibir DMs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!userAccessToken ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        {!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && (
                            <div className="w-full text-center p-2 text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 rounded mb-2">
                                ⚠️ Falta NEXT_PUBLIC_FACEBOOK_APP_ID en .env
                            </div>
                        )}
                        <Button
                            type="button"
                            onClick={handleLogin}
                            disabled={!sdkLoaded}
                            className="bg-[#1877F2] hover:bg-[#1864D9] text-white flex items-center gap-2 text-base h-12 px-6 shadow-sm"
                        >
                            <Facebook className="h-5 w-5" />
                            Continuar con Facebook
                        </Button>
                        <p className="text-xs text-muted-foreground text-center max-w-sm">
                            Se abrirá una ventana emergente para que autorices a Varylo a gestionar tus mensajes de Instagram.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-100 text-sm mb-4">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Sesión iniciada con Facebook</span>
                        </div>

                        {isLoadingPages ? (
                            <div className="text-center text-sm text-muted-foreground py-4">Cargando tus páginas...</div>
                        ) : (
                            <div className="space-y-4">
                                {pages.length === 0 ? (
                                    <div className="text-center py-4 space-y-3">
                                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200 text-sm">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>No se encontraron páginas con una cuenta de Instagram Business conectada.</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                            Asegúrate de que tu página de Facebook tenga una cuenta de Instagram Professional o Business vinculada desde la configuración de Facebook.
                                        </p>
                                    </div>
                                ) : (
                                <form action={saveAction} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Selecciona tu Página con Instagram</Label>
                                        <Select value={selectedPageId} onValueChange={handlePageSelection} required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una página..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {pages.map((page) => (
                                                    <SelectItem key={page.id} value={page.id}>
                                                        {page.name} — @{page.instagram_business_account?.username || page.instagram_business_account?.id}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[0.8rem] text-muted-foreground">
                                            Solo se muestran páginas con Instagram Business conectado.
                                        </p>
                                    </div>

                                    {/* Hidden Inputs for Server Action (The magic happens here) */}
                                    {/* We save the IG Business ID as the pageId because that's what our backend needs */}
                                    <input type="hidden" name="pageId" value={submissionPageId} />
                                    <input type="hidden" name="accessToken" value={selectedPageToken} />

                                    {isError && (
                                        <div className="flex items-center gap-2 text-sm text-destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            {state}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={isSaving || !selectedPageId || !selectedPageToken}
                                        className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                                    >
                                        {isSaving ? 'Guardando configuración...' : 'Confirmar y Guardar'}
                                    </Button>
                                </form>
                                )}
                                <div className="text-center">
                                    <Button variant="ghost" size="sm" onClick={() => { setUserAccessToken(null); setPages([]); }} className="text-muted-foreground">
                                        Cancelar y cambiar cuenta
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
