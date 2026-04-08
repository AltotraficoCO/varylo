'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { reopenConversation } from './actions';
import { useDictionary } from '@/lib/i18n-context';

export function ReopenBanner({ conversationId }: { conversationId: string }) {
    const [isReopening, setIsReopening] = useState(false);
    const router = useRouter();
    const params = useParams();
    const lang = params.lang as string;
    const dict = useDictionary();
    const t = dict.conversations || {};
    const ui = dict.ui || {};

    const handleReopen = async () => {
        setIsReopening(true);
        try {
            const result = await reopenConversation(conversationId);
            if (result.success) {
                router.push(`/${lang}/company/conversations?filter=mine&conversationId=${conversationId}`);
                router.refresh();
            } else {
                alert(result.message || t.errorReopening);
            }
        } catch {
            alert(t.unexpectedErrorReopen);
        } finally {
            setIsReopening(false);
        }
    };

    return (
        <div className="p-4 bg-card border-t">
            <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{t.closedBanner}</span>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100" disabled={isReopening}>
                            {isReopening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            {t.reopen}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t.reopenConfirm}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t.reopenConfirmDesc}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{ui.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReopen} disabled={isReopening}>
                                {isReopening ? t.reopening : t.reopen}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
