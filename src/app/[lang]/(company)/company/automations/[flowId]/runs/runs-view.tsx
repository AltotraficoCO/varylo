'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface Run {
    id: string;
    status: string;
    error: string | null;
    path: string[];
    payload: unknown;
    createdAt: string;
}

const STATUS = {
    SUCCESS: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Éxito' },
    NO_MATCH: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Sin coincidencia' },
    ERROR: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Error' },
} as const;

function fmt(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function RunsView({ flowName, backHref, nodeLabels, runs }: {
    flowName: string;
    backHref: string;
    nodeLabels: Record<string, string>;
    runs: Run[];
}) {
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Link href={backHref}><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
            </div>
            <div>
                <h1 className="text-2xl font-semibold">Ejecuciones · {flowName}</h1>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    El historial se conserva 5 días; cada ejecución se borra automáticamente después.
                </p>
            </div>

            {runs.length === 0 ? (
                <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
                    Aún no hay ejecuciones. Cuando tu app envíe un lead al webhook, aparecerán aquí.
                </div>
            ) : (
                <div className="rounded-xl border divide-y">
                    {runs.map(run => {
                        const s = STATUS[run.status as keyof typeof STATUS] || STATUS.ERROR;
                        const Icon = s.icon;
                        const isOpen = expanded === run.id;
                        return (
                            <div key={run.id}>
                                <button
                                    onClick={() => setExpanded(isOpen ? null : run.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 text-left"
                                >
                                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${s.bg} ${s.color}`}>
                                        <Icon className="h-3.5 w-3.5" />{s.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{fmt(run.createdAt)}</span>
                                    <span className="text-xs text-muted-foreground truncate ml-2">
                                        {run.path.map(id => nodeLabels[id] || id).join('  →  ') || '—'}
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="px-4 pb-4 pl-11 space-y-3">
                                        {run.error && (
                                            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{run.error}</div>
                                        )}
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Camino</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {run.path.length ? run.path.map((id, i) => (
                                                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-muted">{nodeLabels[id] || id}</span>
                                                )) : <span className="text-xs text-muted-foreground">—</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Payload recibido</p>
                                            <pre className="text-[11px] bg-muted rounded-md p-3 overflow-x-auto">{JSON.stringify(run.payload, null, 2)}</pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
