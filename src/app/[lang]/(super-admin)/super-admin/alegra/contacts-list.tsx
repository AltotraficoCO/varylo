'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Search, XCircle, Users } from 'lucide-react';
import { fetchAlegraContactsAction } from './actions';

type Contact = {
    id: string;
    name: string;
    identification: string;
    email: string;
};

export function ContactsList() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (q?: string) => {
        setLoading(true);
        setError(null);
        const result = await fetchAlegraContactsAction(q);
        if (result.success) {
            setContacts(result.contacts);
        } else {
            setError(result.error);
            setContacts([]);
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
                        placeholder="Buscar contacto..."
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
            ) : contacts.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Users className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No hay contactos para mostrar.</p>
                </div>
            ) : (
                <div className="bg-card rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-medium">Nombre</th>
                                    <th className="px-4 py-3 font-medium">Identificación</th>
                                    <th className="px-4 py-3 font-medium">Correo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.map((c) => (
                                    <tr key={c.id} className="border-t">
                                        <td className="px-4 py-3 font-medium text-foreground">{c.name || '—'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{c.identification || '—'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
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
