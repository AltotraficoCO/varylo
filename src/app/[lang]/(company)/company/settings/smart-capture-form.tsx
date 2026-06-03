'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { setSmartCapture } from './actions';

export function SmartCaptureForm({ enabled }: { enabled: boolean }) {
    const [on, setOn] = useState(enabled);
    const [isPending, startTransition] = useTransition();

    const handleToggle = (next: boolean) => {
        setOn(next);
        startTransition(async () => {
            const result = await setSmartCapture(next);
            if (result.success) {
                toast.success(next ? 'Captura inteligente activada' : 'Captura inteligente desactivada');
            } else {
                setOn(!next);
                toast.error(result.message || 'No se pudo actualizar');
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    Captura inteligente de datos
                </CardTitle>
                <CardDescription>
                    Cuando está activa, Varylo extrae y ubica los datos del cliente (nombre, teléfono, correo, etc.)
                    <strong> también en conversaciones atendidas por una persona</strong>, leyendo lo que el cliente
                    escribe y los documentos/imágenes que envía. Usa los campos de captura configurados en tus agentes IA.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                        <p className="text-sm font-medium">{on ? 'Activada' : 'Desactivada'}</p>
                        <p className="text-xs text-muted-foreground">Aplica a toda la cuenta, solo en conversaciones de humanos.</p>
                    </div>
                    <Switch checked={on} onCheckedChange={handleToggle} disabled={isPending} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                    Necesitas al menos un agente IA con campos de captura definidos (de ahí Varylo sabe qué datos extraer).
                </p>
            </CardContent>
        </Card>
    );
}
