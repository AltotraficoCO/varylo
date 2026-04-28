import { prisma } from '@/lib/prisma';
import { AlertTriangle, Wrench, Info } from 'lucide-react';
import { componentLabel, type StatusSeverity, type StatusIncidentType } from '@/lib/status';
import Link from 'next/link';

function fmtDateShort(d: Date | null) {
    if (!d) return '';
    return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

export async function StatusBanner() {
    const now = new Date();
    const incidents = await prisma.statusIncident.findMany({
        where: {
            resolvedAt: null,
            showBanner: true,
            startsAt: { lte: now },
        },
        orderBy: [{ severity: 'desc' }, { startsAt: 'desc' }],
        take: 3,
    });

    if (incidents.length === 0) return null;

    return (
        <div className="flex flex-col">
            {incidents.map(inc => {
                const type = inc.type as StatusIncidentType;
                const sev = inc.severity as StatusSeverity;

                const isMaintenance = type === 'MAINTENANCE';
                const isCritical = sev === 'CRITICAL';
                const isMajor = sev === 'MAJOR';

                const bg = isMaintenance ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : isCritical ? 'bg-red-50 border-red-200 text-red-800'
                    : isMajor ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800';

                const Icon = isMaintenance ? Wrench : sev === 'INFO' ? Info : AlertTriangle;

                const components = inc.components.length > 0
                    ? ` · ${inc.components.map(componentLabel).join(', ')}`
                    : '';

                const window = inc.endsAt ? ` (hasta ${fmtDateShort(inc.endsAt)})` : '';

                return (
                    <div key={inc.id} className={`border-b px-4 py-2 flex items-center gap-2 text-sm ${bg}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 min-w-0 truncate">
                            <strong>{inc.title}</strong>{components}{window}
                        </span>
                        <Link href="/status" className="text-xs font-medium underline whitespace-nowrap shrink-0">
                            Ver detalles
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}
