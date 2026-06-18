'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Search, XCircle, FileText } from 'lucide-react';
import { fetchAlegraInvoicesAction } from './actions';

type Invoice = {
    id: string;
    number: string;
    date: string;
    total: number;
    status: string;
    client: string;
};

const STATUS_LABEL: Record<string, string> = {
    open: 'Emitida',
    draft: 'Borrador',
    closed: 'Pagada',
    void: 'Anulada',
};

export function InvoicesList() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (q?: string) => {
        setLoading(true);
        setError(null);
        const result = await fetchAlegraInvoicesAction(q);
        if (result.success) {
            setInvoices(result.invoices);
        } else {
            setError(result.error);
            setInvoices([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && load(query)}
                        placeholder="Buscar factura..."
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" onClick={() => load(query)} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            ) : invoices.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <FileText className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No hay facturas para mostrar.</p>
                </div>
            ) : (
                <div className="bg-card rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-medium">Número</th>
                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium text-right">Total</th>
                                    <th className="px-4 py-3 font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="border-t">
                                        <td className="px-4 py-3 font-medium text-foreground">{inv.number}</td>
                                        <td className="px-4 py-3">{inv.client || '—'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{inv.date || '—'}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {inv.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="text-xs">
                                                {STATUS_LABEL[inv.status] ?? inv.status ?? '—'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
