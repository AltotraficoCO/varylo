'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, Loader2, ChevronDown, Link2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateFooterAction } from './actions';
import type { FooterSection, FooterLink } from '@/lib/site-config';
import { cn } from '@/lib/utils';

const DEFAULT_SECTIONS: FooterSection[] = [
    {
        title: 'Producto',
        links: [
            { label: 'Funciones', href: '#features' },
            { label: 'Precios', href: '#pricing' },
            { label: 'FAQ', href: '#faq' },
        ],
    },
    {
        title: 'Empresa',
        links: [{ label: 'Nosotros', href: '#contact' }],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacidad', href: '/terms' },
            { label: 'Términos', href: '/terms' },
        ],
    },
];

const DEFAULT_COPYRIGHT = 'Varylo. Todos los derechos reservados.';

interface Props {
    initialSections: FooterSection[] | null;
    initialCopyright: string | null;
}

export function FooterLinksCard({ initialSections, initialCopyright }: Props) {
    const [sections, setSections] = useState<FooterSection[]>(
        initialSections || DEFAULT_SECTIONS
    );
    const [copyright, setCopyright] = useState(initialCopyright || DEFAULT_COPYRIGHT);
    const [saving, setSaving] = useState(false);
    const [openSections, setOpenSections] = useState<Set<number>>(new Set());

    function toggleSection(idx: number) {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    }

    function updateSection(idx: number, field: keyof FooterSection, value: string) {
        setSections((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    }

    function updateLink(sIdx: number, lIdx: number, field: keyof FooterLink, value: string) {
        setSections((prev) => {
            const next = [...prev];
            const links = [...next[sIdx].links];
            links[lIdx] = { ...links[lIdx], [field]: value };
            next[sIdx] = { ...next[sIdx], links };
            return next;
        });
    }

    function addLink(sIdx: number) {
        setSections((prev) => {
            const next = [...prev];
            next[sIdx] = {
                ...next[sIdx],
                links: [...next[sIdx].links, { label: '', href: '' }],
            };
            return next;
        });
    }

    function removeLink(sIdx: number, lIdx: number) {
        setSections((prev) => {
            const next = [...prev];
            next[sIdx] = {
                ...next[sIdx],
                links: next[sIdx].links.filter((_, i) => i !== lIdx),
            };
            return next;
        });
    }

    function addSection() {
        const newIdx = sections.length;
        setSections((prev) => [...prev, { title: '', links: [{ label: '', href: '' }] }]);
        setOpenSections(prev => new Set(prev).add(newIdx));
    }

    function removeSection(idx: number) {
        setSections((prev) => prev.filter((_, i) => i !== idx));
        setOpenSections(prev => {
            const next = new Set<number>();
            prev.forEach(i => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
            return next;
        });
    }

    async function handleSave() {
        setSaving(true);
        try {
            const result = await updateFooterAction(sections, copyright);
            if (result.success) {
                toast.success('Footer actualizado');
            } else {
                toast.error(result.error || 'Error al guardar');
            }
        } catch {
            toast.error('Error al guardar el footer');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50">
                            <Link2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Enlaces del Footer</CardTitle>
                            <CardDescription>
                                Secciones y enlaces del pie de página de la landing.
                            </CardDescription>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Collapsible sections */}
                {sections.map((section, sIdx) => (
                    <Collapsible
                        key={sIdx}
                        open={openSections.has(sIdx)}
                        onOpenChange={() => toggleSection(sIdx)}
                    >
                        <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {section.title || 'Sin título'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ({section.links.length} enlace{section.links.length !== 1 ? 's' : ''})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); removeSection(sIdx); }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <ChevronDown className={cn(
                                            "h-4 w-4 text-muted-foreground transition-transform",
                                            openSections.has(sIdx) && "rotate-180"
                                        )} />
                                    </div>
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="px-4 pb-4 pt-1 space-y-3 border-t bg-muted/20">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Título de sección</Label>
                                        <Input
                                            value={section.title}
                                            onChange={(e) => updateSection(sIdx, 'title', e.target.value)}
                                            placeholder="Ej: Producto"
                                            className="mt-1 h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Enlaces</Label>
                                        {section.links.map((link, lIdx) => (
                                            <div key={lIdx} className="flex items-center gap-2">
                                                <Input
                                                    value={link.label}
                                                    onChange={(e) => updateLink(sIdx, lIdx, 'label', e.target.value)}
                                                    placeholder="Texto"
                                                    className="flex-1 h-8 text-sm"
                                                />
                                                <Input
                                                    value={link.href}
                                                    onChange={(e) => updateLink(sIdx, lIdx, 'href', e.target.value)}
                                                    placeholder="URL"
                                                    className="flex-1 h-8 text-sm"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeLink(sIdx, lIdx)}
                                                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addLink(sIdx)}
                                            className="text-xs h-7 gap-1"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Agregar enlace
                                        </Button>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>
                ))}

                <Button variant="outline" size="sm" onClick={addSection} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Agregar sección
                </Button>

                {/* Copyright */}
                <div className="border-t pt-4 mt-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Texto de copyright</Label>
                    <Input
                        value={copyright}
                        onChange={(e) => setCopyright(e.target.value)}
                        placeholder="Ej: Varylo. Todos los derechos reservados."
                        className="h-8 text-sm"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
