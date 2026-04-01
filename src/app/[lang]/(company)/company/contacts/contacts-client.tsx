'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactAvatar } from '@/components/contact-avatar';
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
import { Search, Trash2, CheckSquare, X, Phone, Instagram, Globe, Users, Send, Download, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteContacts } from './actions';
import { toast } from 'sonner';
import { SendTemplateDialog } from './send-template-dialog';

const CHANNEL_OPTIONS = [
    { value: '', label: 'Todos', icon: null },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: Phone },
    { value: 'INSTAGRAM', label: 'Instagram', icon: Instagram },
    { value: 'WEB_CHAT', label: 'Web Chat', icon: Globe },
];

interface Contact {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    companyName: string | null;
    city: string | null;
    country: string | null;
    originChannel: string | null;
    tags: { id: string; name: string; color: string }[];
    conversations: { channel: { type: string } }[];
}

interface ContactsClientProps {
    contacts: Contact[];
    search: string;
    filter: string;
    channel: string;
    lang: string;
}

const channelBadge: Record<string, { bg: string; dot: string; text: string; label: string }> = {
    WHATSAPP: { bg: 'bg-[#ECFDF5]', dot: 'bg-[#10B981]', text: 'text-[#10B981]', label: 'WhatsApp' },
    INSTAGRAM: { bg: 'bg-[#FDF2F8]', dot: 'bg-[#EC4899]', text: 'text-[#EC4899]', label: 'Instagram' },
    WEB_CHAT: { bg: 'bg-[#EFF6FF]', dot: 'bg-[#3B82F6]', text: 'text-[#3B82F6]', label: 'Web Chat' },
};

function timeAgo(date: Date | string) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return 'hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
}

export function ContactsClient({ contacts, search, filter, channel, lang }: ContactsClientProps) {
    const [searchValue, setSearchValue] = useState(search);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const contactIds = contacts.map(c => c.id);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchValue) params.set('q', searchValue);
        if (filter) params.set('filter', filter);
        if (channel) params.set('channel', channel);
        router.push(`?${params.toString()}`);
    };

    const toggleAll = () => {
        if (selected.size === contactIds.length) setSelected(new Set());
        else setSelected(new Set(contactIds));
    };

    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteContacts(Array.from(selected));
        setIsDeleting(false);
        if (result.success) {
            toast.success(`${result.count} contactos eliminados`);
            setSelected(new Set());
            setSelectMode(false);
            setShowDeleteDialog(false);
            router.refresh();
        } else {
            toast.error(result.message || 'Error al eliminar');
        }
    };

    const buildHref = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        if (params.q || searchValue) sp.set('q', params.q ?? searchValue);
        if (params.filter !== undefined ? params.filter : filter) sp.set('filter', params.filter ?? filter);
        if (params.channel !== undefined ? params.channel : channel) sp.set('channel', params.channel ?? channel);
        for (const [key, val] of sp.entries()) {
            if (!val) sp.delete(key);
        }
        return `?${sp.toString()}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-bold text-[#09090B]">Contactos</h1>
                    <p className="text-[14px] text-[#71717A] mt-1">Gestiona tus contactos y listas</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="rounded-lg px-4 py-2 text-[14px] font-medium text-[#3F3F46]"
                        onClick={() => setShowTemplateDialog(true)}
                    >
                        <Download className="h-4 w-4 mr-1.5" />
                        Exportar
                    </Button>
                    <Button className="rounded-lg px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-[14px] font-medium">
                        <Plus className="h-4 w-4 mr-1.5" />
                        Nuevo contacto
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3">
                <form onSubmit={handleSearch} className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar contactos..."
                        className="pl-9 h-9 text-sm"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </form>
                <div className="flex gap-1.5">
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
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {Icon && <Icon className="h-3 w-3" />}
                                {opt.label}
                            </Link>
                        );
                    })}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {!selectMode ? (
                        <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="text-xs">
                            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                            Seleccionar
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Checkbox checked={selected.size === contactIds.length && contactIds.length > 0} onCheckedChange={toggleAll} />
                            <span className="text-xs text-muted-foreground">{selected.size} de {contacts.length}</span>
                            {selected.size > 0 && (
                                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-xs">
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                    Eliminar ({selected.size})
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[#E4E4E7] overflow-hidden">
                {/* Table Header */}
                <div className="flex items-center bg-[#F4F4F5] py-3 px-4 text-[12px] font-semibold text-[#71717A] tracking-[0.3px]">
                    {selectMode && <div className="w-[40px] shrink-0" />}
                    <div className="w-[220px] shrink-0">Nombre</div>
                    <div className="w-[180px] shrink-0">Teléfono</div>
                    <div className="w-[140px] shrink-0">Canal</div>
                    <div className="w-[140px] shrink-0">Empresa</div>
                    <div className="flex-1">Última actividad</div>
                </div>

                {contacts.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                        <div className="p-3 rounded-full bg-muted">
                            <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground">No se encontraron contactos</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            {search ? 'No hay resultados para tu búsqueda.' :
                             channel ? 'No hay contactos en este canal.' :
                             'Los contactos aparecerán aquí cuando recibas mensajes.'}
                        </p>
                    </div>
                ) : (
                    <div>
                        {contacts.map((contact) => {
                            const channelType = contact.originChannel || contact.conversations?.[0]?.channel?.type;
                            const badge = channelBadge[channelType || ''];
                            const isSelected = selected.has(contact.id);
                            return (
                                <Link
                                    key={contact.id}
                                    href={`/${lang}/company/contacts/${contact.id}`}
                                    className={cn(
                                        "flex items-center py-3 px-4 border-t border-[#E4E4E7] hover:bg-muted/20 transition-colors",
                                        isSelected && "bg-primary/5"
                                    )}
                                    onClick={selectMode ? (e) => { e.preventDefault(); toggleOne(contact.id); } : undefined}
                                >
                                    {selectMode && (
                                        <div className="w-[40px] shrink-0">
                                            <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(contact.id)} onClick={(e) => e.stopPropagation()} />
                                        </div>
                                    )}
                                    <div className="w-[220px] shrink-0 flex items-center gap-3">
                                        <ContactAvatar name={contact.name} phone={contact.phone} className="h-8 w-8 shrink-0" />
                                        <span className="text-[14px] font-medium text-[#09090B] truncate">{contact.name || contact.phone}</span>
                                    </div>
                                    <div className="w-[180px] shrink-0 text-[14px] text-[#3F3F46] truncate">
                                        {!contact.phone?.startsWith('web_') ? contact.phone : '-'}
                                    </div>
                                    <div className="w-[140px] shrink-0">
                                        {badge ? (
                                            <span className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-xl font-medium ${badge.bg} ${badge.text}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                                {badge.label}
                                            </span>
                                        ) : (
                                            <span className="text-[14px] text-[#71717A]">-</span>
                                        )}
                                    </div>
                                    <div className="w-[140px] shrink-0 text-[14px] text-[#3F3F46] truncate">
                                        {contact.companyName || '-'}
                                    </div>
                                    <div className="flex-1 text-[14px] text-[#71717A]">
                                        -
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Template dialog */}
            <SendTemplateDialog
                open={showTemplateDialog}
                onOpenChange={setShowTemplateDialog}
                contacts={contacts.map(c => ({ id: c.id, name: c.name, phone: c.phone }))}
                lang={lang}
            />

            {/* Delete dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {selected.size} contactos?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán los contactos seleccionados y todas sus conversaciones asociadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Eliminando...' : `Eliminar ${selected.size}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
