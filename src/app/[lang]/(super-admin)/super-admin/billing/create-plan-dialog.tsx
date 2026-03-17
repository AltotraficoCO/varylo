'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { createLandingPlan } from './actions';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export function CreatePlanDialog({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [slug, setSlug] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(0);
    const [features, setFeatures] = useState<string[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);
    const [ctaText, setCtaText] = useState('Empezar ahora');
    const [sortOrder, setSortOrder] = useState(0);
    const [newFeature, setNewFeature] = useState('');

    function reset() {
        setSlug('');
        setName('');
        setDescription('');
        setPrice(0);
        setFeatures([]);
        setIsFeatured(false);
        setCtaText('Empezar ahora');
        setSortOrder(0);
        setNewFeature('');
    }

    function addFeature() {
        const trimmed = newFeature.trim();
        if (trimmed) {
            setFeatures([...features, trimmed]);
            setNewFeature('');
        }
    }

    function removeFeature(index: number) {
        setFeatures(features.filter((_, i) => i !== index));
    }

    function handleNameChange(value: string) {
        setName(value);
        // Auto-generate slug from name
        setSlug(value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''));
    }

    async function handleCreate() {
        if (!name.trim() || !slug.trim()) {
            toast.error('El nombre es obligatorio.');
            return;
        }

        setLoading(true);
        const result = await createLandingPlan({
            slug,
            name,
            description: description || name,
            price,
            features,
            isFeatured,
            ctaText,
            ctaLink: null,
            sortOrder,
            showTrialOnRegister: false,
        });
        setLoading(false);

        if (result.success) {
            toast.success(`Plan "${name}" creado.`);
            setOpen(false);
            reset();
            onCreated();
        } else {
            toast.error(result.error || 'Error al crear el plan.');
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Crear plan
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo plan</DialogTitle>
                    <DialogDescription>Crea un nuevo plan para la landing page.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre *</Label>
                        <Input
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="Ej: Enterprise"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Slug (identificador único)</Label>
                        <Input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toUpperCase())}
                            placeholder="Ej: ENTERPRISE"
                            className="font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Descripción corta del plan..."
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Precio (USD/mes)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Orden</Label>
                            <Input
                                type="number"
                                min={0}
                                value={sortOrder}
                                onChange={(e) => setSortOrder(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Texto del botón</Label>
                        <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                        <Label>Destacado (badge &quot;Popular&quot;)</Label>
                    </div>

                    <div className="space-y-2">
                        <Label>Features</Label>
                        <div className="space-y-2">
                            {features.map((f, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Input
                                        value={f}
                                        onChange={(e) => {
                                            const updated = [...features];
                                            updated[i] = e.target.value;
                                            setFeatures(updated);
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFeature(i)}
                                        className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nueva feature..."
                                value={newFeature}
                                onChange={(e) => setNewFeature(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                                className="flex-1"
                            />
                            <Button variant="outline" size="icon" onClick={addFeature} className="shrink-0">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                        {loading ? 'Creando...' : 'Crear plan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
