'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { uploadTrustedLogo, deleteTrustedLogo } from './actions';
import { useDictionary } from '@/lib/i18n-context';

interface TrustedLogo {
    id: string;
    name: string;
    imageUrl: string;
    sortOrder: number;
    active: boolean;
}

export function TrustedLogosManager({ logos }: { logos: TrustedLogo[] }) {
    const dict = useDictionary();
    const t = dict.superAdminUI?.trustedLogos || {};
    const ui = dict.ui || {};
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const url = URL.createObjectURL(f);
        setPreview(url);
        // Auto-fill name from filename if empty
        if (!name) {
            setName(f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
        }
    }

    function resetForm() {
        setName('');
        setFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleAdd() {
        if (!name.trim() || !file) {
            toast.error('Nombre y archivo son obligatorios.');
            return;
        }
        setSaving(true);
        const formData = new FormData();
        formData.set('file', file);
        formData.set('name', name.trim());
        formData.set('sortOrder', String(logos.length));

        const result = await uploadTrustedLogo(formData);
        setSaving(false);
        if (result.success) {
            toast.success(`Logo "${name}" agregado.`);
            setShowAdd(false);
            resetForm();
            router.refresh();
        } else {
            toast.error(result.error || 'Error al agregar.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este logo?')) return;
        setDeleting(id);
        const result = await deleteTrustedLogo(id);
        setDeleting('');
        if (result.success) {
            toast.success('Logo eliminado.');
            router.refresh();
        } else {
            toast.error(result.error || 'Error al eliminar.');
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold">{t.title || 'Logos de confianza'}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t.description || 'Se muestran en la landing page en escala de grises.'}
                    </p>
                </div>
                <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    {ui.add || 'Agregar'}
                </Button>
            </div>

            {logos.length === 0 ? (
                <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => setShowAdd(true)}
                >
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                        {t.noLogos || 'No hay logos. Haz clic para agregar el primero.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {logos.map((logo) => (
                        <div
                            key={logo.id}
                            className="border rounded-xl p-4 flex flex-col items-center gap-3 group hover:shadow-md transition-shadow bg-white relative"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(logo.id)}
                                disabled={deleting === logo.id}
                            >
                                {deleting === logo.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                            </Button>
                            <div className="w-full h-16 flex items-center justify-center">
                                <img
                                    src={logo.imageUrl}
                                    alt={logo.name}
                                    className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground font-medium truncate w-full text-center">
                                {logo.name}
                            </p>
                        </div>
                    ))}

                    {/* Add button card */}
                    <div
                        className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all min-h-[100px]"
                        onClick={() => setShowAdd(true)}
                    >
                        <Plus className="h-6 w-6 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Agregar</p>
                    </div>
                </div>
            )}

            {/* Add dialog */}
            <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) resetForm(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t.addLogo || 'Agregar logo'}</DialogTitle>
                        <DialogDescription>{t.addLogoDesc || 'Sube el logo de una empresa que confía en Varylo.'}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre de la empresa *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Coca-Cola"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Logo *</Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {preview ? (
                                <div
                                    className="border-2 border-dashed rounded-lg p-6 bg-gray-50 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="max-h-20 max-w-full object-contain"
                                    />
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={preview}
                                            alt="Grayscale preview"
                                            className="max-h-10 max-w-[80px] object-contain grayscale opacity-50"
                                        />
                                        <span className="text-xs text-muted-foreground">Así se verá en la landing</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {file?.name} — Clic para cambiar
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-8 w-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        Clic para subir imagen
                                    </p>
                                    <p className="text-xs text-muted-foreground/60">
                                        PNG, SVG o JPG recomendado
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAdd} disabled={saving || !name.trim() || !file}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    Subiendo...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-1" />
                                    Subir logo
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
