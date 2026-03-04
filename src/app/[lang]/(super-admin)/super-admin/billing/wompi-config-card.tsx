'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, CreditCard, Database } from 'lucide-react';
import {
    getWompiConfigAction,
    updateWompiConfigAction,
    testWompiConnectionAction,
    ensureSubscriptionTables,
} from './actions';

type ConfigState = {
    publicKey: string;
    privateKey: string;
    eventsSecret: string;
    integritySecret: string;
    isSandbox: boolean;
    webhookUrl: string;
};

export function WompiConfigCard() {
    const [config, setConfig] = useState<ConfigState>({
        publicKey: '',
        privateKey: '',
        eventsSecret: '',
        integritySecret: '',
        isSandbox: true,
        webhookUrl: '',
    });
    const [loaded, setLoaded] = useState(false);
    const [hasExisting, setHasExisting] = useState(false);
    const [showSecrets, setShowSecrets] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [migrateStatus, setMigrateStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        getWompiConfigAction().then((data) => {
            if (data) {
                setConfig({
                    publicKey: data.publicKey,
                    privateKey: data.privateKey,
                    eventsSecret: data.eventsSecret,
                    integritySecret: data.integritySecret,
                    isSandbox: data.isSandbox,
                    webhookUrl: data.webhookUrl || '',
                });
                setHasExisting(true);
            }
            setLoaded(true);
        });
    }, []);

    async function handleSave() {
        setSaving(true);
        setSaveResult(null);
        const result = await updateWompiConfigAction({
            publicKey: config.publicKey,
            privateKey: config.privateKey,
            eventsSecret: config.eventsSecret,
            integritySecret: config.integritySecret,
            isSandbox: config.isSandbox,
            webhookUrl: config.webhookUrl || null,
        });
        setSaving(false);
        if (result.success) {
            setSaveResult({ success: true, message: 'Configuración guardada' });
            setHasExisting(true);
        } else {
            setSaveResult({ success: false, message: result.error || 'Error al guardar' });
        }
    }

    async function handleTest() {
        setTesting(true);
        setTestResult(null);
        const result = await testWompiConnectionAction();
        setTesting(false);
        if (result.success) {
            setTestResult({ success: true, message: `Conectado: ${result.merchant}` });
        } else {
            setTestResult({ success: false, message: result.error || 'Error de conexión' });
        }
    }

    async function handleMigrate() {
        setMigrateStatus('running');
        const result = await ensureSubscriptionTables();
        setMigrateStatus(result.success ? 'done' : 'error');
    }

    if (!loaded) return null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <CardTitle>Configuración Wompi</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasExisting && <Badge variant="secondary">Configurado</Badge>}
                        <Badge variant={config.isSandbox ? 'outline' : 'default'}>
                            {config.isSandbox ? 'Sandbox' : 'Producción'}
                        </Badge>
                    </div>
                </div>
                <CardDescription>
                    Claves API de Wompi para procesar pagos. Los secretos se almacenan cifrados.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Public Key</Label>
                    <Input
                        value={config.publicKey}
                        onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                        placeholder="pub_test_..."
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Private Key</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSecrets(!showSecrets)}
                            className="h-6 px-2 text-xs"
                        >
                            {showSecrets ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                            {showSecrets ? 'Ocultar' : 'Mostrar'}
                        </Button>
                    </div>
                    <Input
                        type={showSecrets ? 'text' : 'password'}
                        value={config.privateKey}
                        onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
                        placeholder="prv_test_..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Events Secret</Label>
                    <Input
                        type={showSecrets ? 'text' : 'password'}
                        value={config.eventsSecret}
                        onChange={(e) => setConfig({ ...config, eventsSecret: e.target.value })}
                        placeholder="events_..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Integrity Secret</Label>
                    <Input
                        type={showSecrets ? 'text' : 'password'}
                        value={config.integritySecret}
                        onChange={(e) => setConfig({ ...config, integritySecret: e.target.value })}
                        placeholder="integrity_..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Webhook URL (informativo)</Label>
                    <Input
                        value={config.webhookUrl}
                        onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                        placeholder="https://tudominio.com/api/webhook/wompi"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Switch
                        checked={config.isSandbox}
                        onCheckedChange={(v) => setConfig({ ...config, isSandbox: v })}
                    />
                    <Label>Modo Sandbox (pruebas)</Label>
                </div>

                {testResult && (
                    <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {testResult.message}
                    </div>
                )}

                {saveResult && (
                    <div className={`flex items-center gap-2 text-sm ${saveResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {saveResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {saveResult.message}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleTest} disabled={testing || !config.publicKey}>
                        {testing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Probar conexión
                    </Button>
                    <Button variant="outline" onClick={handleMigrate} disabled={migrateStatus === 'running'}>
                        <Database className="h-4 w-4 mr-1" />
                        {migrateStatus === 'running' ? 'Migrando...' : migrateStatus === 'done' ? 'Tablas creadas' : 'Crear tablas DB'}
                    </Button>
                </div>
                <Button onClick={handleSave} disabled={saving || !config.publicKey}>
                    {saving ? 'Guardando...' : 'Guardar configuración'}
                </Button>
            </CardFooter>
        </Card>
    );
}
