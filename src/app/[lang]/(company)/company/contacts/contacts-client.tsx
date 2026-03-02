'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Search, Trash2, CheckSquare, X, Phone, Instagram, Globe, Users, Mail, MapPin, Send } from 'lucide-react';
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
        if (selected.size === contactIds.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(contactIds));
        }
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
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Toolbar */}
            <header className="border-b bg-white sticky top-0 z-10">
                <div className="h-14 flex items-center justify-between px-6">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Contactos</h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTemplateDialog(true)}
                            className="h-8 px-3 text-xs"
                        >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Enviar plantilla
                        </Button>
                        <form onSubmit={handleSearch} className="relative w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar..."
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
                                className="h-8 px-3 text-xs"
                            >
                                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                                Seleccionar
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selected.size === contactIds.length && contactIds.length > 0}
                                    onCheckedChange={toggleAll}
                                    className="h-4 w-4"
                                />
                                <span className="text-xs text-muted-foreground font-medium">{selected.size} de {contacts.length}</span>
                                {selected.size > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowDeleteDialog(true)}
                                        className="h-8 px-3 text-xs"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        Eliminar ({selected.size})
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

            {/* Contact List */}
            <main className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                {contacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto pt-20">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">No se encontraron contactos</h2>
                        <p className="text-muted-foreground">
                            {search ? 'No hay resultados para tu búsqueda.' :
                             channel ? 'No hay contactos en este canal.' :
                             'Empieza a añadir nuevos contactos o sincroniza tus canales.'}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto space-y-3">
                        {contacts.map((contact) => {
                            const isSelected = selected.has(contact.id);
                            return (
                                <ContactCard
                                    key={contact.id}
                                    contact={contact}
                                    lang={lang}
                                    selectMode={selectMode}
                                    isSelected={isSelected}
                                    onToggle={() => toggleOne(contact.id)}
                                />
                            );
                        })}
                    </div>
                )}
            </main>

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

function ContactCard({ contact, lang, selectMode, isSelected, onToggle }: {
    contact: Contact;
    lang: string;
    selectMode: boolean;
    isSelected: boolean;
    onToggle: () => void;
}) {
    const channelType = contact.originChannel || contact.conversations?.[0]?.channel?.type;

    return (
        <Card
            className={cn(
                "p-4 transition-all border-gray-200 bg-white group",
                selectMode ? "cursor-pointer" : "hover:shadow-md",
                isSelected && "ring-2 ring-primary border-primary bg-primary/5"
            )}
            onClick={selectMode ? onToggle : undefined}
        >
            <div className="flex items-center gap-4">
                {selectMode && (
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onToggle}
                        className="h-4.5 w-4.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}

                <ContactAvatar
                    name={contact.name}
                    phone={contact.phone}
                    className="h-10 w-10 shrink-0"
                />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900 truncate">{contact.name || contact.phone}</h3>
                        {contact.companyName && (
                            <span className="text-sm text-gray-400 flex items-center gap-1 shrink-0">
                                <span className="opacity-50">|</span>
                                {contact.companyName}
                            </span>
                        )}
                        {channelType === 'WHATSAPP' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-200 text-green-600 bg-green-50 font-normal flex items-center gap-1">
                                <Phone className="h-3 w-3" /> WhatsApp
                            </Badge>
                        )}
                        {channelType === 'INSTAGRAM' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-pink-200 text-pink-600 bg-pink-50 font-normal flex items-center gap-1">
                                <Instagram className="h-3 w-3" /> Instagram
                            </Badge>
                        )}
                        {channelType === 'WEB_CHAT' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-200 text-blue-600 bg-blue-50 font-normal flex items-center gap-1">
                                <Globe className="h-3 w-3" /> Web
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {contact.email && (
                            <div className="flex items-center gap-1.5 min-w-[140px]">
                                <Mail className="h-3 w-3 opacity-50" />
                                <span className="truncate">{contact.email}</span>
                            </div>
                        )}
                        {!contact.phone?.startsWith('web_') && contact.phone !== contact.name?.replace('Visitante ', '') && (
                            <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 opacity-50" />
                                <span>{contact.phone}</span>
                            </div>
                        )}
                        {(contact.city || contact.country) && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 opacity-50" />
                                <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>
                            </div>
                        )}
                        {contact.tags?.length > 0 && (
                            <div className="flex items-center gap-1 ml-auto">
                                {contact.tags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 border-gray-200 bg-gray-50"
                                        style={{ borderLeft: `2px solid ${tag.color}` }}
                                    >
                                        {tag.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {!selectMode && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        <Link href={`/${lang}/company/contacts/${contact.id}`} className="text-xs text-primary hover:underline font-medium px-2 py-1">
                            Ver detalles
                        </Link>
                    </div>
                )}
            </div>
        </Card>
    );
}
