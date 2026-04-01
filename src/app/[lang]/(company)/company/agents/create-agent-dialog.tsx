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

export function CreateAgentDialog() {
    const [state, action, isPending] = useActionState(createAgent, undefined);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (state?.startsWith('Success')) {
            setOpen(false);
        }
    }, [state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-lg px-5 py-2.5">
                    <Plus className="mr-2 h-4 w-4" />
                    Invitar agente
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nuevo Agente</DialogTitle>
                    <DialogDescription>
                        Crea una cuenta para un nuevo miembro de tu equipo de soporte.
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nombre
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Juan Pérez"
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="juan@empresa.com"
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                            Contraseña
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            className="col-span-3"
                            required
                            minLength={6}
                        />
                    </div>

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
