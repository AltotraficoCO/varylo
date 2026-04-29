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
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createWhatsAppTemplate, type CreateTemplateInput, type TemplateButton } from '@/lib/template-actions';

const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'es_AR', label: 'Español (Argentina)' },
    { code: 'es_MX', label: 'Español (México)' },
    { code: 'en', label: 'Inglés' },
    { code: 'en_US', label: 'Inglés (US)' },
    { code: 'pt_BR', label: 'Portugués (Brasil)' },
];

type HeaderState =
    | { format: 'NONE' }
    | { format: 'TEXT'; text: string; example: string[] }
    | { format: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; mediaHandle: string; fileName: string };

type ButtonDraft =
    | { type: 'QUICK_REPLY'; text: string }
    | { type: 'URL'; text: string; url: string; example: string }
    | { type: 'PHONE_NUMBER'; text: string; phone_number: string };

function countVars(text: string): number {
    return (text.match(/\{\{\d+\}\}/g) || []).length;
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
            setHeader({ format, mediaHandle: data.handle, fileName: file.name });
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva plantilla de WhatsApp</DialogTitle>
                    <DialogDescription>
                        Meta debe aprobar la plantilla antes de poder enviarla. Suele tardar entre minutos y 24h.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="tpl-name">Nombre (snake_case)</Label>
                            <Input
                                id="tpl-name"
                                value={name}
                                onChange={(e) => setName(e.target.value.toLowerCase())}
                                placeholder="order_confirmation"
                            />
                        </div>
                        <div>
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

                    <div>
                        <Label htmlFor="tpl-cat">Categoría</Label>
                        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                            <SelectTrigger id="tpl-cat">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UTILITY">Utility (transaccional)</SelectItem>
                                <SelectItem value="MARKETING">Marketing</SelectItem>
                                <SelectItem value="AUTHENTICATION">Authentication (OTP)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* HEADER */}
                    <div className="border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Encabezado (opcional)</Label>
                            <Select
                                value={header.format}
                                onValueChange={(v) => {
                                    if (v === 'NONE') setHeader({ format: 'NONE' });
                                    else if (v === 'TEXT') setHeader({ format: 'TEXT', text: '', example: [] });
                                    else setHeader({ format: v as 'IMAGE' | 'VIDEO' | 'DOCUMENT', mediaHandle: '', fileName: '' });
                                }}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">Sin encabezado</SelectItem>
                                    <SelectItem value="TEXT">Texto</SelectItem>
                                    <SelectItem value="IMAGE">Imagen</SelectItem>
                                    <SelectItem value="VIDEO">Video</SelectItem>
                                    <SelectItem value="DOCUMENT">PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {header.format === 'TEXT' && (
                            <>
                                <Input
                                    value={header.text}
                                    onChange={(e) => updateHeaderText(e.target.value)}
                                    placeholder="Hola {{1}}"
                                    maxLength={60}
                                />
                                {headerVars > 0 && header.format === 'TEXT' && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Ejemplos para variables:</p>
                                        {Array.from({ length: headerVars }).map((_, i) => (
                                            <Input
                                                key={i}
                                                value={header.example[i] || ''}
                                                onChange={(e) => {
                                                    const next = [...header.example];
                                                    next[i] = e.target.value;
                                                    setHeader({ ...header, example: next });
                                                }}
                                                placeholder={`{{${i + 1}}}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {(header.format === 'IMAGE' || header.format === 'VIDEO' || header.format === 'DOCUMENT') && (
                            <div className="space-y-2">
                                <input
                                    type="file"
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
                                    className="block text-sm"
                                />
                                {uploading && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Subiendo a Meta…
                                    </div>
                                )}
                                {header.mediaHandle && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Upload className="h-3 w-3" /> {header.fileName}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>

                    {/* BODY */}
                    <div>
                        <Label htmlFor="tpl-body">Cuerpo *</Label>
                        <Textarea
                            id="tpl-body"
                            value={body}
                            onChange={(e) => updateBody(e.target.value)}
                            placeholder="Hola {{1}}, tu pedido {{2}} está listo."
                            rows={4}
                            maxLength={1024}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Usa {'{{1}}'}, {'{{2}}'} … para variables.
                        </p>
                        {bodyVars > 0 && (
                            <div className="space-y-1 mt-2">
                                <p className="text-xs text-muted-foreground">Ejemplos para variables:</p>
                                {Array.from({ length: bodyVars }).map((_, i) => (
                                    <Input
                                        key={i}
                                        value={bodyExample[i] || ''}
                                        onChange={(e) => {
                                            const next = [...bodyExample];
                                            next[i] = e.target.value;
                                            setBodyExample(next);
                                        }}
                                        placeholder={`{{${i + 1}}}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div>
                        <Label htmlFor="tpl-footer">Pie de página (opcional)</Label>
                        <Input
                            id="tpl-footer"
                            value={footer}
                            onChange={(e) => setFooter(e.target.value)}
                            maxLength={60}
                        />
                    </div>

                    {/* BUTTONS */}
                    <div className="border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Botones (máx. 3)</Label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addButton('QUICK_REPLY')}
                                    disabled={buttons.length >= 3}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Respuesta rápida
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addButton('URL')}
                                    disabled={buttons.length >= 3}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> URL
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addButton('PHONE_NUMBER')}
                                    disabled={buttons.length >= 3}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Llamar
                                </Button>
                            </div>
                        </div>
                        {buttons.map((btn, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-start">
                                <Badge variant="outline" className="col-span-3 justify-center">
                                    {btn.type === 'QUICK_REPLY' && 'Quick reply'}
                                    {btn.type === 'URL' && 'URL'}
                                    {btn.type === 'PHONE_NUMBER' && 'Llamar'}
                                </Badge>
                                <div className="col-span-8 space-y-1">
                                    <Input
                                        placeholder="Texto del botón"
                                        value={btn.text}
                                        maxLength={25}
                                        onChange={(e) => {
                                            const next = [...buttons];
                                            next[i] = { ...next[i], text: e.target.value };
                                            setButtons(next);
                                        }}
                                    />
                                    {btn.type === 'URL' && (
                                        <>
                                            <Input
                                                placeholder="https://ejemplo.com/{{1}}"
                                                value={btn.url}
                                                onChange={(e) => {
                                                    const next = [...buttons];
                                                    next[i] = { ...(next[i] as { type: 'URL' } & ButtonDraft), url: e.target.value };
                                                    setButtons(next);
                                                }}
                                            />
                                            {countVars(btn.url) > 0 && (
                                                <Input
                                                    placeholder="Ejemplo de URL completa"
                                                    value={btn.example}
                                                    onChange={(e) => {
                                                        const next = [...buttons];
                                                        next[i] = { ...(next[i] as { type: 'URL' } & ButtonDraft), example: e.target.value };
                                                        setButtons(next);
                                                    }}
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
                                                next[i] = { ...(next[i] as { type: 'PHONE_NUMBER' } & ButtonDraft), phone_number: e.target.value };
                                                setButtons(next);
                                            }}
                                        />
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="col-span-1"
                                    onClick={() => setButtons(buttons.filter((_, j) => j !== i))}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
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
