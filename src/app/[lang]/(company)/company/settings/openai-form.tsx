'use client';

import { useActionState, useState } from 'react';
import { saveOpenAIKey, removeOpenAIKey } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Key } from "lucide-react";
import { useDictionary } from '@/lib/i18n-context';

export function OpenAIKeyForm({
    hasApiKey,
    updatedAt,
}: {
    hasApiKey: boolean;
    updatedAt?: string | null;
}) {
    const [state, action, isPending] = useActionState(saveOpenAIKey, undefined);
    const [isRemoving, setIsRemoving] = useState(false);

    const dict = useDictionary();
    const t = dict.settingsUI?.openaiForm || {};
    const ui = dict.ui || {};

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');

    const isConnected = hasApiKey || isSuccess;

    const handleRemove = async () => {
        if (!confirm(t.removeConfirm || '¿Estás seguro de que quieres eliminar la API Key? Se usará la key global del sistema.')) return;
        setIsRemoving(true);
        try {
            await removeOpenAIKey();
        } catch {
            alert(t.removeError || 'Error al eliminar la API Key.');
        } finally {
            setIsRemoving(false);
        }
    };

    if (isConnected) {
        return (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/10">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <CardTitle className="text-green-700">{t.configured || 'OpenAI API Key Configurada'}</CardTitle>
                    </div>
                    <CardDescription>
                        {t.configuredDesc || 'Tu empresa tiene una API Key de OpenAI personalizada. ValerIA y los Agentes IA usarán esta key.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {updatedAt && (
                        <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">{t.lastUpdate || 'Última actualización'}</Label>
                            <p className="text-sm">{new Date(updatedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex gap-3 justify-end">
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleRemove}
                        disabled={isRemoving}
                    >
                        {isRemoving ? (t.removing || 'Eliminando...') : (t.removeButton || 'Eliminar Key')}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    <CardTitle>OpenAI API Key</CardTitle>
                </div>
                <CardDescription>
                    {t.notConfiguredDesc || 'Configura tu propia API Key de OpenAI para ValerIA y los Agentes IA. Si no se configura, se usará la key global del sistema.'}
                </CardDescription>
            </CardHeader>
            <form action={action} className="flex flex-col gap-6">
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="openaiApiKey">API Key</Label>
                        <Input
                            id="openaiApiKey"
                            name="openaiApiKey"
                            type="password"
                            placeholder="sk-..."
                            required
                        />
                    </div>

                    {isError && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {state}
                        </div>
                    )}

                    {isSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            {state}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? (t.validating || 'Validando y guardando...') : (t.saveButton || 'Guardar API Key')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
