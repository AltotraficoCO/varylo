'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2,
    Plus,
    Trash2,
    Upload,
    FileText,
    Image as ImageIcon,
    Video as VideoIcon,
    File as FileIcon,
    MessageSquare,
    Reply,
    Link as LinkIcon,
    Phone,
    Type,
    Megaphone,
    Wrench,
    KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createWhatsAppTemplate, type CreateTemplateInput, type TemplateButton } from '@/lib/template-actions';

const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'es_AR', label: 'Español (Argentina)' },
    { code: 'es_MX', label: 'Español (México)' },
    { code: 'en', label: 'Inglés' },
    { code: 'en_US', label: 'Inglés (US)' },
    { code: 'pt_BR', label: 'Portugués (Brasil)' },
];

const CATEGORIES: { value: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'; label: string; description: string; Icon: typeof Wrench }[] = [
    { value: 'UTILITY', label: 'Utility', description: 'Confirmaciones, recordatorios, transacciones', Icon: Wrench },
    { value: 'MARKETING', label: 'Marketing', description: 'Promociones, novedades, campañas', Icon: Megaphone },
    { value: 'AUTHENTICATION', label: 'Auth', description: 'Códigos OTP de un solo uso', Icon: KeyRound },
];

const HEADER_FORMATS: { value: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'; label: string; Icon: typeof Type }[] = [
    { value: 'NONE', label: 'Ninguno', Icon: FileText },
    { value: 'TEXT', label: 'Texto', Icon: Type },
    { value: 'IMAGE', label: 'Imagen', Icon: ImageIcon },
    { value: 'VIDEO', label: 'Video', Icon: VideoIcon },
    { value: 'DOCUMENT', label: 'PDF', Icon: FileIcon },
];

type HeaderState =
    | { format: 'NONE' }
    | { format: 'TEXT'; text: string; example: string[] }
    | { format: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; mediaHandle: string; fileName: string; previewUrl?: string };

type ButtonDraft =
    | { type: 'QUICK_REPLY'; text: string }
    | { type: 'URL'; text: string; url: string; example: string }
    | { type: 'PHONE_NUMBER'; text: string; phone_number: string };

function countVars(text: string): number {
    return (text.match(/\{\{\d+\}\}/g) || []).length;
}

function renderRich(text: string, examples: string[]) {
    if (!text) return null;
    const re = /\{\{(\d+)\}\}/g;
    const parts: { content: string; isVar: boolean }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push({ content: text.slice(last, m.index), isVar: false });
        const idx = parseInt(m[1], 10) - 1;
        const sample = examples[idx];
        parts.push({
            content: sample && sample.length > 0 ? sample : `{{${m[1]}}}`,
            isVar: true,
        });
        last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ content: text.slice(last), isVar: false });
    return parts.map((p, i) =>
        p.isVar ? (
            <span key={i} className="bg-emerald-200/70 dark:bg-emerald-700/40 text-emerald-900 dark:text-emerald-100 rounded px-1">
                {p.content}
            </span>
        ) : (
            <span key={i}>{p.content}</span>
        )
    );
}

export function TemplateCreateDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState('');
    const [language, setLanguage] = useState('es');
    const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY');
    const [header, setHeader] = useState<HeaderState>({ format: 'NONE' });
    const [body, setBody] = useState('');
    const [bodyExample, setBodyExample] = useState<string[]>([]);
    const [footer, setFooter] = useState('');
    const [buttons, setButtons] = useState<ButtonDraft[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const reset = () => {
        setName('');
        setLanguage('es');
        setCategory('UTILITY');
        setHeader({ format: 'NONE' });
        setBody('');
        setBodyExample([]);
        setFooter('');
        setButtons([]);
    };

    const bodyVars = countVars(body);
    const headerVars = header.format === 'TEXT' ? countVars(header.text) : 0;

    const updateHeaderText = (text: string) => {
        const n = countVars(text);
        setHeader((prev) => {
            const prevExamples = prev.format === 'TEXT' ? prev.example : [];
            const next = [...prevExamples];
            while (next.length < n) next.push('');
            next.length = n;
            return { format: 'TEXT', text, example: next };
        });
    };

    const updateBody = (text: string) => {
        setBody(text);
        const n = countVars(text);
        setBodyExample((prev) => {
            const next = [...prev];
            while (next.length < n) next.push('');
            next.length = n;
            return next;
        });
    };

    const onUpload = async (file: File, format: 'IMAGE' | 'VIDEO' | 'DOCUMENT') => {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/whatsapp/templates/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok || !data.handle) {
                toast.error(data.error || 'Error al subir el archivo.');
                return;
            }
            const previewUrl = format === 'IMAGE' ? URL.createObjectURL(file) : undefined;
            setHeader({ format, mediaHandle: data.handle, fileName: file.name, previewUrl });
            toast.success('Archivo subido a Meta.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error de red.');
        } finally {
            setUploading(false);
        }
    };

    const addButton = (type: ButtonDraft['type']) => {
        if (buttons.length >= 3) return;
        if (type === 'URL') setButtons([...buttons, { type: 'URL', text: '', url: '', example: '' }]);
        else if (type === 'PHONE_NUMBER') setButtons([...buttons, { type: 'PHONE_NUMBER', text: '', phone_number: '' }]);
        else setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
    };

    const submit = async () => {
        if (!/^[a-z0-9_]{1,512}$/.test(name)) {
            toast.error('Nombre inválido. Usa minúsculas, números y guiones bajos.');
            return;
        }
        if (!body.trim()) {
            toast.error('El cuerpo es obligatorio.');
            return;
        }

        const input: CreateTemplateInput = {
            name,
            language,
            category,
            body,
            ...(bodyVars > 0 ? { bodyExample } : {}),
            ...(footer ? { footer } : {}),
        };

        if (header.format === 'TEXT' && header.text) {
            input.header = {
                format: 'TEXT',
                text: header.text,
                ...(headerVars > 0 ? { example: header.example } : {}),
            };
        } else if (header.format !== 'NONE' && header.format !== 'TEXT') {
            input.header = { format: header.format, mediaHandle: header.mediaHandle };
        }

        if (buttons.length > 0) {
            input.buttons = buttons.map((b) => {
                if (b.type === 'URL') {
                    return {
                        type: 'URL',
                        text: b.text,
                        url: b.url,
                        ...(b.example ? { example: b.example } : {}),
                    } as TemplateButton;
                }
                if (b.type === 'PHONE_NUMBER') {
                    return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number } as TemplateButton;
                }
                return { type: 'QUICK_REPLY', text: b.text } as TemplateButton;
            });
        }

        setSubmitting(true);
        const result = await createWhatsAppTemplate(input);
        setSubmitting(false);

        if (result.success) {
            toast.success(`Plantilla enviada a Meta (${result.status || 'PENDING'}).`);
            reset();
            onOpenChange(false);
            onCreated();
        } else {
            toast.error(result.error || 'Error desconocido.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-xl">Nueva plantilla de WhatsApp</DialogTitle>
                    <DialogDescription>
                        Meta debe aprobar la plantilla antes de poder enviarla. Suele tardar entre minutos y 24h.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid md:grid-cols-[1fr_360px] flex-1 overflow-hidden">
                    {/* FORM (scrollable) */}
                    <div className="overflow-y-auto px-6 py-5 space-y-6 max-h-[60vh] md:max-h-none">
                        {/* Basics */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Información básica
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="tpl-name">Nombre</Label>
                                    <Input
                                        id="tpl-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                        placeholder="order_confirmation"
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-[11px] text-muted-foreground">Solo minúsculas, números y _</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="tpl-lang">Idioma</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger id="tpl-lang">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LANGUAGES.map((l) => (
                                                <SelectItem key={l.code} value={l.code}>
                                                    {l.label} ({l.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Categoría</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map((c) => {
                                        const active = category === c.value;
                                        return (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setCategory(c.value)}
                                                className={cn(
                                                    'flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all',
                                                    active
                                                        ? 'border-primary bg-primary/5 shadow-sm'
                                                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                                                )}
                                            >
                                                <c.Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                                                <span className="text-sm font-medium">{c.label}</span>
                                                <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                                                    {c.description}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        {/* Header */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Encabezado <span className="font-normal normal-case">· opcional</span>
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {HEADER_FORMATS.map((f) => {
                                    const active = header.format === f.value;
                                    return (
                                        <button
                                            key={f.value}
                                            type="button"
                                            onClick={() => {
                                                if (f.value === 'NONE') setHeader({ format: 'NONE' });
                                                else if (f.value === 'TEXT') setHeader({ format: 'TEXT', text: '', example: [] });
                                                else setHeader({ format: f.value, mediaHandle: '', fileName: '' });
                                            }}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-all',
                                                active
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border hover:bg-muted'
                                            )}
                                        >
                                            <f.Icon className="h-3.5 w-3.5" />
                                            {f.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {header.format === 'TEXT' && (
                                <div className="space-y-2">
                                    <Input
                                        value={header.text}
                                        onChange={(e) => updateHeaderText(e.target.value)}
                                        placeholder="Hola {{1}}"
                                        maxLength={60}
                                    />
                                    {headerVars > 0 && header.format === 'TEXT' && (
                                        <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
                                            <p className="text-[11px] font-medium text-muted-foreground">Ejemplos para variables del encabezado</p>
                                            {Array.from({ length: headerVars }).map((_, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="font-mono text-[10px]">{`{{${i + 1}}}`}</Badge>
                                                    <Input
                                                        value={header.example[i] || ''}
                                                        onChange={(e) => {
                                                            const next = [...header.example];
                                                            next[i] = e.target.value;
                                                            setHeader({ ...header, example: next });
                                                        }}
                                                        placeholder="Ej: Juan"
                                                        className="h-8"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(header.format === 'IMAGE' || header.format === 'VIDEO' || header.format === 'DOCUMENT') && (
                                <div className="rounded-md border-2 border-dashed bg-muted/20 p-4 text-center space-y-2">
                                    <input
                                        id="tpl-media"
                                        type="file"
                                        className="hidden"
                                        accept={
                                            header.format === 'IMAGE'
                                                ? 'image/jpeg,image/png'
                                                : header.format === 'VIDEO'
                                                  ? 'video/mp4,video/3gpp'
                                                  : 'application/pdf'
                                        }
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) onUpload(file, header.format as 'IMAGE' | 'VIDEO' | 'DOCUMENT');
                                        }}
                                    />
                                    {!header.mediaHandle && !uploading && (
                                        <label htmlFor="tpl-media" className="cursor-pointer block space-y-1.5">
                                            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                                            <p className="text-sm font-medium">Click para subir</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {header.format === 'IMAGE' && 'JPG/PNG hasta 5MB'}
                                                {header.format === 'VIDEO' && 'MP4/3GP hasta 16MB'}
                                                {header.format === 'DOCUMENT' && 'PDF hasta 100MB'}
                                            </p>
                                        </label>
                                    )}
                                    {uploading && (
                                        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo a Meta…
                                        </div>
                                    )}
                                    {header.mediaHandle && !uploading && (
                                        <div className="flex items-center justify-between gap-2 rounded bg-background border px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <span className="text-sm truncate">{header.fileName}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => setHeader({ format: header.format, mediaHandle: '', fileName: '' })}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Body */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Cuerpo <span className="text-destructive font-normal normal-case">· obligatorio</span>
                            </h3>
                            <Textarea
                                value={body}
                                onChange={(e) => updateBody(e.target.value)}
                                placeholder="Hola {{1}}, tu pedido {{2}} está listo."
                                rows={4}
                                maxLength={1024}
                                className="resize-none"
                            />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>
                                    Usa <code className="font-mono bg-muted px-1 rounded">{'{{1}}'}</code> para variables
                                </span>
                                <span>{body.length}/1024</span>
                            </div>
                            {bodyVars > 0 && (
                                <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
                                    <p className="text-[11px] font-medium text-muted-foreground">Ejemplos para variables del cuerpo</p>
                                    {Array.from({ length: bodyVars }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Badge variant="secondary" className="font-mono text-[10px]">{`{{${i + 1}}}`}</Badge>
                                            <Input
                                                value={bodyExample[i] || ''}
                                                onChange={(e) => {
                                                    const next = [...bodyExample];
                                                    next[i] = e.target.value;
                                                    setBodyExample(next);
                                                }}
                                                placeholder="Ej: 12345"
                                                className="h-8"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Footer */}
                        <section className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Pie de página <span className="font-normal normal-case">· opcional</span>
                            </h3>
                            <Input
                                value={footer}
                                onChange={(e) => setFooter(e.target.value)}
                                placeholder="Gracias por elegirnos"
                                maxLength={60}
                            />
                            <p className="text-[11px] text-muted-foreground text-right">{footer.length}/60</p>
                        </section>

                        {/* Buttons */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Botones <span className="font-normal normal-case">· máx. 3</span>
                                </h3>
                                <span className="text-[11px] text-muted-foreground">{buttons.length}/3</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => addButton('QUICK_REPLY')}
                                    disabled={buttons.length >= 3}
                                >
                                    <Reply className="h-3.5 w-3.5 mr-1" /> Respuesta rápida
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => addButton('URL')}
                                    disabled={buttons.length >= 3}
                                >
                                    <LinkIcon className="h-3.5 w-3.5 mr-1" /> URL
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => addButton('PHONE_NUMBER')}
                                    disabled={buttons.length >= 3}
                                >
                                    <Phone className="h-3.5 w-3.5 mr-1" /> Llamar
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {buttons.map((btn, i) => {
                                    const Icon =
                                        btn.type === 'URL' ? LinkIcon : btn.type === 'PHONE_NUMBER' ? Phone : Reply;
                                    return (
                                        <div key={i} className="rounded-md border bg-card p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-medium">
                                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {btn.type === 'QUICK_REPLY' && 'Respuesta rápida'}
                                                    {btn.type === 'URL' && 'Botón URL'}
                                                    {btn.type === 'PHONE_NUMBER' && 'Botón llamar'}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setButtons(buttons.filter((_, j) => j !== i))}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <Input
                                                placeholder="Texto del botón"
                                                value={btn.text}
                                                maxLength={25}
                                                onChange={(e) => {
                                                    const next = [...buttons];
                                                    next[i] = { ...next[i], text: e.target.value };
                                                    setButtons(next);
                                                }}
                                                className="h-8"
                                            />
                                            {btn.type === 'URL' && (
                                                <>
                                                    <Input
                                                        placeholder="https://ejemplo.com/{{1}}"
                                                        value={btn.url}
                                                        onChange={(e) => {
                                                            const next = [...buttons];
                                                            next[i] = {
                                                                ...(next[i] as { type: 'URL' } & ButtonDraft),
                                                                url: e.target.value,
                                                            };
                                                            setButtons(next);
                                                        }}
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                    {countVars(btn.url) > 0 && (
                                                        <Input
                                                            placeholder="Ejemplo de URL completa"
                                                            value={btn.example}
                                                            onChange={(e) => {
                                                                const next = [...buttons];
                                                                next[i] = {
                                                                    ...(next[i] as { type: 'URL' } & ButtonDraft),
                                                                    example: e.target.value,
                                                                };
                                                                setButtons(next);
                                                            }}
                                                            className="h-8 font-mono text-xs"
                                                        />
                                                    )}
                                                </>
                                            )}
                                            {btn.type === 'PHONE_NUMBER' && (
                                                <Input
                                                    placeholder="+573001234567"
                                                    value={btn.phone_number}
                                                    onChange={(e) => {
                                                        const next = [...buttons];
                                                        next[i] = {
                                                            ...(next[i] as { type: 'PHONE_NUMBER' } & ButtonDraft),
                                                            phone_number: e.target.value,
                                                        };
                                                        setButtons(next);
                                                    }}
                                                    className="h-8 font-mono text-xs"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* PREVIEW (sticky) */}
                    <div className="hidden md:flex flex-col bg-muted/30 border-l">
                        <div className="px-5 py-4 border-b bg-background/40">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Vista previa
                            </p>
                        </div>
                        <div
                            className="flex-1 overflow-y-auto px-5 py-6"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgba(229,221,213,0.7), rgba(229,221,213,0.7)), url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><circle cx='20' cy='20' r='1' fill='%23bbb'/></svg>\")",
                                backgroundColor: '#e5ddd5',
                            }}
                        >
                            <div className="max-w-[280px] mx-auto">
                                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                    {/* Header */}
                                    {header.format === 'TEXT' && header.text && (
                                        <div className="px-3 pt-2.5 pb-1 text-sm font-semibold text-gray-900">
                                            {renderRich(header.text, header.format === 'TEXT' ? header.example : [])}
                                        </div>
                                    )}
                                    {header.format === 'IMAGE' && (
                                        <div className="aspect-video bg-gray-200 flex items-center justify-center">
                                            {header.previewUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={header.previewUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="h-10 w-10 text-gray-400" />
                                            )}
                                        </div>
                                    )}
                                    {header.format === 'VIDEO' && (
                                        <div className="aspect-video bg-gray-800 flex items-center justify-center">
                                            <VideoIcon className="h-10 w-10 text-white/70" />
                                        </div>
                                    )}
                                    {header.format === 'DOCUMENT' && (
                                        <div className="bg-gray-100 flex items-center gap-2 px-3 py-2">
                                            <FileIcon className="h-8 w-8 text-red-500" />
                                            <span className="text-xs text-gray-700 truncate">
                                                {(header.format === 'DOCUMENT' && 'fileName' in header && header.fileName) || 'documento.pdf'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Body */}
                                    <div className="px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap break-words leading-snug">
                                        {body ? renderRich(body, bodyExample) : (
                                            <span className="text-gray-400 italic">Tu mensaje aparecerá aquí…</span>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    {footer && (
                                        <div className="px-3 pb-1 text-[11px] text-gray-500">{footer}</div>
                                    )}

                                    {/* Time */}
                                    <div className="px-3 pb-2 text-right text-[10px] text-gray-400">12:34 ✓✓</div>

                                    {/* Buttons */}
                                    {buttons.length > 0 && (
                                        <div className="border-t border-gray-200">
                                            {buttons.map((btn, i) => {
                                                const Icon =
                                                    btn.type === 'URL'
                                                        ? LinkIcon
                                                        : btn.type === 'PHONE_NUMBER'
                                                          ? Phone
                                                          : Reply;
                                                return (
                                                    <div
                                                        key={i}
                                                        className="px-3 py-2 text-center text-sm font-medium text-[#00a5f4] border-t first:border-t-0 border-gray-100 flex items-center justify-center gap-1.5"
                                                    >
                                                        {btn.type !== 'QUICK_REPLY' && <Icon className="h-3.5 w-3.5" />}
                                                        {btn.text || (
                                                            <span className="italic text-gray-400">Texto del botón</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <p className="text-center text-[10px] text-gray-600 mt-3">
                                    Vista previa aproximada
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-background">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button onClick={submit} disabled={submitting || uploading}>
                        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Enviar a Meta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
