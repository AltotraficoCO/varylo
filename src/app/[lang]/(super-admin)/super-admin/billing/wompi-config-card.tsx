'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Eye, EyeOff, CheckCircle2, XCircle, Loader2,
    CreditCard, Database, Zap, Shield, Webhook, FlaskConical,
} from 'lucide-react';
import {
    getWompiConfigAction,
    updateWompiConfigAction,
    testWompiConnectionAction,
    ensureSubscriptionTables,
} from './actions';
import { useDictionary } from '@/lib/i18n-context';

type ConfigState = {
    publicKey: string;
    privateKey: string;
    eventsSecret: string;
    integritySecret: string;
    isSandbox: boolean;
    webhookUrl: string;
};

function Section({ icon: Icon, title, description, iconClass, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    iconClass: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${iconClass}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    {description && <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>}
                </div>
            </div>
            <div className="ml-10">{children}</div>
        </div>
    );
}

export function WompiConfigCard() {
    const dict = useDictionary();
    const t = dict.superAdminUI?.wompiConfig || {};
    const ui = dict.ui || {};

    const [config, setConfig] = useState<ConfigState>({
        publicKey: '', privateKey: '', eventsSecret: '',
        integritySecret: '', isSandbox: true, webhookUrl: '',
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
            setSaveResult({ success: true, message: 'Configuración guardada correctamente' });
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
        <div className="space-y-6">
            {/* Header card */}
            <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">{t.title || 'Configuración Wompi'}</p>
                            <p className="text-[13px] text-muted-foreground">
                                {t.description || 'Claves API de Wompi para procesar pagos. Los secretos se almacenan cifrados.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {hasExisting && (
                            <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Configurado
                            </Badge>
                        )}
                        <Badge variant={config.isSandbox ? 'outline' : 'default'} className="text-xs">
                            {config.isSandbox ? 'Sandbox' : 'Producción'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Mode section */}
            <div className="bg-card rounded-xl border p-5">
                <Section
                    icon={FlaskConical}
                    title="Modo de operación"
                    description="Elige si procesar pagos reales o en modo de pruebas."
                    iconClass="bg-amber-50 text-amber-600"
                >
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {config.isSandbox ? 'Modo Sandbox (pruebas)' : 'Modo Producción'}
                            </p>
                            <p className="text-[13px] text-muted-foreground">
                                {config.isSandbox
                                    ? 'Los pagos no son reales. Usa claves de prueba de Wompi.'
                                    : 'Los pagos son reales. Asegúrate de usar claves de producción.'}
                            </p>
                        </div>
                        <Switch
                            checked={config.isSandbox}
                            onCheckedChange={(v) => setConfig({ ...config, isSandbox: v })}
                        />
                    </div>
                </Section>
            </div>

            {/* API Keys section */}
            <div className="bg-card rounded-xl border p-5 space-y-6">
                <Section
                    icon={Shield}
                    title="Claves API"
                    description="Obtén estas claves desde el panel de Wompi."
                    iconClass="bg-blue-50 text-blue-600"
                >
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[13px]">Public Key</Label>
                                <Input
                                    value={config.publicKey}
                                    onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                                    placeholder="pub_test_..."
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[13px]">Private Key</Label>
                                    <button
                                        type="button"
                                        onClick={() => setShowSecrets(!showSecrets)}
                                        className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showSecrets ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        {showSecrets ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>
                                <Input
                                    type={showSecrets ? 'text' : 'password'}
                                    value={config.privateKey}
                                    onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
                                    placeholder="prv_test_..."
                                />
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[13px]">Events Secret</Label>
                                <Input
                                    type={showSecrets ? 'text' : 'password'}
                                    value={config.eventsSecret}
                                    onChange={(e) => setConfig({ ...config, eventsSecret: e.target.value })}
                                    placeholder="events_..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[13px]">Integrity Secret</Label>
                                <Input
                                    type={showSecrets ? 'text' : 'password'}
                                    value={config.integritySecret}
                                    onChange={(e) => setConfig({ ...config, integritySecret: e.target.value })}
                                    placeholder="integrity_..."
                                />
                            </div>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Webhook section */}
            <div className="bg-card rounded-xl border p-5">
                <Section
                    icon={Webhook}
                    title="Webhook URL"
                    description="URL donde Wompi enviará las notificaciones de pago. Configúrala en el panel de Wompi."
                    iconClass="bg-violet-50 text-violet-600"
                >
                    <Input
                        value={config.webhookUrl}
                        onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                        placeholder="https://tudominio.com/api/webhook/wompi"
                    />
                </Section>
            </div>

            {/* Feedback messages */}
            {(testResult || saveResult) && (
                <div className="space-y-2">
                    {testResult && (
                        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${
                            testResult.success
                                ? 'bg-[#ECFDF5] border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            {testResult.success
                                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                                : <XCircle className="h-4 w-4 shrink-0" />}
                            {testResult.message}
                        </div>
                    )}
                    {saveResult && (
                        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${
                            saveResult.success
                                ? 'bg-[#ECFDF5] border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            {saveResult.success
                                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                                : <XCircle className="h-4 w-4 shrink-0" />}
                            {saveResult.message}
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleTest}
                        disabled={testing || !config.publicKey}
                        className="gap-2"
                    >
                        {testing
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Zap className="h-4 w-4" />}
                        {t.testConnection || 'Probar conexión'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleMigrate}
                        disabled={migrateStatus === 'running' || migrateStatus === 'done'}
                        className="gap-2"
                    >
                        <Database className="h-4 w-4" />
                        {migrateStatus === 'running' ? 'Migrando...'
                            : migrateStatus === 'done' ? 'Tablas listas'
                            : 'Crear tablas DB'}
                    </Button>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !config.publicKey}
                    className="gap-2"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? (ui.saving || 'Guardando...') : (t.saveConfig || 'Guardar configuración')}
                </Button>
            </div>
        </div>
    );
}
