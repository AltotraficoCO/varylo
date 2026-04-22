'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SendTemplateDialog } from '../contacts/send-template-dialog';
import { useDictionary } from '@/lib/i18n-context';

interface Contact {
    id: string;
    name: string | null;
    phone: string;
}

export function NewConversationButton({
    contacts,
    lang,
}: {
    contacts: Contact[];
    lang: string;
}) {
    const [open, setOpen] = useState(false);
    const dict = useDictionary();
    const t = dict.conversations || {};

    return (
        <>
            <Button
                size="icon-sm"
                variant="outline"
                onClick={() => setOpen(true)}
                title={t.newConversation}
            >
                <Plus className="h-4 w-4" />
            </Button>
            <SendTemplateDialog
                open={open}
                onOpenChange={setOpen}
                contacts={contacts}
                lang={lang}
            />
        </>
    );
}
