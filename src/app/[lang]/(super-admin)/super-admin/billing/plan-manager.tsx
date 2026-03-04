'use client';

import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Check, DatabaseZap } from "lucide-react";
import { EditPlanDialog } from "./edit-plan-dialog";
import { seedLandingPlans, getLandingPlansWithPricing } from "./actions";

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
            <Card className="p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <DatabaseZap className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No hay planes configurados</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Crea los planes por defecto (Starter, Pro, Scale) para empezar a gestionar los precios de la landing.
                </p>
                {error && (
                    <p className="text-sm text-red-500 mb-4">{error}</p>
                )}
                <Button onClick={handleSeed} disabled={seeding}>
                    {seeding ? 'Creando...' : 'Crear planes por defecto'}
                </Button>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
                <Card key={plan.id} className={plan.isFeatured ? 'border-primary' : ''}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </div>
                            <div className="flex gap-1.5">
                                {plan.isFeatured && <Badge>Popular</Badge>}
                                {plan.showTrialOnRegister && <Badge variant="outline" className="text-emerald-700 border-emerald-300">Trial en registro</Badge>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            ${plan.price}
                            <span className="text-lg font-normal text-muted-foreground">/mes</span>
                        </div>
                        {plan.planPricing && (
                            <div className="mt-1 text-sm text-muted-foreground">
                                Suscripción: {formatCOP(plan.planPricing.priceInCents)} COP / {plan.planPricing.billingPeriodDays} días
                                {plan.planPricing.trialDays > 0 && ` (${plan.planPricing.trialDays} días de prueba)`}
                                <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    plan.planPricing.useAutoTrm
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {plan.planPricing.useAutoTrm ? 'TRM auto' : 'Precio manual'}
                                </span>
                            </div>
                        )}
                        <ul className="mt-4 space-y-2">
                            {plan.features.map((f, i) => (
                                <li key={i} className="flex items-center text-sm">
                                    <Check className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <EditPlanDialog plan={plan} onUpdated={refresh} />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
