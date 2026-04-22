'use strict';
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
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
import { createCompany } from './actions';
import { useDictionary } from '@/lib/i18n-context';

const formSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    plan: z.enum(['STARTER', 'PRO', 'SCALE']),
    status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export function CreateCompanyDialog() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const dict = useDictionary();
    const t = dict.superAdminUI?.createCompanyDialog || {};
    const ui = dict.ui || {};

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            plan: 'STARTER',
            status: 'ACTIVE',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const result = await createCompany(values);
            if (result.success) {
                toast.success(t.companyCreated || 'Empresa creada correctamente');
                setOpen(false);
                form.reset();
                router.refresh();
            } else {
                toast.error(result.error || (t.createError || 'Error al crear la empresa'));
            }
        } catch (error) {
            toast.error(t.unexpectedError || 'Ocurrió un error inesperado');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t.newCompany || 'Nueva Empresa'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t.createTitle || 'Crear Nueva Empresa'}</DialogTitle>
                    <DialogDescription>
                        {t.createDesc || 'Ingresa los detalles de la nueva empresa. Podrás agregar usuarios más tarde.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                {t.createButton || 'Crear Empresa'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
