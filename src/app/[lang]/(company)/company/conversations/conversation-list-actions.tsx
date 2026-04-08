'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Trash2, RotateCcw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteConversation, reopenConversation } from './actions';
import { useDictionary } from '@/lib/i18n-context';

export function ConversationListActions({ conversationId, status, isAgent }: { conversationId: string; status: string; isAgent?: boolean }) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showReopenDialog, setShowReopenDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const router = useRouter();
    const dict = useDictionary();
    const t = dict.conversations || {};
    const ui = dict.ui || {};

    async function handleDelete() {
        setIsDeleting(true);
        const result = await deleteConversation(conversationId);
        setIsDeleting(false);
        if (result.success) {
            setShowDeleteDialog(false);
            router.refresh();
        }
    }

    async function handleReopen() {
        setIsReopening(true);
        const result = await reopenConversation(conversationId);
        setIsReopening(false);
        if (result.success) {
            setShowReopenDialog(false);
            router.refresh();
        }
    }

    const hasReopen = status === 'RESOLVED';
    const hasDelete = !isAgent;
    const hasAnyAction = hasReopen || hasDelete;

    if (!hasAnyAction) return null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.preventDefault()}
                >
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
                    {hasReopen && (
                        <DropdownMenuItem
                            className="text-amber-700 focus:text-amber-700"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowReopenDialog(true);
                            }}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {t.reopen}
                        </DropdownMenuItem>
                    )}
                    {hasDelete && (
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowDeleteDialog(true);
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {ui.delete}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.reopenConfirm}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.reopenConfirmDesc}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isReopening}>{ui.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReopen}
                            disabled={isReopening}
                        >
                            {isReopening ? t.reopening : t.reopen}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.deleteConfirmDesc}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{ui.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? ui.deleting : ui.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
