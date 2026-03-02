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
import { Search, RefreshCw, Loader2, Trash2, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getWhatsAppTemplates, deleteWhatsAppTemplate } from '@/lib/template-actions';
import { CreateTemplateDialog } from './create-template-dialog';

interface TemplateComponent {
    type: string;
    text?: string;
}

interface Template {
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    APPROVED: { variant: 'default', label: 'Aprobada' },
    PENDING: { variant: 'secondary', label: 'Pendiente' },
    REJECTED: { variant: 'destructive', label: 'Rechazada' },
};

export function TemplatesSection() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError('');
        const result = await getWhatsAppTemplates('ALL');
        if (result.success && result.templates) {
            setTemplates(result.templates);
        } else {
            setError(result.error || 'Error desconocido');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const result = await deleteWhatsAppTemplate({ templateName: deleteTarget });
        setDeleting(false);
        setDeleteTarget(null);

        if (result.success) {
            toast.success('Plantilla eliminada');
            loadTemplates();
        } else {
            toast.error(result.error || 'Error al eliminar');
        }
    };

    const filtered = templates.filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q);
    });

    const counts = {
        approved: templates.filter((t) => t.status === 'APPROVED').length,
        pending: templates.filter((t) => t.status === 'PENDING').length,
        rejected: templates.filter((t) => t.status === 'REJECTED').length,
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                                <CardTitle className="text-lg">Plantillas de WhatsApp</CardTitle>
                                <CardDescription>Gestiona tus plantillas de mensajes de WhatsApp Business.</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadTemplates}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                                Refrescar
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
                    {!loading && !error && (
                        <div className="flex gap-3 mb-4">
                            <Badge variant="default" className="text-xs">
                                Aprobadas: {counts.approved}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                Pendientes: {counts.pending}
                            </Badge>
                            <Badge variant="destructive" className="text-xs">
                                Rechazadas: {counts.rejected}
                            </Badge>
                        </div>
                    )}

                    {/* Search */}
                    {!loading && !error && templates.length > 0 && (
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre..."
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
                            <span className="ml-2 text-sm text-muted-foreground">Cargando plantillas...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-destructive">{error}</p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={loadTemplates}>
                                Reintentar
                            </Button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            {search ? 'No se encontraron plantillas.' : 'No hay plantillas creadas.'}
                        </p>
                    ) : (
                        <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
                            {filtered.map((t) => {
                                const body = t.components.find((c) => c.type === 'BODY');
                                const statusInfo = STATUS_BADGE[t.status] || { variant: 'outline' as const, label: t.status };
                                return (
                                    <div
                                        key={`${t.name}-${t.language}`}
                                        className="px-4 py-3 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="font-medium text-sm truncate">{t.name}</span>
                                                <Badge variant="outline" className="text-[10px] px-1.5 h-4 shrink-0">
                                                    {t.language}
                                                </Badge>
                                                <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 h-4 shrink-0">
                                                    {statusInfo.label}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] px-1.5 h-4 shrink-0">
                                                    {t.category}
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                                                onClick={() => setDeleteTarget(t.name)}
                                                title="Eliminar plantilla"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        {body?.text && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {body.text}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar la plantilla <strong>{deleteTarget}</strong>?
                            Esta acción no se puede deshacer y eliminará todas las versiones de idioma de esta plantilla.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            {deleting ? 'Eliminando...' : 'Eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create dialog */}
            <CreateTemplateDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={loadTemplates}
            />
        </>
    );
}
