'use client';

import { useActionState, useState } from 'react';
import { createAgent } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { useEffect } from 'react';

export function CreateAgentDialog({ allowRoleSelection = true }: { allowRoleSelection?: boolean }) {
    const [state, action, isPending] = useActionState(createAgent, undefined);
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<'AGENT' | 'SUPERVISOR'>('AGENT');

    useEffect(() => {
        if (state?.startsWith('Success')) {
            setOpen(false);
            setRole('AGENT');
        }
    }, [state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-lg px-5 py-2.5">
                    <Plus className="mr-2 h-4 w-4" />
                    Invitar usuario
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                        Crea una cuenta para un nuevo miembro de tu equipo (agente o supervisor).
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                        <Label htmlFor="name" className="sm:text-right">
                            Nombre
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Juan Pérez"
                            className="sm:col-span-3"
                            required
                        />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                        <Label htmlFor="email" className="sm:text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="juan@empresa.com"
                            className="sm:col-span-3"
                            required
                        />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                        <Label htmlFor="password" className="sm:text-right">
                            Contraseña
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            className="sm:col-span-3"
                            required
                            minLength={6}
                        />
                    </div>
                    {allowRoleSelection ? (
                        <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                            <Label className="sm:text-right sm:pt-2">Rol</Label>
                            <div className="sm:col-span-3 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRole('AGENT')}
                                    className={`text-left rounded-lg border px-3 py-2 text-sm transition ${role === 'AGENT' ? 'border-[#10B981] bg-[#ECFDF5] text-[#065F46]' : 'border-[#E4E4E7] hover:border-[#A1A1AA]'}`}
                                >
                                    <div className="font-medium">Agente</div>
                                    <div className="text-[11px] text-[#71717A]">Atiende conversaciones</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('SUPERVISOR')}
                                    className={`text-left rounded-lg border px-3 py-2 text-sm transition ${role === 'SUPERVISOR' ? 'border-[#8B5CF6] bg-[#F5F3FF] text-[#5B21B6]' : 'border-[#E4E4E7] hover:border-[#A1A1AA]'}`}
                                >
                                    <div className="font-medium">Supervisor</div>
                                    <div className="text-[11px] text-[#71717A]">Ve todo y asigna a agentes</div>
                                </button>
                                <input type="hidden" name="role" value={role} />
                            </div>
                        </div>
                    ) : (
                        <input type="hidden" name="role" value="AGENT" />
                    )}

                    {state && (
                        <div className={`text-sm text-center ${state.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                            {state}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Cuenta
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
