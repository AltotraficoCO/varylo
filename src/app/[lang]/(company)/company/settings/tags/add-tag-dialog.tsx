'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createTag } from './actions';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useDictionary } from '@/lib/i18n-context';

const COLORS = [
    "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3",
    "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A",
    "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
    "#795548", "#9E9E9E", "#607D8B", "#000000"
];

export function AddTagDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [showInSidebar, setShowInSidebar] = useState(true);
    const [loading, setLoading] = useState(false);

    const dict = useDictionary();
    const t = dict.settingsUI?.addTagDialog || {};
    const ui = dict.ui || {};

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createTag({ name, description, color, showInSidebar });
            if (res.success) {
                toast.success(t.createSuccess || "Etiqueta creada correctamente");
                setOpen(false);
                setName('');
                setDescription('');
                setColor(COLORS[0]);
                setShowInSidebar(true);
            } else {
                toast.error(t.createError || "Error al crear etiqueta");
            }
        } catch (error) {
            toast.error(t.createError || "Error al crear etiqueta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>{t.addButton || 'Añadir etiqueta'}</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>{t.title || 'Añadir etiqueta'}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {t.description || 'Las etiquetas permiten agrupar las conversaciones.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t.tagNameLabel || 'Nombre de la etiqueta'}</Label>
                        <Input
                            id="name"
                            placeholder={t.tagNamePlaceholder || 'nombre de la etiqueta'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-gray-50/50"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">{t.descriptionLabel || 'Descripción'}</Label>
                        <Input
                            id="description"
                            placeholder={t.descriptionPlaceholder || 'Descripción de la etiqueta'}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-gray-50/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t.colorLabel || 'Color'}</Label>
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md max-h-[100px] overflow-y-auto">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-6 h-6 rounded-md hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1",
                                        color === c ? "ring-2 ring-offset-1 ring-black scale-110" : ""
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <div className="relative w-6 h-6 rounded-md overflow-hidden border">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="show"
                            checked={showInSidebar}
                            onCheckedChange={(c: boolean | "indeterminate") => setShowInSidebar(c === true)}
                        />
                        <Label htmlFor="show" className="text-sm font-normal text-muted-foreground cursor-pointer">
                            {t.showInSidebar || 'Mostrar etiqueta en la barra lateral'}
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{ui.cancel || 'Cancelar'}</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (ui.creating || 'Creando...') : (ui.create || 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
