import { prisma } from '@/lib/prisma';
import {
    STATUS_COMPONENTS,
    SEVERITY_LABEL,
    TYPE_LABEL,
    severityColorClasses,
    componentLabel,
    computeGlobalState,
    type StatusSeverity,
    type StatusIncidentType,
} from '@/lib/status';
import { CheckCircle2, AlertTriangle, AlertCircle, Wrench } from 'lucide-react';

export const revalidate = 60;
export const metadata = { title: 'Estado del sistema · Varylo' };

function fmtDate(d: Date | null) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('es', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(d);
}

export default async function StatusPage() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [active, history] = await Promise.all([
        prisma.statusIncident.findMany({
            where: { resolvedAt: null, startsAt: { lte: now } },
            orderBy: { startsAt: 'desc' },
        }),
        prisma.statusIncident.findMany({
            where: { resolvedAt: { not: null, gte: thirtyDaysAgo } },
            orderBy: { resolvedAt: 'desc' },
            take: 50,
        }),
    ]);

    const upcomingMaintenance = await prisma.statusIncident.findMany({
        where: { resolvedAt: null, startsAt: { gt: now }, type: 'MAINTENANCE' },
        orderBy: { startsAt: 'asc' },
    });

    const global = computeGlobalState(active);

    // Per-component status: a component is degraded if any active INCIDENT lists it
    const affectedNow = new Set<string>();
    for (const inc of active) {
        if (inc.type === 'INCIDENT') {
            for (const c of inc.components) affectedNow.add(c);
        }
    }

    const headerIcon = global.tone === 'ok' ? CheckCircle2 :
        global.tone === 'maintenance' ? Wrench : AlertTriangle;
    const HeaderIcon = headerIcon;
    const headerColor = global.tone === 'ok' ? 'text-green-600' :
        global.tone === 'critical' ? 'text-red-600' :
        global.tone === 'major' ? 'text-orange-600' :
        global.tone === 'minor' ? 'text-amber-600' : 'text-blue-600';

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b">
                    <HeaderIcon className={`h-10 w-10 ${headerColor}`} />
                    <div>
                        <h1 className="text-2xl font-semibold">Estado de Varylo</h1>
                        <p className={`text-sm mt-1 ${headerColor}`}>{global.label}</p>
                    </div>
                </div>

                {/* Active incidents */}
                {active.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Activos
                        </h2>
                        {active.map(inc => {
                            const c = severityColorClasses(inc.severity as StatusSeverity, inc.type as StatusIncidentType);
                            return (
                                <div key={inc.id} className={`rounded-lg border p-4 ${c.bg} ${c.border}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>
                                                    {TYPE_LABEL[inc.type as StatusIncidentType]}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>
                                                    {SEVERITY_LABEL[inc.severity as StatusSeverity]}
                                                </span>
                                            </div>
                                            <h3 className={`mt-2 font-semibold ${c.text}`}>{inc.title}</h3>
                                            {inc.description && (
                                                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                                                    {inc.description}
                                                </p>
                                            )}
                                            <div className="mt-3 text-xs text-muted-foreground">
                                                Inicio: {fmtDate(inc.startsAt)}
                                                {inc.endsAt && <> · ETA fin: {fmtDate(inc.endsAt)}</>}
                                            </div>
                                            {inc.components.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {inc.components.map(comp => (
                                                        <span key={comp} className="text-xs px-2 py-0.5 rounded bg-background border">
                                                            {componentLabel(comp)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}

                {/* Upcoming maintenance */}
                {upcomingMaintenance.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Próximos mantenimientos
                        </h2>
                        {upcomingMaintenance.map(inc => (
                            <div key={inc.id} className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Wrench className="h-4 w-4 text-blue-600" />
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                        Programado
                                    </span>
                                </div>
                                <h3 className="font-semibold text-blue-700">{inc.title}</h3>
                                {inc.description && (
                                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{inc.description}</p>
                                )}
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {fmtDate(inc.startsAt)} → {fmtDate(inc.endsAt)}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Components grid */}
                <section className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Componentes
                    </h2>
                    <div className="rounded-lg border divide-y">
                        {STATUS_COMPONENTS.map(comp => {
                            const isDown = affectedNow.has(comp.id);
                            return (
                                <div key={comp.id} className="flex items-center justify-between p-3">
                                    <span className="text-sm">{comp.label}</span>
                                    <div className="flex items-center gap-2">
                                        {isDown ? (
                                            <>
                                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                                <span className="text-sm text-orange-600">Con problemas</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span className="text-sm text-green-600">Operativo</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* History */}
                <section className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Últimos 30 días
                    </h2>
                    {history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin incidentes en los últimos 30 días.</p>
                    ) : (
                        <div className="space-y-2">
                            {history.map(inc => (
                                <div key={inc.id} className="rounded-lg border p-3">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <h3 className="text-sm font-medium">{inc.title}</h3>
                                        <span className="text-xs text-muted-foreground">
                                            Resuelto {fmtDate(inc.resolvedAt)}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {TYPE_LABEL[inc.type as StatusIncidentType]} · {SEVERITY_LABEL[inc.severity as StatusSeverity]}
                                        {inc.components.length > 0 && ` · ${inc.components.map(componentLabel).join(', ')}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <footer className="pt-6 border-t text-xs text-muted-foreground text-center">
                    Esta página se actualiza cada 60 segundos.
                </footer>
            </div>
        </div>
    );
}
