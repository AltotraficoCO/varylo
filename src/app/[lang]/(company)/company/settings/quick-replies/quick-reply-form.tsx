'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { createQuickReply, updateQuickReply } from './actions';

interface Props {
    mode: 'create' | 'edit';
    initial?: { id: string; shortcut: string; content: string };
    trigger?: React.ReactNode;
}

export function QuickReplyForm({ mode, initial, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [shortcut, setShortcut] = useState(initial?.shortcut ?? '');
    const [content, setContent] = useState(initial?.content ?? '');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const result =
                mode === 'create'
                    ? await createQuickReply({ shortcut, content })
                    : await updateQuickReply(initial!.id, { shortcut, content });
            if (result.success) {
                setOpen(false);
                if (mode === 'create') {
                    setShortcut('');
                    setContent('');
                }
            } else {
                setError(result.error ?? 'Error desconocido');
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Nueva respuesta
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' ? 'Nueva respuesta rápida' : 'Editar respuesta rápida'}
                    </DialogTitle>
                    <DialogDescription>
                        Escribe un atajo (ej. <code>/saludo</code>) y el texto que se insertará en el chat.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="shortcut">Atajo</Label>
                        <Input
                            id="shortcut"
                            value={shortcut}
                            onChange={(e) => setShortcut(e.target.value)}
                            placeholder="/saludo"
                            required
                            autoFocus
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Letras, números, guiones y guiones bajos. Se prefijará con <code>/</code> automáticamente.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="content">Mensaje</Label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={5}
                            required
                            maxLength={4000}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                            placeholder="Hola, ¿en qué puedo ayudarte?"
                        />
                        <p className="text-[11px] text-muted-foreground text-right">
                            {content.length}/4000
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? 'Crear' : 'Guardar cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function EditQuickReplyButton(props: { initial: { id: string; shortcut: string; content: string } }) {
    return (
        <QuickReplyForm
            mode="edit"
            initial={props.initial}
            trigger={
                <Button variant="ghost" size="sm" className="gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
            }
        />
    );
}
