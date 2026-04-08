'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContactAvatar } from '@/components/contact-avatar';
import {
    ArrowLeft,
    Phone,
    Mail,
    Building,
    MapPin,
    Instagram,
    Globe,
    MessageSquare,
    Save,
    Pencil,
    X,
    FileInput,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateContact } from './actions';
import { useDictionary } from '@/lib/i18n-context';

interface Contact {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    companyName: string | null;
    city: string | null;
    country: string | null;
    originChannel: string | null;
    createdAt: string;
    tags: { id: string; name: string; color: string }[];
    conversations: {
        id: string;
        status: string;
        lastMessageAt: string;
        channel: { type: string };
    }[];
    capturedData?: {
        id: string;
        fieldName: string;
        fieldValue: string;
        source: string;
        createdAt: string;
    }[];
}

export function ContactDetailClient({ contact, lang }: { contact: Contact; lang: string }) {
    const dict = useDictionary();
    const t = dict.contacts || {};
    const ui = dict.ui || {};
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: contact.name || '',
        email: contact.email || '',
        companyName: contact.companyName || '',
        city: contact.city || '',
        country: contact.country || '',
    });

    const handleSave = async () => {
        setSaving(true);
        const result = await updateContact(contact.id, {
            name: form.name || undefined,
            email: form.email || undefined,
            companyName: form.companyName || undefined,
            city: form.city || undefined,
            country: form.country || undefined,
        });
        setSaving(false);

        if (result.success) {
            toast.success(ui.updatedSuccessfully || 'Contacto actualizado');
            setEditing(false);
            router.refresh();
        } else {
            toast.error(result.message || ui.errorOccurred || 'Error al actualizar');
        }
    };

    const handleCancel = () => {
        setForm({
            name: contact.name || '',
            email: contact.email || '',
            companyName: contact.companyName || '',
            city: contact.city || '',
            country: contact.country || '',
        });
        setEditing(false);
    };

    const channelType = contact.originChannel || contact.conversations?.[0]?.channel?.type;

    const channelBadge = (type: string) => {
        switch (type) {
            case 'WHATSAPP':
                return (
                    <Badge variant="outline" className="text-xs border-green-200 text-green-600 bg-green-50 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> WhatsApp
                    </Badge>
                );
            case 'INSTAGRAM':
                return (
                    <Badge variant="outline" className="text-xs border-pink-200 text-pink-600 bg-pink-50 flex items-center gap-1">
                        <Instagram className="h-3 w-3" /> Instagram
                    </Badge>
                );
            case 'WEB_CHAT':
                return (
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50 flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Web
                    </Badge>
                );
            default:
                return null;
        }
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'OPEN':
                return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">{dict.dashboard?.common?.open || 'Abierta'}</Badge>;
            case 'RESOLVED':
                return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">{ui.completed || 'Resuelta'}</Badge>;
            case 'PENDING':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">{ui.pending || 'Pendiente'}</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-10">
                <div className="h-14 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <Link href={`/${lang}/company/contacts`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.contactDetails || 'Detalle de contacto'}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {!editing ? (
                            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-8 px-3 text-xs">
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                {ui.edit || 'Editar'}
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 px-3 text-xs">
                                    <X className="h-3.5 w-3.5 mr-1.5" />
                                    {ui.cancel || 'Cancelar'}
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 px-3 text-xs">
                                    <Save className="h-3.5 w-3.5 mr-1.5" />
                                    {saving ? (ui.saving || 'Guardando...') : (ui.save || 'Guardar')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Profile card */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start gap-5">
                                <ContactAvatar
                                    name={contact.name}
                                    phone={contact.phone}
                                    className="h-16 w-16 shrink-0"
                                    fallbackClassName="text-xl"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {contact.name || contact.phone}
                                        </h2>
                                        {channelType && channelBadge(channelType)}
                                    </div>
                                    {contact.phone && !contact.phone.startsWith('web_') && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5" />
                                            {contact.phone}
                                        </p>
                                    )}
                                    {contact.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {contact.tags.map((tag) => (
                                                <Badge
                                                    key={tag.id}
                                                    variant="outline"
                                                    className="text-xs px-2 py-0.5 border-gray-200 bg-gray-50"
                                                    style={{ borderLeft: `3px solid ${tag.color}` }}
                                                >
                                                    {tag.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Creado: {new Date(contact.createdAt).toLocaleDateString('es-CO', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Edit / Info card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">{t.contactDetails || 'Informacion del contacto'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        {t.name || ui.name || 'Nombre'}
                                    </Label>
                                    {editing ? (
                                        <Input
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="Nombre del contacto"
                                            className="h-9"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-gray-800 py-1.5">
                                            {contact.name || <span className="text-muted-foreground italic">{dict.dashboard?.common?.noName || 'Sin nombre'}</span>}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="h-3 w-3" /> {t.email || ui.email || 'Email'}
                                    </Label>
                                    {editing ? (
                                        <Input
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            placeholder="correo@ejemplo.com"
                                            type="email"
                                            className="h-9"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-gray-800 py-1.5">
                                            {contact.email || <span className="text-muted-foreground italic">{ui.noData || 'Sin email'}</span>}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Building className="h-3 w-3" /> {dict.dashboard?.companiesAdmin?.company || 'Empresa'}
                                    </Label>
                                    {editing ? (
                                        <Input
                                            value={form.companyName}
                                            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                                            placeholder="Nombre de empresa"
                                            className="h-9"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-gray-800 py-1.5">
                                            {contact.companyName || <span className="text-muted-foreground italic">{ui.noData || 'Sin empresa'}</span>}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3" /> Ciudad
                                    </Label>
                                    {editing ? (
                                        <Input
                                            value={form.city}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                            placeholder="Ciudad"
                                            className="h-9"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-gray-800 py-1.5">
                                            {contact.city || <span className="text-muted-foreground italic">{ui.noData || 'Sin ciudad'}</span>}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3" /> Pais
                                    </Label>
                                    {editing ? (
                                        <Input
                                            value={form.country}
                                            onChange={(e) => setForm({ ...form, country: e.target.value })}
                                            placeholder="Pais"
                                            className="h-9"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-gray-800 py-1.5">
                                            {contact.country || <span className="text-muted-foreground italic">{ui.noData || 'Sin pais'}</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Captured Data */}
                    {contact.capturedData && contact.capturedData.length > 0 && (
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileInput className="h-4 w-4" />
                                    {t.customFields || 'Datos capturados'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {contact.capturedData.map((item) => (
                                        <div key={item.id} className="p-3 bg-muted/50 rounded-lg border">
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{item.fieldName}</p>
                                            <p className="text-sm font-medium text-gray-800">{item.fieldValue}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Conversations */}
                    {contact.conversations?.length > 0 && (
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    {t.conversations || 'Conversaciones'} ({contact.conversations.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {contact.conversations.map((conv) => (
                                        <Link
                                            key={conv.id}
                                            href={`/${lang}/company/conversations?conversationId=${conv.id}`}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                {channelBadge(conv.channel.type)}
                                                {statusLabel(conv.status)}
                                            </div>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary">
                                                {new Date(conv.lastMessageAt).toLocaleDateString('es-CO', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
