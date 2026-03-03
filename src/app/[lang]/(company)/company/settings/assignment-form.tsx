'use client';

import { useState } from 'react';
import { updateAssignmentStrategy } from './actions';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Users } from "lucide-react";
import type { AssignmentStrategy } from '@prisma/client';

const STRATEGIES: { value: AssignmentStrategy; label: string; description: string }[] = [
    { value: 'LEAST_BUSY', label: 'Menor carga', description: 'Asigna al agente con menos conversaciones abiertas.' },
    { value: 'ROUND_ROBIN', label: 'Rotación', description: 'Rota entre agentes en orden.' },
    { value: 'SPECIFIC_AGENT', label: 'Agente específico', description: 'Todas las conversaciones van a un agente.' },
    { value: 'MANUAL_ONLY', label: 'Solo manual', description: 'No se asigna automáticamente, quedan en "Sin asignar".' },
];

export function AssignmentForm({
    currentStrategy,
    currentAgentId,
    agents,
}: {
    currentStrategy: AssignmentStrategy;
    currentAgentId: string | null;
    agents: { id: string; name: string | null; email: string }[];
}) {
    const [strategy, setStrategy] = useState<AssignmentStrategy>(currentStrategy);
    const [agentId, setAgentId] = useState<string>(currentAgentId || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const hasChanges = strategy !== currentStrategy || (strategy === 'SPECIFIC_AGENT' && agentId !== (currentAgentId || ''));

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const result = await updateAssignmentStrategy(
                strategy,
                strategy === 'SPECIFIC_AGENT' ? agentId : undefined
            );
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
            });
        } catch {
            setMessage({ type: 'error', text: 'Error al guardar.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle className="text-lg">Asignación de Conversaciones</CardTitle>
                </div>
                <CardDescription>
                    Define cómo se asignan automáticamente las nuevas conversaciones a los agentes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Estrategia de asignación</Label>
                    <Select value={strategy} onValueChange={(v) => { setStrategy(v as AssignmentStrategy); setMessage(null); }}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STRATEGIES.map(s => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        {STRATEGIES.find(s => s.value === strategy)?.description}
                    </p>
                </div>

                {strategy === 'SPECIFIC_AGENT' && (
                    <div className="space-y-2">
                        <Label>Agente</Label>
                        <Select value={agentId} onValueChange={(v) => { setAgentId(v); setMessage(null); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un agente" />
                            </SelectTrigger>
                            <SelectContent>
                                {agents.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name || a.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {message && (
                    <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {message.text}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={saving || !hasChanges} className="w-full">
                    {saving ? 'Guardando...' : 'Guardar'}
                </Button>
            </CardFooter>
        </Card>
    );
}
