'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { IncidentForm } from './incident-form';
import { resolveStatusIncident, reopenStatusIncident, deleteStatusIncident } from './actions';
import { TYPE_LABEL, SEVERITY_LABEL, componentLabel, type StatusIncidentType, type StatusSeverity } from '@/lib/status';

type Incident = {
    id: string;
    title: string;
    description: string | null;
    type: string;
    severity: string;
    components: string[];
    startsAt: string;
    endsAt: string | null;
    resolvedAt: string | null;
    showBanner: boolean;
};

function fmt(iso: string | null) {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function IncidentRow({ incident }: { incident: Incident }) {
    const [editing, setEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const isResolved = !!incident.resolvedAt;

    if (editing) {
        return (
            <IncidentForm
                incident={{ ...incident, description: incident.description || undefined }}
                onClose={() => setEditing(false)}
            />
        );
    }

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {TYPE_LABEL[incident.type as StatusIncidentType]}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {SEVERITY_LABEL[incident.severity as StatusSeverity]}
                        </span>
                        {isResolved && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                Resuelto
                            </span>
                        )}
                        {!isResolved && incident.showBanner && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Banner activo
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold">{incident.title}</h3>
                    {incident.description && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{incident.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                        Inicio: {fmt(incident.startsAt)}
                        {incident.endsAt && <> · Fin: {fmt(incident.endsAt)}</>}
                        {incident.resolvedAt && <> · Resuelto: {fmt(incident.resolvedAt)}</>}
                    </div>
                    {incident.components.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {incident.components.map(c => (
                                <span key={c} className="text-xs px-2 py-0.5 rounded bg-background border">
                                    {componentLabel(c)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        Editar
                    </Button>
                    {isResolved ? (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => startTransition(() => reopenStatusIncident(incident.id))}
                        >
                            Reabrir
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => startTransition(() => resolveStatusIncident(incident.id))}
                        >
                            Marcar resuelto
                        </Button>
                    )}
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                            if (confirm('¿Eliminar este incidente?')) {
                                startTransition(() => deleteStatusIncident(incident.id));
                            }
                        }}
                    >
                        Eliminar
                    </Button>
                </div>
            </div>
        </div>
    );
}
