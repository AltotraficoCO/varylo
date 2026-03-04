'use strict';
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateCompany, adjustCompanyCredits, toggleSubscriptionStatus, createManualSubscription, getAvailablePlanPricings } from './actions';
import { Company } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { CalendarDays, Clock, CreditCard } from "lucide-react"

interface CompanyWithUsers extends Company {
    users: any[];
    subscriptions?: any[];
}

const formSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'El nombre es obligatorio'),
    plan: z.enum(['STARTER', 'PRO', 'SCALE']),
    status: z.enum(['ACTIVE', 'SUSPENDED']),
});

interface EditCompanyDialogProps {
    company: CompanyWithUsers;
}

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function EditCompanyDialog({ company }: EditCompanyDialogProps) {
    const [open, setOpen] = useState(false);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditDescription, setCreditDescription] = useState('');
    const [creditLoading, setCreditLoading] = useState(false);
    const [subLoading, setSubLoading] = useState(false);
    const [subStatus, setSubStatus] = useState<string | null>(null);
    const [createSubLoading, setCreateSubLoading] = useState(false);
    const [planPricings, setPlanPricings] = useState<any[]>([]);
    const [selectedPricingId, setSelectedPricingId] = useState('');
    const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>(company.plan);
    const [manualDays, setManualDays] = useState(30);
    const router = useRouter();

    const sub = company.subscriptions?.[0] || null;

    // Initialize subStatus from subscription data
    const currentSubStatus = subStatus ?? sub?.status ?? null;

    // Load plan pricings when dialog opens (for creating manual subscriptions)
    useEffect(() => {
        if (open && !sub) {
            getAvailablePlanPricings().then(setPlanPricings);
        }
    }, [open, sub]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: company.id,
            name: company.name,
            plan: company.plan,
            status: company.status,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const result = await updateCompany(values);
            if (result.success) {
                toast.success('Empresa actualizada correctamente');
                setOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || 'Error al actualizar la empresa');
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado');
        }
    }

    async function onAdjustCredits() {
        const amount = parseInt(creditAmount);
        if (isNaN(amount) || amount === 0) {
            toast.error('Ingresa un monto válido (positivo para agregar, negativo para descontar)');
            return;
        }
        if (!creditDescription.trim()) {
            toast.error('Ingresa una descripción para el ajuste');
            return;
        }
        setCreditLoading(true);
        try {
            const result = await adjustCompanyCredits({
                companyId: company.id,
                amount,
                description: creditDescription.trim(),
            });
            if (result.success) {
                toast.success(`Créditos ajustados. Nuevo saldo: ${formatCOP(result.newBalance!)}`);
                setCreditAmount('');
                setCreditDescription('');
                router.refresh();
            } else {
                toast.error(result.error || 'Error al ajustar créditos');
            }
        } catch {
            toast.error('Ocurrió un error inesperado');
        } finally {
            setCreditLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    Administrar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Administrar Empresa</DialogTitle>
                    <DialogDescription>
                        Gestiona los detalles y usuarios de la empresa.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="details">Detalles</TabsTrigger>
                        <TabsTrigger value="subscription">Suscripción</TabsTrigger>
                        <TabsTrigger value="users">Usuarios</TabsTrigger>
                        <TabsTrigger value="credits">Créditos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre de la Empresa</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Acme Inc." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="plan"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Plan</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un plan" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="STARTER">Starter</SelectItem>
                                                    <SelectItem value="PRO">Pro</SelectItem>
                                                    <SelectItem value="SCALE">Scale</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un estado" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ACTIVE">Activo</SelectItem>
                                                    <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Guardar Cambios
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="subscription">
                        <div className="py-4 space-y-4">
                            {sub ? (
                                <>
                                    {/* Subscription info card */}
                                    <div className="rounded-lg border p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-sm">Plan suscrito</h4>
                                            <Badge variant={
                                                currentSubStatus === 'ACTIVE' ? 'default' :
                                                currentSubStatus === 'TRIAL' ? 'secondary' :
                                                currentSubStatus === 'PAST_DUE' ? 'destructive' : 'outline'
                                            }>
                                                {currentSubStatus === 'ACTIVE' ? 'Activa' :
                                                 currentSubStatus === 'TRIAL' ? 'Prueba' :
                                                 currentSubStatus === 'PAST_DUE' ? 'Pago pendiente' :
                                                 currentSubStatus === 'CANCELLED' ? 'Cancelada' : currentSubStatus}
                                            </Badge>
                                        </div>
                                        <p className="text-lg font-bold">
                                            {sub.planPricing?.landingPlan?.name || 'Plan desconocido'}
                                        </p>
                                        {sub.planPricing && (
                                            <p className="text-sm text-muted-foreground">
                                                {formatCOP(sub.planPricing.priceInCents / 100)} COP / {sub.planPricing.billingPeriodDays} días
                                            </p>
                                        )}
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border p-3">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                Inicio del período
                                            </div>
                                            <p className="text-sm font-medium">
                                                {new Date(sub.currentPeriodStart).toLocaleDateString('es-CO', {
                                                    year: 'numeric', month: 'long', day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-3">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                Fin del período
                                            </div>
                                            <p className="text-sm font-medium">
                                                {new Date(sub.currentPeriodEnd).toLocaleDateString('es-CO', {
                                                    year: 'numeric', month: 'long', day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Days remaining */}
                                    <div className="rounded-lg border p-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            Días restantes
                                        </div>
                                        {(() => {
                                            const daysLeft = Math.ceil(
                                                (new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                            );
                                            return (
                                                <p className={`text-xl font-bold ${daysLeft <= 0 ? 'text-red-500' : daysLeft <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                                    {daysLeft > 0 ? `${daysLeft} días` : 'Vencida'}
                                                </p>
                                            );
                                        })()}
                                    </div>

                                    {/* Toggle active/inactive */}
                                    <div className="rounded-lg border p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">Suscripción activa</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Activar o desactivar manualmente la suscripción
                                                </p>
                                            </div>
                                            <Switch
                                                checked={currentSubStatus === 'ACTIVE' || currentSubStatus === 'TRIAL'}
                                                disabled={subLoading}
                                                onCheckedChange={async (checked) => {
                                                    setSubLoading(true);
                                                    const newStatus = checked ? 'ACTIVE' : 'CANCELLED';
                                                    const result = await toggleSubscriptionStatus({
                                                        subscriptionId: sub.id,
                                                        newStatus,
                                                    });
                                                    if (result.success) {
                                                        setSubStatus(newStatus);
                                                        toast.success(checked ? 'Suscripción activada' : 'Suscripción desactivada');
                                                        router.refresh();
                                                    } else {
                                                        toast.error(result.error || 'Error al cambiar estado');
                                                    }
                                                    setSubLoading(false);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {sub.cancelledAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Cancelada el {new Date(sub.cancelledAt).toLocaleDateString('es-CO', {
                                                year: 'numeric', month: 'long', day: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-center py-4">
                                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                            <CreditCard className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <p className="font-medium">Sin suscripción</p>
                                        <p className="text-sm text-muted-foreground">
                                            Crea una suscripción de cortesía o manual para esta empresa.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Plan selector - always works */}
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">Plan</label>
                                            <Select value={selectedPlanSlug} onValueChange={setSelectedPlanSlug}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar plan..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="STARTER">Starter</SelectItem>
                                                    <SelectItem value="PRO">Pro</SelectItem>
                                                    <SelectItem value="SCALE">Scale</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* If PlanPricings exist, optionally select one */}
                                        {planPricings.length > 0 && (
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium">Pricing (opcional)</label>
                                                <Select value={selectedPricingId} onValueChange={setSelectedPricingId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Usar plan sin precio específico" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {planPricings.map((pp: any) => (
                                                            <SelectItem key={pp.id} value={pp.id}>
                                                                {pp.landingPlan.name} - {formatCOP(pp.priceInCents / 100)} COP
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* Period days */}
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">Días de suscripción</label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={manualDays}
                                                onChange={(e) => setManualDays(Number(e.target.value))}
                                                placeholder="30"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Vence el {new Date(Date.now() + manualDays * 86400000).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>

                                        <Button
                                            onClick={async () => {
                                                if (!selectedPlanSlug && !selectedPricingId) {
                                                    toast.error('Selecciona un plan');
                                                    return;
                                                }
                                                setCreateSubLoading(true);
                                                const result = await createManualSubscription({
                                                    companyId: company.id,
                                                    ...(selectedPricingId ? { planPricingId: selectedPricingId } : {}),
                                                    planSlug: selectedPlanSlug as any,
                                                    periodDays: manualDays || 30,
                                                    status: 'ACTIVE',
                                                });
                                                if (result.success) {
                                                    toast.success('Suscripción activada correctamente');
                                                    setOpen(false);
                                                    router.refresh();
                                                } else {
                                                    toast.error(result.error || 'Error al crear suscripción');
                                                }
                                                setCreateSubLoading(false);
                                            }}
                                            disabled={createSubLoading}
                                            className="w-full"
                                        >
                                            {createSubLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : null}
                                            Activar suscripción
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="users">
                        <div className="py-4">
                            {company.users && company.users.length > 0 ? (
                                <div className="space-y-4">
                                    {company.users.map((user: any) => (
                                        <div key={user.id} className="flex items-center justify-between p-2 border rounded-lg">
                                            <div>
                                                <p className="font-medium">{user.name || 'Sin nombre'}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                            <Badge variant={user.role === 'OWNER' ? 'default' : 'secondary'}>
                                                {user.role}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    No hay usuarios registrados en esta empresa.
                                </p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="credits">
                        <div className="py-4 space-y-4">
                            <div className="p-4 border rounded-lg">
                                <p className="text-sm text-muted-foreground">Saldo actual</p>
                                <p className="text-2xl font-bold">{formatCOP(company.creditBalance)}</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">Monto (COP)</label>
                                    <Input
                                        type="number"
                                        placeholder="Ej: 10000 para agregar, -5000 para descontar"
                                        value={creditAmount}
                                        onChange={(e) => setCreditAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Descripción</label>
                                    <Textarea
                                        placeholder="Motivo del ajuste..."
                                        value={creditDescription}
                                        onChange={(e) => setCreditDescription(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                                <Button
                                    onClick={onAdjustCredits}
                                    disabled={creditLoading}
                                    className="w-full"
                                >
                                    {creditLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Ajustar Créditos
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
