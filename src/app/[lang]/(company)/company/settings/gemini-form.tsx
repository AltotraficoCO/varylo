'use client';

import { useActionState, useState } from 'react';
import { saveGeminiKey, removeGeminiKey } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Key } from "lucide-react";

export function GeminiKeyForm({
    hasApiKey,
    updatedAt,
}: {
    hasApiKey: boolean;
    updatedAt?: string | null;
}) {
    const [state, action, isPending] = useActionState(saveGeminiKey, undefined);
    const [isRemoving, setIsRemoving] = useState(false);

    const isSuccess = state?.startsWith('Success');
    const isError = state?.startsWith('Error');
    const isConnected = hasApiKey || isSuccess;

    const handleRemove = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar la API Key de Gemini?')) return;
        setIsRemoving(true);
        try {
            await removeGeminiKey();
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
                        <CardTitle className="text-green-700">Google Gemini API Key Configurada</CardTitle>
                    </div>
                    <CardDescription>
                        Tu empresa tiene una API Key de Google Gemini personalizada. Los agentes con modelos Gemini usarán esta key.
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
                    <CardTitle>Google Gemini API Key</CardTitle>
                </div>
                <CardDescription>
                    Configura tu API Key de Google Gemini para usar modelos como Gemini 2.0 Flash en tus agentes IA. Obtén tu key en Google AI Studio.
                </CardDescription>
            </CardHeader>
            <form action={action} className="flex flex-col gap-6">
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="geminiApiKey">API Key</Label>
                        <Input
                            id="geminiApiKey"
                            name="geminiApiKey"
                            type="password"
                            placeholder="AIza..."
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
