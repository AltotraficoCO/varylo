'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Check, AlertTriangle, Globe, BookOpen } from 'lucide-react';
import { createApiKey, listApiKeys, revokeApiKey, deleteApiKey } from './api-keys-actions';
import Link from 'next/link';
import { useDictionary } from '@/lib/i18n-context';

type ApiKeyItem = {
    id: string;
    name: string;
    lastFour: string;
    scopes: string[];
    active: boolean;
    lastUsedAt: string | null;
    createdAt: string;
    webhookUrl: string | null;
};

export function ApiKeysSection() {
    const [keys, setKeys] = useState<ApiKeyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dict = useDictionary();
    const t = dict.settingsUI?.apiKeysSection || {};
    const ui = dict.ui || {};

    useEffect(() => {
        loadKeys();
    }, []);

    async function loadKeys() {
        const result = await listApiKeys();
        if (result.success) {
            setKeys(result.keys as ApiKeyItem[]);
        }
        setLoading(false);
    }

    async function handleCreate() {
        if (!newKeyName.trim()) return;
        setCreating(true);
        setError(null);

        const result = await createApiKey(newKeyName.trim());
        if (result.success && result.apiKey) {
            setNewlyCreatedKey(result.apiKey);
            setNewKeyName('');
            setShowForm(false);
            await loadKeys();
        } else {
            setError(result.error || (t.createError || 'Error al crear la API key.'));
        }
        setCreating(false);
    }

    async function handleRevoke(keyId: string) {
        const confirmed = window.confirm(t.revokeConfirm || '¿Revocar esta API key? Las integraciones que la usen dejarán de funcionar.');
        if (!confirmed) return;

        const result = await revokeApiKey(keyId);
        if (result.success) {
            await loadKeys();
        }
    }

    async function handleDelete(keyId: string) {
        const confirmed = window.confirm(t.deleteConfirm || '¿Eliminar permanentemente esta API key?');
        if (!confirmed) return;

        const result = await deleteApiKey(keyId);
        if (result.success) {
            await loadKeys();
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    {t.title || 'API Keys'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t.description || 'Genera API keys para integrar tu cuenta con sistemas externos.'}
                </p>
            </div>

            {/* Newly created key banner */}
            {newlyCreatedKey && (
                <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    {t.copyNow || 'Copia tu API key ahora. No se mostrara de nuevo.'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <code className="flex-1 bg-white dark:bg-gray-900 border rounded px-3 py-2 text-xs font-mono break-all">
                                        {newlyCreatedKey}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(newlyCreatedKey)}
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="mt-2 text-xs"
                                    onClick={() => setNewlyCreatedKey(null)}
                                >
                                    {t.understood || 'Entendido, ya la copie'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create form */}
            {showForm ? (
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-foreground mb-1.5 block">
                                    {t.apiKeyName || 'Nombre de la API Key'}
                                </label>
                                <Input
                                    placeholder={t.apiKeyNamePlaceholder || 'Ej: Produccion, Mi ERP, Testing...'}
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    maxLength={50}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                            </div>
                            <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                                {creating ? (ui.creating || 'Creando...') : (ui.create || 'Crear')}
                            </Button>
                            <Button variant="ghost" onClick={() => { setShowForm(false); setError(null); }}>
                                {ui.cancel || 'Cancelar'}
                            </Button>
                        </div>
                        {error && (
                            <p className="text-sm text-red-500 mt-2">{error}</p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {dict.settingsUI?.createApiKey || 'Crear API Key'}
                </Button>
            )}

            {/* Keys list */}
            {loading ? (
                <p className="text-sm text-muted-foreground">{ui.loading || 'Cargando...'}</p>
            ) : keys.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <Key className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {t.noKeysDesc || 'No tienes API keys. Crea una para empezar a integrar.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {keys.map((key) => (
                        <Card key={key.id} className={!key.active ? 'opacity-60' : ''}>
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{key.name}</span>
                                                <Badge variant={key.active ? 'default' : 'secondary'} className="text-xs">
                                                    {key.active ? (t.activeStatus || 'Activa') : (t.revokedStatus || 'Revocada')}
                                                </Badge>
                                                {key.webhookUrl && (
                                                    <Badge variant="outline" className="text-xs gap-1">
                                                        <Globe className="h-3 w-3" />
                                                        Webhook
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="font-mono">vk_live_****{key.lastFour}</span>
                                                <span>{t.created || 'Creada:'} {new Date(key.createdAt).toLocaleDateString()}</span>
                                                {key.lastUsedAt && (
                                                    <span>{t.lastUsed || 'Ultimo uso:'} {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {key.active && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-amber-600 hover:text-amber-700"
                                                onClick={() => handleRevoke(key.id)}
                                            >
                                                {t.revoke || 'Revocar'}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDelete(key.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* API Documentation link */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                {t.apiDocs || 'Documentacion de la API'}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.apiDocsDesc || 'Endpoints, ejemplos, webhooks y codigos de error.'}
                            </p>
                        </div>
                        <Link href="/company/api-docs">
                            <Button variant="outline" size="sm" className="gap-2">
                                {t.viewDocs || 'Ver documentacion'}
                                <BookOpen className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                    <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">{t.authHeader || 'Header de autenticacion:'}</p>
                        <code className="text-xs font-mono">Authorization: Bearer vk_live_tu_api_key</code>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
