'use client';

import { useActionState, useState, useEffect } from 'react';
import { updateAgent } from './actions';
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
import { Loader2, Pencil } from "lucide-react";

interface Agent {
    id: string;
    name: string | null;
    email: string;
}

export function EditAgentDialog({ agent }: { agent: Agent }) {
    const [state, action, isPending] = useActionState(updateAgent, undefined);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (state?.startsWith('Success')) {
            setOpen(false);
        }
    }, [state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Agente</DialogTitle>
                    <DialogDescription>
                        Modifica los datos del agente.
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <input type="hidden" name="id" value={agent.id} />
                    <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                        <Label htmlFor="edit-name" className="sm:text-right">
                            Nombre
                        </Label>
                        <Input
                            id="edit-name"
                            name="name"
                            defaultValue={agent.name || ''}
                            className="sm:col-span-3"
                            required
                        />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                        <Label htmlFor="edit-email" className="sm:text-right">
                            Email
                        </Label>
                        <Input
                            id="edit-email"
                            name="email"
                            type="email"
                            defaultValue={agent.email}
                            className="sm:col-span-3"
                            required
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
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
