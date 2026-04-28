export type StatusComponent =
    | 'app'
    | 'api'
    | 'whatsapp'
    | 'instagram'
    | 'messenger'
    | 'webchat'
    | 'ai'
    | 'payments'
    | 'webhooks';

export type StatusSeverity = 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL';
export type StatusIncidentType = 'MAINTENANCE' | 'INCIDENT';

export const STATUS_COMPONENTS: { id: StatusComponent; label: string }[] = [
    { id: 'app', label: 'Aplicación web' },
    { id: 'api', label: 'API REST' },
    { id: 'whatsapp', label: 'WhatsApp Business' },
    { id: 'instagram', label: 'Instagram DM' },
    { id: 'messenger', label: 'Facebook Messenger' },
    { id: 'webchat', label: 'Web Chat' },
    { id: 'ai', label: 'Agente IA / Chatbot' },
    { id: 'payments', label: 'Pagos' },
    { id: 'webhooks', label: 'Webhooks' },
];

export const SEVERITY_LABEL: Record<StatusSeverity, string> = {
    INFO: 'Informativo',
    MINOR: 'Menor',
    MAJOR: 'Mayor',
    CRITICAL: 'Crítico',
};

export const TYPE_LABEL: Record<StatusIncidentType, string> = {
    MAINTENANCE: 'Mantenimiento programado',
    INCIDENT: 'Incidente',
};

export function severityColorClasses(sev: StatusSeverity, type: StatusIncidentType) {
    if (type === 'MAINTENANCE') {
        return {
            bg: 'bg-blue-50 dark:bg-blue-950/20',
            border: 'border-blue-200',
            text: 'text-blue-700',
            badge: 'bg-blue-100 text-blue-700',
        };
    }
    switch (sev) {
        case 'CRITICAL':
            return { bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' };
        case 'MAJOR':
            return { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' };
        case 'MINOR':
            return { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' };
        default:
            return { bg: 'bg-slate-50 dark:bg-slate-950/20', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' };
    }
}

export function componentLabel(id: string) {
    return STATUS_COMPONENTS.find(c => c.id === id)?.label || id;
}

/** Compute global state for the public page header */
export function computeGlobalState(activeIncidents: { type: string; severity: string }[]) {
    if (activeIncidents.length === 0) {
        return { label: 'Todos los sistemas operativos', tone: 'ok' as const };
    }
    const hasCritical = activeIncidents.some(i => i.type === 'INCIDENT' && i.severity === 'CRITICAL');
    const hasMajor = activeIncidents.some(i => i.type === 'INCIDENT' && i.severity === 'MAJOR');
    const hasMinor = activeIncidents.some(i => i.type === 'INCIDENT');
    if (hasCritical) return { label: 'Interrupción crítica', tone: 'critical' as const };
    if (hasMajor) return { label: 'Interrupción parcial', tone: 'major' as const };
    if (hasMinor) return { label: 'Problemas menores', tone: 'minor' as const };
    return { label: 'Mantenimiento programado en curso', tone: 'maintenance' as const };
}
