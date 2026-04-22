'use client';

import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { createLandingPlan, upsertPlanPricing } from './actions';
import { Plus, X, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchUsdToCop, FALLBACK_RATE } from '@/lib/exchange-rate';
import { useDictionary } from '@/lib/i18n-context';

export function CreatePlanDialog({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dict = useDictionary();
    const t = dict.superAdminUI?.createPlanDialog || {};
    const ui = dict.ui || {};

    // Plan fields
    const [slug, setSlug] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(0);
    const [features, setFeatures] = useState<string[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);
    const [ctaText, setCtaText] = useState('Empezar ahora');
    const [sortOrder, setSortOrder] = useState(0);
    const [showTrialOnRegister, setShowTrialOnRegister] = useState(false);
    const [newFeature, setNewFeature] = useState('');

    // Pricing fields
    const [priceCop, setPriceCop] = useState(0);
    const [billingPeriodDays, setBillingPeriodDays] = useState(30);
    const [trialDays, setTrialDays] = useState(0);
    const [useAutoTrm, setUseAutoTrm] = useState(false);

    // Exchange rate
    const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
    const [rateLoading, setRateLoading] = useState(false);

    useEffect(() => {
        if (open) loadRate();
    }, [open]);

    async function loadRate() {
        setRateLoading(true);
        const rate = await fetchUsdToCop();
        setExchangeRate(rate);
        if (useAutoTrm || priceCop === 0) {
            setPriceCop(Math.round(price * rate));
        }
        setRateLoading(false);
    }

    function reset() {
        setSlug('');
        setName('');
        setDescription('');
        setPrice(0);
        setFeatures([]);
        setIsFeatured(false);
        setCtaText('Empezar ahora');
        setSortOrder(0);
        setShowTrialOnRegister(false);
        setNewFeature('');
        setPriceCop(0);
        setBillingPeriodDays(30);
        setTrialDays(0);
        setUseAutoTrm(false);
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
        setSlug(value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''));
    }

    function handlePriceUsdChange(usd: number) {
        setPrice(usd);
        if (useAutoTrm) {
            setPriceCop(Math.round(usd * exchangeRate));
        }
    }

    function handleAutoTrmToggle(checked: boolean) {
        setUseAutoTrm(checked);
        if (checked) {
            setPriceCop(Math.round(price * exchangeRate));
        }
    }

    async function handleCreate() {
        if (!name.trim() || !slug.trim()) {
            toast.error('El nombre es obligatorio.');
            return;
        }
        if (priceCop <= 0) {
            toast.error('Configura el precio en COP para que el plan sea visible.');
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
            showTrialOnRegister,
        });

        if (result.success && result.plan) {
            // Create pricing immediately
            await upsertPlanPricing({
                landingPlanId: result.plan.id,
                priceInCents: Math.round(priceCop * 100),
                billingPeriodDays,
                trialDays,
                active: true,
                useAutoTrm,
            });

            toast.success(`Plan "${name}" creado con pricing.`);
            setOpen(false);
            reset();
            onCreated();
        } else {
            toast.error(result.error || 'Error al crear el plan.');
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.createPlan || 'Crear plan'}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t.newPlan || 'Nuevo plan'}</DialogTitle>
                    <DialogDescription>{t.newPlanDesc || 'Crea un nuevo plan con pricing incluido.'}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Basic info */}
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
                                onChange={(e) => handlePriceUsdChange(Number(e.target.value))}
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
                    <div className="flex items-center gap-3">
                        <Switch checked={showTrialOnRegister} onCheckedChange={setShowTrialOnRegister} />
                        <Label>Mostrar con trial en registro</Label>
                    </div>

                    <Separator />

                    {/* Pricing section */}
                    <p className="text-sm font-medium text-muted-foreground">Suscripción recurrente (COP)</p>

                    <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tasa de cambio (USD → COP)</span>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={loadRate} disabled={rateLoading}>
                                {rateLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                Actualizar
                            </Button>
                        </div>
                        <p className="text-lg font-semibold">
                            1 USD = ${exchangeRate.toLocaleString('es-CO')} COP
                        </p>
                        <p className="text-xs text-muted-foreground">
                            ${price} USD = <span className="font-medium text-foreground">${(price * exchangeRate).toLocaleString('es-CO')} COP</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch checked={useAutoTrm} onCheckedChange={handleAutoTrmToggle} />
                        <Label>Usar TRM automática en registro</Label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Precio COP * {useAutoTrm ? '(automático)' : ''}</Label>
                            <Input
                                type="number"
                                min={0}
                                value={priceCop}
                                onChange={(e) => setPriceCop(Number(e.target.value))}
                                readOnly={useAutoTrm}
                                className={useAutoTrm ? 'bg-muted cursor-not-allowed' : ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Período (días)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={billingPeriodDays}
                                onChange={(e) => setBillingPeriodDays(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Días de prueba (0 = sin trial)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={trialDays}
                            onChange={(e) => setTrialDays(Number(e.target.value))}
                        />
                    </div>

                    <Separator />

                    {/* Features */}
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
                    <Button variant="outline" onClick={() => setOpen(false)}>{ui.cancel || 'Cancelar'}</Button>
                    <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                        {loading ? (t.creating || 'Creando...') : (t.createPlan || 'Crear plan')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
