'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Search, Trash2, CheckSquare, X, Phone, Instagram, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteContacts } from './actions';
import { toast } from 'sonner';
import { useDictionary } from '@/lib/i18n-context';

const CHANNEL_OPTIONS = [
    { value: '', label: 'Todos', icon: null },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: Phone },
    { value: 'INSTAGRAM', label: 'Instagram', icon: Instagram },
    { value: 'WEB_CHAT', label: 'Web Chat', icon: Globe },
];

interface ContactsToolbarProps {
    search: string;
    filter: string;
    channel: string;
    contactIds: string[];
    totalCount: number;
}

export function ContactsToolbar({ search, filter, channel, contactIds, totalCount }: ContactsToolbarProps) {
    const dict = useDictionary();
    const t = dict.contacts || {};
    const ui = dict.ui || {};
    const [searchValue, setSearchValue] = useState(search);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchValue) params.set('q', searchValue);
        if (filter) params.set('filter', filter);
        if (channel) params.set('channel', channel);
        router.push(`?${params.toString()}`);
    };

    const toggleAll = () => {
        if (selected.size === contactIds.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(contactIds));
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteContacts(Array.from(selected));
        setIsDeleting(false);
        if (result.success) {
            toast.success(ui.deletedSuccessfully || `${result.count} contactos eliminados`);
            setSelected(new Set());
            setSelectMode(false);
            setShowDeleteDialog(false);
            router.refresh();
        } else {
            toast.error(result.message || ui.errorOccurred || 'Error al eliminar');
        }
    };

    const buildHref = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        if (params.q || searchValue) sp.set('q', params.q ?? searchValue);
        if (params.filter !== undefined ? params.filter : filter) sp.set('filter', params.filter ?? filter);
        if (params.channel !== undefined ? params.channel : channel) sp.set('channel', params.channel ?? channel);
        // Clean empty params
        for (const [key, val] of sp.entries()) {
            if (!val) sp.delete(key);
        }
        return `?${sp.toString()}`;
    };

    return (
        <>
            <header className="border-b bg-white sticky top-0 z-10">
                {/* Top row */}
                <div className="h-14 flex items-center justify-between px-6">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title || 'Contactos'}</h1>
                    <div className="flex items-center gap-2">
                        <form onSubmit={handleSearch} className="relative w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={ui.search || 'Buscar...'}
                                className="pl-9 h-8 bg-gray-50/50 border-gray-200 text-sm"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </form>
                        {!selectMode ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectMode(true)}
                                className="h-8 px-2 text-xs"
                            >
                                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                                {ui.select || 'Seleccionar'}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selected.size === contactIds.length && contactIds.length > 0}
                                    onCheckedChange={toggleAll}
                                    className="h-4 w-4"
                                />
                                <span className="text-xs text-muted-foreground">{selected.size} de {totalCount}</span>
                                {selected.size > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowDeleteDialog(true)}
                                        className="h-8 px-2 text-xs"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                        {ui.delete || 'Eliminar'} ({selected.size})
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }} className="h-8 px-2">
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Channel filters */}
                <div className="flex px-6 pb-2 gap-2">
                    {CHANNEL_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const isActive = channel === opt.value || (!channel && !opt.value);
                        return (
                            <Link
                                key={opt.value}
                                href={buildHref({ channel: opt.value })}
                                className={cn(
                                    "text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
                                )}
                            >
                                {Icon && <Icon className="h-3 w-3" />}
                                {opt.label}
                            </Link>
                        );
                    })}
                </div>
            </header>

            {/* Expose select mode state to parent via data attributes for contact cards */}
            {selectMode && (
                <style>{`
                    [data-contact-id] { cursor: pointer; }
                    [data-contact-id]::before {
                        content: '';
                        position: absolute;
                        left: 0; top: 0; right: 0; bottom: 0;
                    }
                `}</style>
            )}

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{ui.areYouSure || '¿Eliminar'} {selected.size} {t.title?.toLowerCase() || 'contactos'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {ui.confirmDeleteDesc || 'Esta acción no se puede deshacer.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{ui.cancel || 'Cancelar'}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (ui.deleting || 'Eliminando...') : `${ui.delete || 'Eliminar'} ${selected.size}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
