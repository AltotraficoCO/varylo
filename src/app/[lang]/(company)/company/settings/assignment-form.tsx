'use client';

import { useState } from 'react';
import { updateAssignmentStrategy } from './actions';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Users } from "lucide-react";
import type { AssignmentStrategy } from '@prisma/client';
import { useDictionary } from '@/lib/i18n-context';

export function AssignmentForm({
    currentStrategy,
    currentAgentId,
    currentExcludedIds,
    agents,
}: {
    currentStrategy: AssignmentStrategy;
    currentAgentId: string | null;
    currentExcludedIds: string[];
    agents: { id: string; name: string | null; email: string; role: string }[];
}) {
    const [strategy, setStrategy] = useState<AssignmentStrategy>(currentStrategy);
    const [agentId, setAgentId] = useState<string>(currentAgentId || '');
    const [excluded, setExcluded] = useState<string[]>(currentExcludedIds);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const supportsExclusion = strategy === 'LEAST_BUSY' || strategy === 'ROUND_ROBIN';

    function toggleExcluded(id: string) {
        setMessage(null);
        setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function excludedSetsEqual(a: string[], b: string[]) {
        if (a.length !== b.length) return false;
        const sa = new Set(a);
        return b.every((x) => sa.has(x));
    }

    const dict = useDictionary();
    const t = dict.settingsUI?.assignmentForm || {};
    const ui = dict.ui || {};

    const STRATEGIES: { value: AssignmentStrategy; label: string; description: string }[] = [
        { value: 'LEAST_BUSY', label: t.leastBusy || 'Menor carga', description: t.leastBusyDesc || 'Asigna al agente con menos conversaciones abiertas.' },
        { value: 'ROUND_ROBIN', label: t.roundRobin || 'Rotación', description: t.roundRobinDesc || 'Rota entre agentes en orden.' },
        { value: 'SPECIFIC_AGENT', label: t.specificAgent || 'Agente específico', description: t.specificAgentDesc || 'Todas las conversaciones van a un agente.' },
        { value: 'MANUAL_ONLY', label: t.manualOnly || 'Solo manual', description: t.manualOnlyDesc || 'No se asigna automáticamente, quedan en "Sin asignar".' },
    ];

    const hasChanges =
        strategy !== currentStrategy ||
        (strategy === 'SPECIFIC_AGENT' && agentId !== (currentAgentId || '')) ||
        (supportsExclusion && !excludedSetsEqual(excluded, currentExcludedIds));

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const result = await updateAssignmentStrategy(
                strategy,
                strategy === 'SPECIFIC_AGENT' ? agentId : undefined,
                supportsExclusion ? excluded : [],
            );
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
            });
        } catch {
            setMessage({ type: 'error', text: t.saveError || 'Error al guardar.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle className="text-lg">{t.title || 'Asignación de Conversaciones'}</CardTitle>
                </div>
                <CardDescription>
                    {t.description || 'Define cómo se asignan automáticamente las nuevas conversaciones a los agentes.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>{t.strategyLabel || 'Estrategia de asignación'}</Label>
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
                        <Label>{t.agentLabel || 'Agente'}</Label>
                        <Select value={agentId} onValueChange={(v) => { setAgentId(v); setMessage(null); }}>
                            <SelectTrigger>
                                <SelectValue placeholder={t.selectAgent || 'Selecciona un agente'} />
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

                {supportsExclusion && (() => {
                    const excludableAgents = agents.filter((a) => a.role !== 'COMPANY_ADMIN');
                    return (
                    <div className="space-y-2 pt-2 border-t">
                        <div>
                            <Label>Excluir agentes de esta estrategia</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Los agentes marcados no recibirán conversaciones automáticamente. Podrás seguir asignándolos manualmente desde el chat. Los administradores nunca entran al pool automático.
                            </p>
                        </div>
                        {excludableAgents.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No hay agentes disponibles.</p>
                        ) : (
                            <div className="max-h-60 overflow-y-auto rounded-md border divide-y bg-muted/30">
                                {excludableAgents.map((a) => {
                                    const isExcluded = excluded.includes(a.id);
                                    return (
                                        <label
                                            key={a.id}
                                            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/60 transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isExcluded}
                                                onChange={() => toggleExcluded(a.id)}
                                                className="h-4 w-4 rounded border-input"
                                            />
                                            <span className="flex-1 truncate">
                                                {a.name || a.email}
                                                {a.name && (
                                                    <span className="text-xs text-muted-foreground ml-2">{a.email}</span>
                                                )}
                                            </span>
                                            {isExcluded && (
                                                <span className="text-[10px] uppercase tracking-wide text-amber-600 font-medium">
                                                    Excluido
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {excluded.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {excluded.length} agente{excluded.length === 1 ? '' : 's'} excluido{excluded.length === 1 ? '' : 's'}.
                            </p>
                        )}
                    </div>
                    );
                })()}

                {message && (
                    <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {message.text}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={saving || !hasChanges} className="w-full">
                    {saving ? (ui.saving || 'Guardando...') : (ui.save || 'Guardar')}
                </Button>
            </CardFooter>
        </Card>
    );
}
