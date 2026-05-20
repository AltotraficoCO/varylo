'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteQuickReply } from './actions';

export function DeleteQuickReplyButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();
    const [confirming, setConfirming] = useState(false);

    function onClick() {
        if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 3000);
            return;
        }
        startTransition(async () => {
            await deleteQuickReply(id);
        });
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={isPending}
            className={confirming ? 'text-destructive gap-2' : 'gap-2 text-muted-foreground'}
        >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirming ? '¿Confirmar?' : 'Eliminar'}
        </Button>
    );
}
