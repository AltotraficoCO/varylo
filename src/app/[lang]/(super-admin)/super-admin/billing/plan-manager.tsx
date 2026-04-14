'use client';

import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, DatabaseZap, Trash2, Star, TestTube2, Sparkles } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditPlanDialog } from "./edit-plan-dialog";
import { CreatePlanDialog } from "./create-plan-dialog";
import { seedLandingPlans, getLandingPlansWithPricing, deleteLandingPlan } from "./actions";
import { useDictionary } from '@/lib/i18n-context';

type PlanPricing = {
    id: string;
    priceInCents: number;
    billingPeriodDays: number;
    trialDays: number;
    useAutoTrm: boolean;
    active: boolean;
} | null;

type Plan = {
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
    showTrialOnRegister: boolean;
    planPricing: PlanPricing;
};

function formatCOP(cents: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

export function PlanManager({ initialPlans }: { initialPlans: Plan[] }) {
    const dict = useDictionary();
    const t = dict.superAdminUI?.planManager || {};
    const [plans, setPlans] = useState<Plan[]>(initialPlans);
    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState('');

    async function refresh() {
        const updated = await getLandingPlansWithPricing();
        setPlans(updated);
    }

    async function handleSeed() {
        setSeeding(true);
        setError('');
        try {
            const result = await seedLandingPlans();
            if (result.success) {
                await refresh();
            } else {
                setError(result.error || 'Error desconocido');
            }
        } catch (e: any) {
            setError(e.message || 'Error al crear los planes');
        }
        setSeeding(false);
    }

    if (plans.length === 0) {
        return (
            <div className="bg-card rounded-xl border p-12 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <DatabaseZap className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                    {t.noPlans || 'No hay planes configurados'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    {t.noPlansDesc || 'Crea los planes por defecto (Starter, Pro, Scale) para empezar a gestionar los precios de la landing.'}
                </p>
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                <Button onClick={handleSeed} disabled={seeding}>
                    {seeding ? (t.creatingDefaults || 'Creando...') : (t.createDefaults || 'Crear planes por defecto')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[13px] text-[#71717A]">{plans.length} planes configurados</p>
                <CreatePlanDialog onCreated={refresh} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`bg-card rounded-xl border overflow-hidden flex flex-col ${
                            plan.isFeatured ? 'border-primary' : ''
                        }`}
                    >
                        {/* Plan header */}
                        <div className="p-5 border-b border-[#F4F4F5] dark:border-[#27272A]">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {plan.isFeatured && (
                                        <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            <Star className="h-2.5 w-2.5" />
                                            Popular
                                        </span>
                                    )}
                                    {plan.showTrialOnRegister && (
                                        <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                                            <TestTube2 className="h-2.5 w-2.5" />
                                            Trial
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-[13px] text-muted-foreground">{plan.description}</p>
                        </div>

                        {/* Pricing */}
                        <div className="p-5 border-b border-[#F4F4F5] dark:border-[#27272A]">
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-[32px] font-bold text-foreground leading-none">${plan.price}</span>
                                <span className="text-sm text-muted-foreground">/mes</span>
                            </div>
                            {plan.planPricing ? (
                                <div className="space-y-1">
                                    <p className="text-[13px] text-muted-foreground">
                                        {formatCOP(plan.planPricing.priceInCents)} COP · {plan.planPricing.billingPeriodDays} días
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {plan.planPricing.trialDays > 0 && (
                                            <span className="text-[11px] bg-amber-50 text-amber-600 font-medium px-2 py-0.5 rounded-full">
                                                {plan.planPricing.trialDays}d prueba
                                            </span>
                                        )}
                                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                            plan.planPricing.useAutoTrm
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {plan.planPricing.useAutoTrm ? 'TRM automático' : 'Precio manual'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[13px] text-muted-foreground">Sin precio de suscripción</span>
                            )}
                        </div>

                        {/* Features */}
                        <div className="p-5 flex-1">
                            <p className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-3">
                                Incluye
                            </p>
                            <ul className="space-y-2">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="px-5 py-4 border-t border-[#F4F4F5] dark:border-[#27272A] flex items-center gap-2">
                            <EditPlanDialog plan={plan} onUpdated={refresh} />
                            <DeletePlanButton plan={plan} onDeleted={refresh} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DeletePlanButton({ plan, onDeleted }: { plan: Plan; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    async function handleDelete() {
        setDeleting(true);
        setError('');
        const result = await deleteLandingPlan(plan.id);
        setDeleting(false);
        if (result.success) {
            onDeleted();
        } else {
            setError(result.error || 'Error al eliminar');
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar plan &quot;{plan.name}&quot;</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción eliminará permanentemente el plan y su configuración de precios.
                        {plan.planPricing && ' Las suscripciones activas no se verán afectadas, pero no se podrán crear nuevas.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {deleting ? 'Eliminando...' : 'Eliminar plan'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
