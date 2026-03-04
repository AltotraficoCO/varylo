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
import { updateLandingPlan, upsertPlanPricing } from './actions';
import { Pencil, Plus, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type PlanPricing = {
    id: string;
    priceInCents: number;
    billingPeriodDays: number;
    trialDays: number;
    active: boolean;
} | null;

type PlanData = {
    id: string;
    slug: string;
    name: string;
    description: string;
    price: number;
    features: string[];
    isFeatured: boolean;
    ctaText: string;
    ctaLink: string | null;
    sortOrder: number;
    planPricing: PlanPricing;
};

export function EditPlanDialog({ plan, onUpdated }: { plan: PlanData; onUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(plan.name);
    const [description, setDescription] = useState(plan.description);
    const [price, setPrice] = useState(plan.price);
    const [features, setFeatures] = useState<string[]>(plan.features);
    const [isFeatured, setIsFeatured] = useState(plan.isFeatured);
    const [ctaText, setCtaText] = useState(plan.ctaText);
    const [newFeature, setNewFeature] = useState('');

    // Pricing fields
    const [priceCop, setPriceCop] = useState(plan.planPricing?.priceInCents ? plan.planPricing.priceInCents / 100 : 0);
    const [billingPeriodDays, setBillingPeriodDays] = useState(plan.planPricing?.billingPeriodDays ?? 30);
    const [trialDays, setTrialDays] = useState(plan.planPricing?.trialDays ?? 0);
    const [pricingActive, setPricingActive] = useState(plan.planPricing?.active ?? true);

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

    async function handleSave() {
        setLoading(true);
        const result = await updateLandingPlan({
            id: plan.id,
            name,
            description,
            price,
            features,
            isFeatured,
            ctaText,
            ctaLink: plan.ctaLink,
            sortOrder: plan.sortOrder,
        });

        // Save pricing if COP price is set
        if (priceCop > 0) {
            await upsertPlanPricing({
                landingPlanId: plan.id,
                priceInCents: Math.round(priceCop * 100),
                billingPeriodDays,
                trialDays,
                active: pricingActive,
            });
        }

        setLoading(false);
        if (result.success) {
            setOpen(false);
            onUpdated();
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                    <Pencil className="h-4 w-4" />
                    Editar Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar plan {plan.slug}</DialogTitle>
                    <DialogDescription>Modifica los datos que se muestran en la landing page.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-2">
                        <Label>Precio (USD/mes)</Label>
                        <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Texto del botón</Label>
                        <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                        <Label>Destacado (badge &quot;Popular&quot;)</Label>
                    </div>
                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Suscripción recurrente (COP)</p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Precio COP</Label>
                            <Input type="number" min={0} value={priceCop} onChange={(e) => setPriceCop(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Período (días)</Label>
                            <Input type="number" min={1} value={billingPeriodDays} onChange={(e) => setBillingPeriodDays(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Días de prueba</Label>
                            <Input type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <Switch checked={pricingActive} onCheckedChange={setPricingActive} />
                            <Label>Suscripción activa</Label>
                        </div>
                    </div>

                    <Separator />

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
                                    <Button variant="ghost" size="icon" onClick={() => removeFeature(i)} className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50">
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
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
