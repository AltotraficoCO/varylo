'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Eye, EyeOff, CheckCircle2, XCircle, Loader2, Receipt, Zap, KeyRound,
} from 'lucide-react';
import {
    getAlegraConfigAction,
    updateAlegraConfigAction,
    testAlegraConnectionAction,
} from './actions';

type ConfigState = {
    email: string;
    token: string;
    active: boolean;
};

export function AlegraConfigCard() {
    const [config, setConfig] = useState<ConfigState>({ email: '', token: '', active: true });
    const [loaded, setLoaded] = useState(false);
    const [hasExisting, setHasExisting] = useState(false);
    const [tokenDirty, setTokenDirty] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        getAlegraConfigAction().then((data) => {
            if (data) {
                setConfig({ email: data.email, token: data.token, active: data.active });
                setHasExisting(true);
            }
            setLoaded(true);
        });
    }, []);

    async function handleSave() {
        setSaving(true);
        setSaveResult(null);
        // If the token wasn't edited, keep the existing one (don't overwrite with the mask).
        if (hasExisting && !tokenDirty) {
            setSaving(false);
            setSaveResult({ success: false, message: 'Ingresa el token de nuevo para guardar cambios.' });
            return;
        }
        const result = await updateAlegraConfigAction({
            email: config.email,
            token: config.token,
            active: config.active,
        });
        setSaving(false);
        if (result.success) {
            setSaveResult({ success: true, message: 'Configuración guardada correctamente' });
            setHasExisting(true);
            setTokenDirty(false);
        } else {
            setSaveResult({ success: false, message: result.error || 'Error al guardar' });
        }
    }

    async function handleTest() {
        setTesting(true);
        setTestResult(null);
        const result = await testAlegraConnectionAction({ email: config.email, token: config.token });
        setTesting(false);
        if (result.success) {
            setTestResult({ success: true, message: `Conectado: ${result.name}` });
        } else {
            setTestResult({ success: false, message: result.error || 'Error de conexión' });
        }
    }

    if (!loaded) return null;

    return (
        <div className="space-y-6">
            {/* Header card */}
            <div className="bg-card rounded-xl border p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-foreground">Configuración Alegra</p>
                            <p className="text-[13px] text-muted-foreground">
                                Correo y token de la cuenta Alegra para emitir facturas. El token se almacena cifrado.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                        {hasExisting && (
                            <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Configurado
                            </Badge>
                        )}
                        <Badge variant={config.active ? 'default' : 'outline'} className="text-xs">
                            {config.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Credentials */}
            <div className="bg-card rounded-xl border p-5 space-y-6">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg shrink-0 bg-blue-50 text-blue-600">
                        <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Credenciales API</p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                            En Alegra: Configuración → API - Integraciones con otros sistemas.
                        </p>
                    </div>
                </div>
                <div className="ml-10 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[13px]">Correo</Label>
                            <Input
                                value={config.email}
                                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                                placeholder="correo@empresa.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[13px]">Token</Label>
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    {showToken ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            <Input
                                type={showToken ? 'text' : 'password'}
                                value={config.token}
                                onChange={(e) => { setConfig({ ...config, token: e.target.value }); setTokenDirty(true); }}
                                onFocus={() => { if (hasExisting && !tokenDirty) { setConfig((c) => ({ ...c, token: '' })); setTokenDirty(true); } }}
                                placeholder="Token de acceso"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div>
                            <p className="text-sm font-medium text-foreground">Integración activa</p>
                            <p className="text-[13px] text-muted-foreground">
                                Si se desactiva, no se emitirán facturas automáticas.
                            </p>
                        </div>
                        <Switch
                            checked={config.active}
                            onCheckedChange={(v) => setConfig({ ...config, active: v })}
                        />
                    </div>
                </div>
            </div>

            {/* Feedback */}
            {(testResult || saveResult) && (
                <div className="space-y-2">
                    {[testResult, saveResult].filter(Boolean).map((r, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${
                                r!.success
                                    ? 'bg-[#ECFDF5] border-emerald-200 text-emerald-700'
                                    : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                        >
                            {r!.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                            {r!.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing || !config.email || !config.token}
                    className="gap-2"
                >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Probar conexión
                </Button>
                <Button onClick={handleSave} disabled={saving || !config.email} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Guardando...' : 'Guardar configuración'}
                </Button>
            </div>
        </div>
    );
}
