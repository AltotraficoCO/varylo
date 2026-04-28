'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_COMPONENTS } from '@/lib/status';
import { createStatusIncident, updateStatusIncident } from './actions';

type IncidentInput = {
    id?: string;
    title?: string;
    description?: string | null;
    type?: string;
    severity?: string;
    components?: string[];
    startsAt?: string;
    endsAt?: string | null;
    showBanner?: boolean;
};

function toLocalInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function IncidentForm({ incident, onClose }: { incident?: IncidentInput; onClose?: () => void }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const isEdit = !!incident?.id;

    const handleSubmit = async (formData: FormData) => {
        setError(null);
        startTransition(async () => {
            try {
                if (isEdit && incident?.id) {
                    await updateStatusIncident(incident.id, formData);
                } else {
                    await createStatusIncident(formData);
                }
                onClose?.();
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Error');
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isEdit ? 'Editar incidente' : 'Crear incidente o mantenimiento'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" name="title" required defaultValue={incident?.title} placeholder="Mantenimiento de base de datos" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            defaultValue={incident?.description || ''}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                            placeholder="Detalles que verán los usuarios..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo</Label>
                            <select id="type" name="type" defaultValue={incident?.type || 'INCIDENT'} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs">
                                <option value="INCIDENT">Incidente</option>
                                <option value="MAINTENANCE">Mantenimiento</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="severity">Severidad</Label>
                            <select id="severity" name="severity" defaultValue={incident?.severity || 'MINOR'} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs">
                                <option value="INFO">Informativo</option>
                                <option value="MINOR">Menor</option>
                                <option value="MAJOR">Mayor</option>
                                <option value="CRITICAL">Crítico</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="startsAt">Inicio</Label>
                            <Input
                                id="startsAt"
                                name="startsAt"
                                type="datetime-local"
                                required
                                defaultValue={toLocalInput(incident?.startsAt) || toLocalInput(new Date().toISOString())}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endsAt">Fin (opcional)</Label>
                            <Input
                                id="endsAt"
                                name="endsAt"
                                type="datetime-local"
                                defaultValue={toLocalInput(incident?.endsAt)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Componentes afectados</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUS_COMPONENTS.map(comp => (
                                <label key={comp.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        name="components"
                                        value={comp.id}
                                        defaultChecked={incident?.components?.includes(comp.id)}
                                        className="rounded border-input"
                                    />
                                    {comp.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="showBanner"
                            defaultChecked={incident?.showBanner ?? true}
                            className="rounded border-input"
                        />
                        Mostrar banner en todas las cuentas
                    </label>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex gap-2 justify-end">
                        {onClose && (
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                        )}
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
