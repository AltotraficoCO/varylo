'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { updateUnattendedThreshold } from './actions';

const PRESETS = [5, 10, 20, 30, 60];

export function UnattendedThresholdForm({ current }: { current: number }) {
    const [minutes, setMinutes] = useState<number>(current);
    const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        setFeedback(null);
        startTransition(async () => {
            const result = await updateUnattendedThreshold(minutes);
            setFeedback({ ok: result.success, message: result.message });
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Conversaciones desatendidas
                </CardTitle>
                <CardDescription>
                    Una conversación se marca como <strong>desatendida</strong> cuando el cliente fue el último en
                    escribir y nadie del equipo ha respondido en el tiempo definido. Esto alimenta la métrica de
                    “Desatendidos” en Analítica.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setMinutes(preset)}
                            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                                minutes === preset
                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                    : 'border-input hover:border-primary/40 text-muted-foreground'
                            }`}
                        >
                            {preset} min
                        </button>
                    ))}
                </div>
                <div className="space-y-2 max-w-xs">
                    <Label htmlFor="unattended-minutes">Tiempo personalizado (minutos)</Label>
                    <Input
                        id="unattended-minutes"
                        type="number"
                        min={1}
                        max={1440}
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value))}
                    />
                </div>
                {feedback && (
                    <div className={`flex items-center gap-2 text-sm ${feedback.ok ? 'text-green-600' : 'text-destructive'}`}>
                        {feedback.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {feedback.message}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isPending || minutes === current}>
                    {isPending ? 'Guardando...' : 'Guardar'}
                </Button>
            </CardFooter>
        </Card>
    );
}
