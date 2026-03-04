'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Star, Trash2, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { addPaymentSourceAction, setDefaultPaymentSource, removePaymentSource } from './billing-actions';

type PaymentSource = {
    id: string;
    brand: string | null;
    lastFour: string | null;
    isDefault: boolean;
    expiresAt: string | null;
    createdAt: string;
};

export function PaymentMethodsCard({
    sources: initialSources,
    companyEmail,
    wompiPublicKey,
    wompiIsSandbox,
}: {
    sources: PaymentSource[];
    companyEmail: string;
    wompiPublicKey?: string;
    wompiIsSandbox?: boolean;
}) {
    const [sources, setSources] = useState(initialSources);
    const [addOpen, setAddOpen] = useState(false);
    const [loading, setLoading] = useState('');
    const [error, setError] = useState('');

    // Card form state
    const [cardNumber, setCardNumber] = useState('');
    const [cardCvc, setCardCvc] = useState('');
    const [cardExpMonth, setCardExpMonth] = useState('');
    const [cardExpYear, setCardExpYear] = useState('');
    const [cardHolder, setCardHolder] = useState('');

    async function handleAddCard() {
        setLoading('add');
        setError('');

        try {
            if (!wompiPublicKey) {
                throw new Error('Wompi no está configurado. Contacta al administrador.');
            }

            const wompiBaseUrl = wompiIsSandbox ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
            const tokenRes = await fetch(`${wompiBaseUrl}/v1/tokens/cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${wompiPublicKey}`,
                },
                body: JSON.stringify({
                    number: cardNumber.replace(/\s/g, ''),
                    cvc: cardCvc,
                    exp_month: cardExpMonth.padStart(2, '0'),
                    exp_year: cardExpYear.padStart(2, '0'),
                    card_holder: cardHolder,
                }),
            });
            const tokenJson = await tokenRes.json();

            if (!tokenRes.ok || !tokenJson.data?.id) {
                throw new Error(tokenJson.error?.reason || 'Error al tokenizar tarjeta');
            }

            const result = await addPaymentSourceAction({
                token: tokenJson.data.id,
                email: companyEmail,
                brand: tokenJson.data.brand,
                lastFour: tokenJson.data.last_four,
                expMonth: cardExpMonth,
                expYear: cardExpYear,
            });

            if (result.success) {
                setAddOpen(false);
                setCardNumber('');
                setCardCvc('');
                setCardExpMonth('');
                setCardExpYear('');
                setCardHolder('');
                window.location.reload();
            } else {
                setError(result.error || 'Error');
            }
        } catch (e: any) {
            setError(e.message || 'Error al agregar tarjeta');
        }
        setLoading('');
    }

    async function handleSetDefault(id: string) {
        setLoading(id);
        await setDefaultPaymentSource(id);
        setSources(sources.map((s) => ({ ...s, isDefault: s.id === id })));
        setLoading('');
    }

    async function handleRemove(id: string) {
        if (!confirm('¿Eliminar esta tarjeta?')) return;
        setLoading(id);
        const result = await removePaymentSource(id);
        if (result.success) {
            setSources(sources.filter((s) => s.id !== id));
        } else {
            setError(result.error || 'Error');
        }
        setLoading('');
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <CardTitle>Métodos de Pago</CardTitle>
                    </div>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1">
                                <Plus className="h-4 w-4" />
                                Agregar tarjeta
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Agregar tarjeta</DialogTitle>
                                <DialogDescription>
                                    Ingresa los datos de tu tarjeta. Se procesará de forma segura con Wompi.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre del titular</Label>
                                    <Input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="Juan Pérez" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Número de tarjeta</Label>
                                    <Input
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value)}
                                        placeholder="4242 4242 4242 4242"
                                        maxLength={19}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Mes</Label>
                                        <Input value={cardExpMonth} onChange={(e) => setCardExpMonth(e.target.value)} placeholder="12" maxLength={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Año</Label>
                                        <Input value={cardExpYear} onChange={(e) => setCardExpYear(e.target.value)} placeholder="28" maxLength={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>CVC</Label>
                                        <Input value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123" maxLength={4} type="password" />
                                    </div>
                                </div>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddCard} disabled={loading === 'add' || !cardNumber || !cardCvc}>
                                    {loading === 'add' ? 'Guardando...' : 'Agregar tarjeta'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <CardDescription>
                    Tarjetas guardadas para pagos recurrentes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No hay tarjetas guardadas. Agrega una para suscribirte.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {sources.map((source) => (
                            <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {source.brand || 'Tarjeta'} •••• {source.lastFour || '????'}
                                        </p>
                                        {source.expiresAt && (
                                            <p className="text-xs text-muted-foreground">
                                                Vence: {new Date(source.expiresAt).toLocaleDateString('es-CO', { month: '2-digit', year: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                    {source.isDefault && (
                                        <Badge variant="secondary" className="gap-1">
                                            <Star className="h-3 w-3" />
                                            Principal
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {!source.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSetDefault(source.id)}
                                            disabled={loading === source.id}
                                        >
                                            Hacer principal
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleRemove(source.id)}
                                        disabled={loading === source.id}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {error && sources.length > 0 && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </CardContent>
        </Card>
    );
}
