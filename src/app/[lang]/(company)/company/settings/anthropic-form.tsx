'use client';

import { useActionState, useState } from 'react';
import { saveAnthropicKey, removeAnthropicKey } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Key } from "lucide-react";

export function AnthropicKeyForm({
    hasApiKey,
    updatedAt,
}: {
    hasApiKey: boolean;
    updatedAt?: string | null;
}) {
    const [state, action, isPending] = useActionState(saveAnthropicKey, undefined);
    const [isRemoving, setIsRemoving] = useState(false);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');
    const isConnected = hasApiKey || isSuccess;

    const handleRemove = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar la API Key de Anthropic?')) return;
        setIsRemoving(true);
        try {
            await removeAnthropicKey();
        } catch {
            alert('Error al eliminar la API Key.');
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
                        <CardTitle className="text-green-700">Anthropic API Key Configurada</CardTitle>
                    </div>
                    <CardDescription>
                        Tu empresa tiene una API Key de Anthropic Claude personalizada. Los agentes con modelos Claude usarán esta key.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {updatedAt && (
                        <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">Última actualización</Label>
                            <p className="text-sm">{new Date(updatedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex gap-3 justify-end">
                    <Button type="button" variant="destructive" onClick={handleRemove} disabled={isRemoving}>
                        {isRemoving ? 'Eliminando...' : 'Eliminar Key'}
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
                    <CardTitle>Anthropic Claude API Key</CardTitle>
                </div>
                <CardDescription>
                    Configura tu API Key de Anthropic para usar modelos Claude (claude-3-5-sonnet, claude-3-7-sonnet, etc.) en tus agentes IA.
                </CardDescription>
            </CardHeader>
            <form action={action} className="flex flex-col gap-6">
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="anthropicApiKey">API Key</Label>
                        <Input
                            id="anthropicApiKey"
                            name="anthropicApiKey"
                            type="password"
                            placeholder="sk-ant-..."
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
                        {isPending ? 'Validando y guardando...' : 'Guardar API Key'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
