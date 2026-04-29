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
import {
    Search,
    RefreshCw,
    Loader2,
    FileText,
    Plus,
    Trash2,
    CheckCircle2,
    Clock,
    XCircle,
    Megaphone,
    Wrench,
    KeyRound,
    ChevronDown,
    Image as ImageIcon,
    Video as VideoIcon,
    File as FileIcon,
    Reply,
    Link as LinkIcon,
    Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getWhatsAppTemplates, deleteWhatsAppTemplate } from '@/lib/template-actions';
import { useDictionary } from '@/lib/i18n-context';
import { TemplateCreateDialog } from './template-create-dialog';

interface TemplateButton {
    type: string;
    text?: string;
    url?: string;
    phone_number?: string;
}

interface TemplateComponent {
    type: string;
    format?: string;
    text?: string;
    buttons?: TemplateButton[];
}

interface Template {
    id?: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string; Icon: typeof CheckCircle2; label: string }> = {
    APPROVED: {
        dot: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
        Icon: CheckCircle2,
        label: 'Aprobada',
    },
    PENDING: {
        dot: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        Icon: Clock,
        label: 'Pendiente',
    },
    REJECTED: {
        dot: 'bg-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
        Icon: XCircle,
        label: 'Rechazada',
    },
};

const CATEGORY_META: Record<string, { Icon: typeof Wrench; color: string; label: string }> = {
    UTILITY: { Icon: Wrench, color: 'text-blue-600 dark:text-blue-400', label: 'Utility' },
    MARKETING: { Icon: Megaphone, color: 'text-purple-600 dark:text-purple-400', label: 'Marketing' },
    AUTHENTICATION: { Icon: KeyRound, color: 'text-orange-600 dark:text-orange-400', label: 'Auth' },
};

const LANG_FLAG: Record<string, string> = {
    es: '🇪🇸',
    es_AR: '🇦🇷',
    es_MX: '🇲🇽',
    es_CO: '🇨🇴',
    en: '🇬🇧',
    en_US: '🇺🇸',
    pt_BR: '🇧🇷',
    fr: '🇫🇷',
};

function HeaderPreview({ component }: { component: TemplateComponent }) {
    if (component.format === 'TEXT' && component.text) {
        return <p className="text-sm font-semibold text-foreground">{component.text}</p>;
    }
    if (component.format === 'IMAGE') {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" /> Imagen
            </div>
        );
    }
    if (component.format === 'VIDEO') {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <VideoIcon className="h-3.5 w-3.5" /> Video
            </div>
        );
    }
    if (component.format === 'DOCUMENT') {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileIcon className="h-3.5 w-3.5" /> Documento
            </div>
        );
    }
    return null;
}

function TemplateCard({
    tpl,
    onDelete,
}: {
    tpl: Template;
    onDelete: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const status = STATUS_STYLES[tpl.status] || {
        dot: 'bg-gray-400',
        text: 'text-gray-700 dark:text-gray-300',
        bg: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200',
        Icon: Clock,
        label: tpl.status,
    };
    const cat = CATEGORY_META[tpl.category] || { Icon: FileText, color: 'text-gray-500', label: tpl.category };
    const Cat = cat.Icon;

    const headerComp = tpl.components.find((c) => c.type === 'HEADER');
    const bodyComp = tpl.components.find((c) => c.type === 'BODY');
    const footerComp = tpl.components.find((c) => c.type === 'FOOTER');
    const buttonsComp = tpl.components.find((c) => c.type === 'BUTTONS');

    return (
        <div
            className={cn(
                'group rounded-lg border bg-card transition-all',
                expanded ? 'shadow-md' : 'hover:shadow-sm hover:border-muted-foreground/20'
            )}
        >
            {/* Header row — always visible, click to expand */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-4 py-3 flex items-start gap-3"
            >
                <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md', cat.color, 'bg-muted/40')}>
                    <Cat className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm font-mono text-foreground">{tpl.name}</span>
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border',
                                status.bg,
                                status.text
                            )}
                        >
                            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                            {status.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <span>{LANG_FLAG[tpl.language] || '🌐'}</span>
                            <span className="font-mono">{tpl.language}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className={cn('text-[11px] font-medium', cat.color)}>{cat.label}</span>
                    </div>
                    {bodyComp?.text && !expanded && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{bodyComp.text}</p>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            expanded && 'rotate-180'
                        )}
                    />
                </div>
            </button>

            {/* Expanded preview */}
            {expanded && (
                <div className="px-4 pb-4 pt-1 border-t bg-muted/20 space-y-3">
                    {headerComp && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Encabezado</p>
                            <HeaderPreview component={headerComp} />
                        </div>
                    )}
                    {bodyComp?.text && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cuerpo</p>
                            <p className="text-sm whitespace-pre-wrap break-words leading-snug">{bodyComp.text}</p>
                        </div>
                    )}
                    {footerComp?.text && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pie</p>
                            <p className="text-xs text-muted-foreground italic">{footerComp.text}</p>
                        </div>
                    )}
                    {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Botones</p>
                            <div className="flex flex-wrap gap-1.5">
                                {buttonsComp.buttons.map((b, i) => {
                                    const Icon =
                                        b.type === 'URL'
                                            ? LinkIcon
                                            : b.type === 'PHONE_NUMBER'
                                              ? Phone
                                              : Reply;
                                    return (
                                        <Badge key={i} variant="outline" className="gap-1 font-normal">
                                            <Icon className="h-3 w-3" />
                                            {b.text || b.type}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Borrar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function TemplatesSection() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
    const [createOpen, setCreateOpen] = useState(false);
    const [deleting, setDeleting] = useState<Template | null>(null);
    const [deletingInFlight, setDeletingInFlight] = useState(false);

    const dict = useDictionary();
    const t = dict.settingsUI?.templatesSection || {};
    const ui = dict.ui || {};

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
    }, [ui.unknown]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const filtered = templates.filter((tpl) => {
        if (statusFilter !== 'ALL' && tpl.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return tpl.name.toLowerCase().includes(q);
    });

    const counts = {
        all: templates.length,
        approved: templates.filter((tpl) => tpl.status === 'APPROVED').length,
        pending: templates.filter((tpl) => tpl.status === 'PENDING').length,
        rejected: templates.filter((tpl) => tpl.status === 'REJECTED').length,
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{t.title || 'Plantillas de WhatsApp'}</CardTitle>
                            <CardDescription className="mt-0.5">
                                {t.description || 'Plantillas sincronizadas desde tu cuenta de WhatsApp Business.'}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadTemplates}
                            disabled={loading}
                        >
                            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
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
                {/* Stat tiles + filters */}
                {!loading && !error && templates.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            <FilterTile
                                active={statusFilter === 'ALL'}
                                onClick={() => setStatusFilter('ALL')}
                                label="Total"
                                count={counts.all}
                                color="text-foreground"
                                dotColor="bg-foreground/40"
                            />
                            <FilterTile
                                active={statusFilter === 'APPROVED'}
                                onClick={() => setStatusFilter('APPROVED')}
                                label="Aprobadas"
                                count={counts.approved}
                                color="text-emerald-700 dark:text-emerald-300"
                                dotColor="bg-emerald-500"
                            />
                            <FilterTile
                                active={statusFilter === 'PENDING'}
                                onClick={() => setStatusFilter('PENDING')}
                                label="Pendientes"
                                count={counts.pending}
                                color="text-amber-700 dark:text-amber-300"
                                dotColor="bg-amber-500"
                            />
                            <FilterTile
                                active={statusFilter === 'REJECTED'}
                                onClick={() => setStatusFilter('REJECTED')}
                                label="Rechazadas"
                                count={counts.rejected}
                                color="text-rose-700 dark:text-rose-300"
                                dotColor="bg-rose-500"
                            />
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t.searchPlaceholder || 'Buscar por nombre…'}
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                            {t.loadingTemplates || 'Cargando plantillas…'}
                        </span>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <XCircle className="h-8 w-8 mx-auto text-destructive/60 mb-2" />
                        <p className="text-sm text-destructive">{error}</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={loadTemplates}>
                            {t.retryButton || 'Reintentar'}
                        </Button>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium mb-1">Aún no tienes plantillas</p>
                        <p className="text-xs text-muted-foreground mb-4">
                            Crea tu primera plantilla para enviar mensajes fuera de la ventana de 24h.
                        </p>
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Crear plantilla
                        </Button>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                        {search
                            ? t.noTemplatesSearch || 'No se encontraron plantillas con ese nombre.'
                            : 'No hay plantillas con ese estado.'}
                    </p>
                ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                        {filtered.map((tpl) => (
                            <TemplateCard
                                key={`${tpl.name}-${tpl.language}`}
                                tpl={tpl}
                                onDelete={() => setDeleting(tpl)}
                            />
                        ))}
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
                            Vas a borrar <span className="font-mono font-medium">{deleting?.name}</span> ({deleting?.language}).
                            {deleting?.id ? '' : ' Sin ID disponible: se borrarán todas las variantes de idioma con ese nombre.'}{' '}
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

function FilterTile({
    active,
    onClick,
    label,
    count,
    color,
    dotColor,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    color: string;
    dotColor: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-lg border p-3 text-left transition-all',
                active
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
            )}
        >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
                {label}
            </div>
            <div className={cn('text-2xl font-semibold mt-1 leading-none', color)}>{count}</div>
        </button>
    );
}
