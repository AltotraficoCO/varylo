'use client';

import { useState, useMemo } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createWhatsAppTemplate } from '@/lib/template-actions';

const CATEGORIES = [
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'UTILITY', label: 'Utilidad' },
    { value: 'AUTHENTICATION', label: 'Autenticación' },
] as const;

const LANGUAGES = [
    { value: 'es', label: 'Español (es)' },
    { value: 'es_CO', label: 'Español Colombia (es_CO)' },
    { value: 'es_MX', label: 'Español México (es_MX)' },
    { value: 'es_AR', label: 'Español Argentina (es_AR)' },
    { value: 'en_US', label: 'English US (en_US)' },
    { value: 'en', label: 'English (en)' },
    { value: 'pt_BR', label: 'Português Brasil (pt_BR)' },
] as const;

function sanitizeName(input: string): string {
    return input
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

function extractParams(text: string): string[] {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches)].sort();
}

export function CreateTemplateDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
    const [language, setLanguage] = useState('es');
    const [headerText, setHeaderText] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [footerText, setFooterText] = useState('');
    const [saving, setSaving] = useState(false);
    const [bodyExamples, setBodyExamples] = useState<Record<string, string>>({});
    const [headerExamples, setHeaderExamples] = useState<Record<string, string>>({});

    const sanitizedName = sanitizeName(name);

    const bodyParams = useMemo(() => extractParams(bodyText), [bodyText]);
    const headerParams = useMemo(() => extractParams(headerText), [headerText]);

    const previewBody = useMemo(() => {
        let text = bodyText || 'Escribe el cuerpo del mensaje...';
        bodyParams.forEach((p) => {
            const idx = p.replace(/[{}]/g, '');
            const val = bodyExamples[idx];
            if (val) text = text.replace(p, val);
        });
        return text;
    }, [bodyText, bodyParams, bodyExamples]);

    const previewHeader = useMemo(() => {
        let text = headerText;
        headerParams.forEach((p) => {
            const idx = p.replace(/[{}]/g, '');
            const val = headerExamples[idx];
            if (val) text = text.replace(p, val);
        });
        return text;
    }, [headerText, headerParams, headerExamples]);

    // Check that all examples are filled when there are params
    const allBodyExamplesFilled = bodyParams.length === 0 || bodyParams.every((p) => {
        const idx = p.replace(/[{}]/g, '');
        return bodyExamples[idx]?.trim();
    });
    const allHeaderExamplesFilled = headerParams.length === 0 || headerParams.every((p) => {
        const idx = p.replace(/[{}]/g, '');
        return headerExamples[idx]?.trim();
    });

    const handleCreate = async () => {
        if (!sanitizedName || !bodyText.trim()) return;

        // Build ordered example arrays
        const bodyExArr = bodyParams.map((p) => bodyExamples[p.replace(/[{}]/g, '')] || '');
        const headerExArr = headerParams.map((p) => headerExamples[p.replace(/[{}]/g, '')] || '');

        setSaving(true);
        const result = await createWhatsAppTemplate({
            name: sanitizedName,
            category,
            language,
            bodyText: bodyText.trim(),
            headerText: headerText.trim() || undefined,
            footerText: footerText.trim() || undefined,
            bodyExamples: bodyExArr.length > 0 ? bodyExArr : undefined,
            headerExamples: headerExArr.length > 0 ? headerExArr : undefined,
        });
        setSaving(false);

        if (result.success) {
            toast.success('Plantilla creada. Aparecerá como PENDING hasta que Meta la apruebe.');
            setName('');
            setCategory('MARKETING');
            setLanguage('es');
            setHeaderText('');
            setBodyText('');
            setFooterText('');
            setBodyExamples({});
            setHeaderExamples({});
            onOpenChange(false);
            onCreated();
        } else {
            toast.error(result.error || 'Error al crear la plantilla.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Nueva plantilla de WhatsApp</DialogTitle>
                    <DialogDescription>
                        Crea una plantilla que será enviada a Meta para aprobación.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label>Nombre</Label>
                        <Input
                            placeholder="mi_plantilla_bienvenida"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        {name && name !== sanitizedName && (
                            <p className="text-xs text-muted-foreground">
                                Se usará: <code className="bg-muted px-1 rounded">{sanitizedName}</code>
                            </p>
                        )}
                    </div>

                    {/* Category & Language */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Categoría</Label>
                            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Idioma</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map((l) => (
                                        <SelectItem key={l.value} value={l.value}>
                                            {l.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="space-y-1.5">
                        <Label>Encabezado <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input
                            placeholder="Ej: Hola {{1}}"
                            value={headerText}
                            onChange={(e) => setHeaderText(e.target.value)}
                        />
                    </div>

                    {/* Header examples */}
                    {headerParams.length > 0 && (
                        <div className="space-y-2 pl-3 border-l-2 border-muted">
                            <Label className="text-xs text-muted-foreground">Ejemplos para encabezado (requerido por Meta)</Label>
                            {headerParams.map((p) => {
                                const idx = p.replace(/[{}]/g, '');
                                return (
                                    <Input
                                        key={`h-${idx}`}
                                        placeholder={`Ejemplo para ${p}`}
                                        value={headerExamples[idx] || ''}
                                        onChange={(e) =>
                                            setHeaderExamples((prev) => ({ ...prev, [idx]: e.target.value }))
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Body */}
                    <div className="space-y-1.5">
                        <Label>Cuerpo</Label>
                        <Textarea
                            placeholder="Hola {{1}}, tu pedido #{{2}} está listo."
                            rows={4}
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Usa {'{{1}}'}, {'{{2}}'}, etc. para parámetros dinámicos.
                        </p>
                    </div>

                    {/* Body examples */}
                    {bodyParams.length > 0 && (
                        <div className="space-y-2 pl-3 border-l-2 border-muted">
                            <Label className="text-xs text-muted-foreground">Ejemplos para el cuerpo (requerido por Meta)</Label>
                            {bodyParams.map((p) => {
                                const idx = p.replace(/[{}]/g, '');
                                return (
                                    <Input
                                        key={`b-${idx}`}
                                        placeholder={`Ejemplo para ${p}, ej: "Juan", "12345"`}
                                        value={bodyExamples[idx] || ''}
                                        onChange={(e) =>
                                            setBodyExamples((prev) => ({ ...prev, [idx]: e.target.value }))
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="space-y-1.5">
                        <Label>Pie de página <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input
                            placeholder="Ej: Gracias por tu compra"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                        />
                    </div>

                    {/* Preview */}
                    <div className="border rounded-md p-3 bg-muted/50 space-y-1">
                        <Label className="text-xs text-muted-foreground">Vista previa</Label>
                        <div className="bg-white rounded-lg border p-3 space-y-1 text-sm">
                            {previewHeader && (
                                <p className="font-semibold">{previewHeader}</p>
                            )}
                            <p className="whitespace-pre-wrap">{previewBody}</p>
                            {footerText && (
                                <p className="text-xs text-muted-foreground mt-1">{footerText}</p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!sanitizedName || !bodyText.trim() || !allBodyExamplesFilled || !allHeaderExamplesFilled || saving}
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                        {saving ? 'Creando...' : 'Crear plantilla'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
