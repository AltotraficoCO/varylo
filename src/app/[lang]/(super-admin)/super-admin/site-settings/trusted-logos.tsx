'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { createTrustedLogo, deleteTrustedLogo } from './actions';

interface TrustedLogo {
    id: string;
    name: string;
    imageUrl: string;
    sortOrder: number;
    active: boolean;
}

export function TrustedLogosManager({ logos }: { logos: TrustedLogo[] }) {
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState('');
    const router = useRouter();

    async function handleAdd() {
        if (!name.trim() || !imageUrl.trim()) {
            toast.error('Nombre y URL de imagen son obligatorios.');
            return;
        }
        setSaving(true);
        const result = await createTrustedLogo({ name: name.trim(), imageUrl: imageUrl.trim(), sortOrder: logos.length });
        setSaving(false);
        if (result.success) {
            toast.success(`Logo "${name}" agregado.`);
            setShowAdd(false);
            setName('');
            setImageUrl('');
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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Logos de confianza</CardTitle>
                        <CardDescription>Empresas que confían en Varylo. Se muestran en la landing en escala de grises.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        Agregar logo
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {logos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No hay logos configurados.</p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {logos.map((logo) => (
                            <div key={logo.id} className="border rounded-lg p-3 flex items-center gap-3 group">
                                <div className="w-16 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                    <img
                                        src={logo.imageUrl}
                                        alt={logo.name}
                                        className="max-w-full max-h-full object-contain grayscale"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{logo.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{logo.imageUrl}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onClick={() => handleDelete(logo.id)}
                                    disabled={deleting === logo.id}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Agregar logo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre de la empresa</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Coca-Cola"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>URL de la imagen (logo)</Label>
                            <Input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://ejemplo.com/logo.png"
                            />
                        </div>
                        {imageUrl && (
                            <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center">
                                <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="max-h-16 max-w-full object-contain grayscale"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
                        <Button onClick={handleAdd} disabled={saving || !name.trim() || !imageUrl.trim()}>
                            {saving ? 'Guardando...' : 'Agregar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
