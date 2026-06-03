'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Workflow, Plus, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { createAutomationFlow, deleteAutomationFlow } from './actions';

interface FlowRow {
    id: string;
    name: string;
    status: string;
    runs: number;
    updatedAt: string;
}

export function AutomationsList({ lang, flows }: { lang: string; flows: FlowRow[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [creating, setCreating] = useState(false);

    const handleCreate = () => {
        setCreating(true);
        startTransition(async () => {
            try {
                const id = await createAutomationFlow('Nuevo agente condicional');
                router.push(`/${lang}/company/automations/${id}`);
            } catch {
                toast.error('No se pudo crear el agente condicional');
                setCreating(false);
            }
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`¿Eliminar el agente condicional "${name}"? Esto no se puede deshacer.`)) return;
        startTransition(async () => {
            try {
                await deleteAutomationFlow(id);
                toast.success('Agente condicional eliminado');
                router.refresh();
            } catch {
                toast.error('No se pudo eliminar');
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Workflow className="h-6 w-6 text-[#6366F1]" />
                        Agente condicional
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Recibe leads por webhook y rutéalos al agente IA correcto según su origen.
                    </p>
                </div>
                <Button onClick={handleCreate} disabled={creating}>
                    {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Nuevo agente condicional
                </Button>
            </div>

            {flows.length === 0 ? (
                <Card className="p-10 flex flex-col items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                        <Workflow className="h-6 w-6 text-[#6366F1]" />
                    </div>
                    <p className="font-medium">Aún no tienes agentes condicionales</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Crea un agente condicional con un nodo Webhook que reciba tus leads, una Condición por origen, y nodos que despachen al agente IA correspondiente.
                    </p>
                    <Button onClick={handleCreate} disabled={creating} variant="outline">
                        <Plus className="mr-2 h-4 w-4" />Crear el primero
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {flows.map(f => (
                        <Card key={f.id} className="p-4 flex items-center justify-between hover:border-[#6366F1]/40 transition-colors">
                            <Link href={`/${lang}/company/automations/${f.id}`} className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{f.name}</span>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${f.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {f.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{f.runs} ejecuciones</p>
                            </Link>
                            <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isPending} onClick={() => handleDelete(f.id, f.name)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Link href={`/${lang}/company/automations/${f.id}`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowRight className="h-4 w-4" /></Button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
