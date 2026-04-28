import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { IncidentForm } from './incident-form';
import { IncidentRow } from './incident-row';

export default async function SuperAdminStatusPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== Role.SUPER_ADMIN) redirect('/');

    const [active, resolved] = await Promise.all([
        prisma.statusIncident.findMany({
            where: { resolvedAt: null },
            orderBy: { startsAt: 'desc' },
        }),
        prisma.statusIncident.findMany({
            where: { resolvedAt: { not: null } },
            orderBy: { resolvedAt: 'desc' },
            take: 50,
        }),
    ]);

    const serialize = (i: typeof active[number]) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        type: i.type,
        severity: i.severity,
        components: i.components,
        startsAt: i.startsAt.toISOString(),
        endsAt: i.endsAt?.toISOString() || null,
        resolvedAt: i.resolvedAt?.toISOString() || null,
        showBanner: i.showBanner,
    });

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-semibold">Estado del sistema</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Crea incidentes o programa mantenimientos. Los activos aparecen en la página pública /status y como banner en cada cuenta.
                </p>
            </div>

            <IncidentForm />

            <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Activos ({active.length})
                </h2>
                {active.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin incidentes activos.</p>
                ) : (
                    <div className="space-y-3">
                        {active.map(inc => <IncidentRow key={inc.id} incident={serialize(inc)} />)}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Resueltos
                </h2>
                {resolved.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin historial.</p>
                ) : (
                    <div className="space-y-3">
                        {resolved.map(inc => <IncidentRow key={inc.id} incident={serialize(inc)} />)}
                    </div>
                )}
            </section>
        </div>
    );
}
