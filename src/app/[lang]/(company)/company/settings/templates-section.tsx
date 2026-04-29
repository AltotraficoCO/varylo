'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, RefreshCw, Loader2, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getWhatsAppTemplates, deleteWhatsAppTemplate } from '@/lib/template-actions';
import { useDictionary } from '@/lib/i18n-context';
import { TemplateCreateDialog } from './template-create-dialog';

interface TemplateComponent {
    type: string;
    text?: string;
}

interface Template {
    id?: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

export function TemplatesSection() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [deleting, setDeleting] = useState<Template | null>(null);
    const [deletingInFlight, setDeletingInFlight] = useState(false);

    const dict = useDictionary();
    const t = dict.settingsUI?.templatesSection || {};
    const ui = dict.ui || {};

    const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
        APPROVED: { variant: 'default', label: t.statusApproved || 'Aprobada' },
        PENDING: { variant: 'secondary', label: t.statusPending || 'Pendiente' },
        REJECTED: { variant: 'destructive', label: t.statusRejected || 'Rechazada' },
    };

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError('');
        const result = await getWhatsAppTemplates('ALL');
        if (result.success && result.templates) {
            setTemplates(result.templates);
        } else {
            setError(result.error || (ui.unknown || 'Error desconocido'));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const filtered = templates.filter((tpl) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return tpl.name.toLowerCase().includes(q);
    });

    const counts = {
        approved: templates.filter((tpl) => tpl.status === 'APPROVED').length,
        pending: templates.filter((tpl) => tpl.status === 'PENDING').length,
        rejected: templates.filter((tpl) => tpl.status === 'REJECTED').length,
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle className="text-lg">{t.title || 'Plantillas de WhatsApp'}</CardTitle>
                            <CardDescription>{t.description || 'Plantillas sincronizadas desde tu cuenta de WhatsApp Business.'}</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadTemplates}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            {t.refreshButton || 'Refrescar'}
                        </Button>
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Nueva plantilla
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Counters */}
                {!loading && !error && templates.length > 0 && (
                    <div className="flex gap-3 mb-4">
                        <Badge variant="default" className="text-xs">
                            {t.approvedCount || 'Aprobadas:'} {counts.approved}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {t.pendingCount || 'Pendientes:'} {counts.pending}
                        </Badge>
                        <Badge variant="destructive" className="text-xs">
                            {t.rejectedCount || 'Rechazadas:'} {counts.rejected}
                        </Badge>
                    </div>
                )}

                {/* Search */}
                {!loading && !error && templates.length > 0 && (
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.searchPlaceholder || 'Buscar por nombre...'}
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">{t.loadingTemplates || 'Cargando plantillas...'}</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={loadTemplates}>
                            {t.retryButton || 'Reintentar'}
                        </Button>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        {search ? (t.noTemplatesSearch || 'No se encontraron plantillas.') : (t.noTemplatesAccount || 'No hay plantillas en esta cuenta.')}
                    </p>
                ) : (
                    <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
                        {filtered.map((tpl) => {
                            const body = tpl.components.find((c) => c.type === 'BODY');
                            const statusInfo = STATUS_BADGE[tpl.status] || { variant: 'outline' as const, label: tpl.status };
                            return (
                                <div
                                    key={`${tpl.name}-${tpl.language}`}
                                    className="px-4 py-3 hover:bg-muted/30 transition-colors flex items-start gap-2"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-medium text-sm">{tpl.name}</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                                                {tpl.language}
                                            </Badge>
                                            <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 h-4">
                                                {statusInfo.label}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                                                {tpl.category}
                                            </Badge>
                                        </div>
                                        {body?.text && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {body.text}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => setDeleting(tpl)}
                                        title="Borrar plantilla"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <TemplateCreateDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={loadTemplates}
            />

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Borrar plantilla?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vas a borrar <span className="font-mono">{deleting?.name}</span> ({deleting?.language}).
                            {deleting?.id ? '' : ' Sin ID disponible: se borrarán todas las variantes de idioma con ese nombre.'}
                            Esta acción es irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingInFlight}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deletingInFlight}
                            onClick={async (e) => {
                                e.preventDefault();
                                if (!deleting) return;
                                setDeletingInFlight(true);
                                const result = await deleteWhatsAppTemplate(deleting.name, deleting.id);
                                setDeletingInFlight(false);
                                if (result.success) {
                                    toast.success('Plantilla borrada.');
                                    setDeleting(null);
                                    loadTemplates();
                                } else {
                                    toast.error(result.error || 'Error al borrar.');
                                }
                            }}
                        >
                            {deletingInFlight && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Borrar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
