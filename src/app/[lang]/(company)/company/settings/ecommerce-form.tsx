'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Check, Loader2, Unplug, TestTube } from 'lucide-react';
import { saveEcommerceIntegration, disconnectEcommerce, testEcommerceIntegration } from './actions';

type EcommerceFormProps = {
    isConnected: boolean;
    platform: string | null;
    storeUrl: string | null;
};

export function EcommerceForm({ isConnected, platform, storeUrl }: EcommerceFormProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<string>(platform || '');
    const [disconnecting, setDisconnecting] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const [state, formAction, isPending] = useActionState(saveEcommerceIntegration, undefined);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');

    async function handleDisconnect() {
        setDisconnecting(true);
        try {
            await disconnectEcommerce();
        } finally {
            setDisconnecting(false);
        }
    }

    async function handleTest() {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await testEcommerceIntegration();
            setTestResult(result);
        } finally {
            setTesting(false);
        }
    }

    if (isConnected) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg border bg-green-50 text-green-600 border-green-200">
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Tienda Online</CardTitle>
                                <CardDescription>
                                    {platform === 'shopify' ? 'Shopify' : 'WooCommerce'} - {storeUrl}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant="default">Conectada</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Tu agente de IA puede consultar productos, precios e inventario de tu tienda. Los clientes pueden preguntar por productos durante la conversacion.
                    </p>

                    {testResult && (
                        <div className={`text-sm p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {testResult.message}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTest}
                            disabled={testing}
                        >
                            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
                            Probar conexion
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                        >
                            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unplug className="h-4 w-4 mr-2" />}
                            Desconectar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg border bg-purple-50 text-purple-600 border-purple-200">
                        <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Conectar Tienda Online</CardTitle>
                        <CardDescription>
                            Conecta tu tienda de Shopify o WooCommerce para que el agente de IA pueda consultar productos, precios e inventario.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-5">
                    {/* Platform selection */}
                    <div className="space-y-2">
                        <Label>Plataforma</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedPlatform('shopify')}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    selectedPlatform === 'shopify'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-muted hover:border-muted-foreground/30'
                                }`}
                            >
                                <div className="font-semibold text-sm">Shopify</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Admin API Access Token
                                </div>
                                {selectedPlatform === 'shopify' && (
                                    <Check className="h-4 w-4 text-primary mt-2" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedPlatform('woocommerce')}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    selectedPlatform === 'woocommerce'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-muted hover:border-muted-foreground/30'
                                }`}
                            >
                                <div className="font-semibold text-sm">WooCommerce</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    WordPress + WooCommerce
                                </div>
                                {selectedPlatform === 'woocommerce' && (
                                    <Check className="h-4 w-4 text-primary mt-2" />
                                )}
                            </button>
                        </div>
                        <input type="hidden" name="platform" value={selectedPlatform} />
                    </div>

                    {selectedPlatform && (
                        <>
                            {/* Store URL */}
                            <div className="space-y-2">
                                <Label htmlFor="storeUrl">
                                    {selectedPlatform === 'shopify' ? 'URL de la tienda Shopify' : 'URL de tu sitio WordPress'}
                                </Label>
                                <Input
                                    id="storeUrl"
                                    name="storeUrl"
                                    placeholder={
                                        selectedPlatform === 'shopify'
                                            ? 'mitienda.myshopify.com'
                                            : 'https://mitienda.com'
                                    }
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    {selectedPlatform === 'shopify'
                                        ? 'El subdominio de tu tienda Shopify (sin https://)'
                                        : 'La URL completa de tu sitio WordPress con WooCommerce'}
                                </p>
                            </div>

                            {/* API Key */}
                            <div className="space-y-2">
                                <Label htmlFor="apiKey">
                                    {selectedPlatform === 'shopify' ? 'Admin API Access Token' : 'Consumer Key'}
                                </Label>
                                <Input
                                    id="apiKey"
                                    name="apiKey"
                                    type="password"
                                    placeholder={
                                        selectedPlatform === 'shopify'
                                            ? 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx'
                                            : 'ck_xxxxxxxxxxxxxxxxxxxxxxxx'
                                    }
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    {selectedPlatform === 'shopify'
                                        ? 'Ve a Settings > Apps > Develop apps > tu app > Admin API access token'
                                        : 'Ve a WooCommerce > Settings > Advanced > REST API > Add key'}
                                </p>
                            </div>

                            {/* API Secret (WooCommerce only) */}
                            {selectedPlatform === 'woocommerce' && (
                                <div className="space-y-2">
                                    <Label htmlFor="apiSecret">Consumer Secret</Label>
                                    <Input
                                        id="apiSecret"
                                        name="apiSecret"
                                        type="password"
                                        placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                                        required
                                    />
                                </div>
                            )}

                            {/* Status message */}
                            {state && (
                                <div className={`text-sm p-3 rounded-md ${isSuccess ? 'bg-green-50 text-green-700' : isError ? 'bg-red-50 text-red-700' : ''}`}>
                                    {state.replace('Success: ', '').replace('Error: ', '')}
                                </div>
                            )}

                            <Button type="submit" disabled={isPending} className="w-full">
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Conectando...
                                    </>
                                ) : (
                                    'Conectar tienda'
                                )}
                            </Button>
                        </>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
