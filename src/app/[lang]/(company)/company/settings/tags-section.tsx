'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Tag as TagIcon, AlertCircle } from 'lucide-react';
import { AddTagDialog } from './tags/add-tag-dialog';
import { deleteTag } from './tags/actions';
import { toast } from 'sonner';
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
import { useDictionary } from '@/lib/i18n-context';

interface TagWithCount {
    id: string;
    name: string;
    color: string;
    description: string | null;
    showInSidebar: boolean;
    _count: { conversations: number };
}

export function TagsSection({ tags }: { tags: TagWithCount[] }) {
    const [deleteTarget, setDeleteTarget] = useState<TagWithCount | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const dict = useDictionary();
    const t = dict.settingsUI?.tagsSection || {};
    const ui = dict.ui || {};

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const result = await deleteTag(deleteTarget.id);
            if (result.success) {
                toast.success(t.tagDeleted || 'Etiqueta eliminada');
                setDeleteTarget(null);
            } else {
                toast.error(result.error || (t.deleteError || 'Error al eliminar'));
            }
        } catch {
            toast.error(t.deleteError || 'Error al eliminar');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{t.title || 'Etiquetas'}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t.description || 'Clasifica y organiza tus conversaciones con etiquetas de colores.'}
                    </p>
                </div>
                <AddTagDialog>
                    <Button size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" /> {t.newTag || 'Nueva etiqueta'}
                    </Button>
                </AddTagDialog>
            </div>

            {tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
                    <TagIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">{t.noTags || 'No hay etiquetas'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.noTagsDesc || 'Crea una etiqueta para organizar tus conversaciones.'}</p>
                </div>
            ) : (
                <div className="rounded-lg border divide-y">
                    {tags.map((tag) => (
                        <div key={tag.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-4 w-4 rounded-full shrink-0 border border-black/10"
                                    style={{ backgroundColor: tag.color }}
                                />
                                <div>
                                    <div className="font-medium text-sm">{tag.name}</div>
                                    {tag.description && (
                                        <div className="text-xs text-muted-foreground">{tag.description}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {tag.showInSidebar && (
                                    <Badge variant="secondary" className="text-[10px] h-5">{t.sidebar || 'Barra lateral'}</Badge>
                                )}
                                {tag._count.conversations > 0 && (
                                    <Badge variant="outline" className="text-[10px] h-5">
                                        {tag._count.conversations} conv.
                                    </Badge>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteTarget(tag)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteTarget && deleteTarget._count.conversations > 0
                                ? (t.cannotDelete || 'No se puede eliminar')
                                : `${(t.deleteConfirmTitle || '¿Eliminar "{name}"?').replace('{name}', deleteTarget?.name || '')}`
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget && deleteTarget._count.conversations > 0 ? (
                                <span className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                    {(t.hasConversations || 'Esta etiqueta tiene {n} conversación(es) asignada(s). Debes removerla de todas las conversaciones antes de poder eliminarla.').replace('{n}', String(deleteTarget._count.conversations))}
                                </span>
                            ) : (
                                t.deleteDesc || 'Esta acción no se puede deshacer. La etiqueta se eliminará permanentemente.'
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            {deleteTarget && deleteTarget._count.conversations > 0 ? (t.understood || 'Entendido') : (ui.cancel || 'Cancelar')}
                        </AlertDialogCancel>
                        {deleteTarget && deleteTarget._count.conversations === 0 && (
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? (ui.deleting || 'Eliminando...') : (ui.delete || 'Eliminar')}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
