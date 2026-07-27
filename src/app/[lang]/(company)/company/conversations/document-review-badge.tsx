'use client';

import { useState, useTransition } from 'react';
import { FileWarning, CheckCircle2, Loader2 } from 'lucide-react';
import { markDocumentsReviewed } from './actions';
import { useDictionary } from '@/lib/i18n-context';

/**
 * Shown in the chat header when the conversation has an unreviewed inbound
 * document (documentPendingAt set by the WhatsApp webhook). Lets the team mark
 * the documents as reviewed; a new inbound document re-raises the alert.
 */
export function DocumentReviewBadge({ conversationId, pending }: { conversationId: string; pending: boolean }) {
    const dict = useDictionary();
    const t = dict.conversations || {};
    const [isPending, startTransition] = useTransition();
    const [dismissed, setDismissed] = useState(false);

    if (!pending || dismissed) return null;

    const handleReview = () => {
        startTransition(async () => {
            try {
                await markDocumentsReviewed(conversationId);
                setDismissed(true);
            } catch { /* keep the badge so the user can retry */ }
        });
    };

    return (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 pl-2.5 pr-1 py-1 text-xs font-medium">
            <FileWarning className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.docPendingBadge || 'Documento por revisar'}</span>
            <button
                type="button"
                onClick={handleReview}
                disabled={isPending}
                className="flex items-center gap-1 rounded-full bg-white/80 hover:bg-white text-amber-800 px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-60"
            >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                {t.markDocsReviewed || 'Marcar revisado'}
            </button>
        </div>
    );
}
