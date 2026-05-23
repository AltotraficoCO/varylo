'use client';

import * as React from 'react';
import { ConversationRightSidebar } from './conversation-right-sidebar';
import { ContactAvatar } from '@/components/contact-avatar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles, User } from 'lucide-react';

interface CollapsibleRightSidebarProps {
    conversation: any;
    companyTags: any[];
    companyAgents: any[];
    isAgent?: boolean;
    insight?: any;
}

const STORAGE_KEY = 'conv-right-collapsed';

export function CollapsibleRightSidebar(props: CollapsibleRightSidebarProps) {
    const { conversation } = props;
    // Default to expanded; restore the user's last choice from localStorage.
    const [collapsed, setCollapsed] = React.useState(false);
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === '1') setCollapsed(true);
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    const toggle = React.useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const contact = conversation.contact || {};

    return (
        <div
            className={cn(
                'relative hidden lg:flex h-full shrink-0 border-l bg-muted/20',
                // Animate the width so the chat area grows/shrinks smoothly.
                hydrated ? 'transition-[width] duration-300 ease-in-out' : '',
                collapsed ? 'w-14' : 'w-[320px] xl:w-[350px]'
            )}
        >
            {collapsed ? (
                /* Collapsed rail — a slim, tappable column that re-opens the panel */
                <button
                    type="button"
                    onClick={toggle}
                    aria-label="Mostrar detalles del contacto"
                    title="Mostrar detalles"
                    className="group flex h-full w-full flex-col items-center gap-4 py-4 hover:bg-muted/50 transition-colors"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm group-hover:text-primary group-hover:border-primary/40 transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                    </span>
                    <ContactAvatar
                        name={contact.name}
                        phone={contact.phone}
                        imageUrl={contact.imageUrl}
                        className="h-9 w-9 border"
                    />
                    <span className="flex flex-col items-center gap-3 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <Sparkles className="h-4 w-4 text-purple-400" />
                    </span>
                    <span
                        className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70"
                        style={{ writingMode: 'vertical-rl' }}
                    >
                        Detalles
                    </span>
                </button>
            ) : (
                <>
                    {/* Collapse button — floats on the panel's left edge */}
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label="Ocultar detalles del contacto"
                        title="Ocultar detalles"
                        className="absolute -left-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-primary hover:border-primary/40 transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <ConversationRightSidebar
                        conversation={props.conversation}
                        companyTags={props.companyTags}
                        companyAgents={props.companyAgents}
                        isAgent={props.isAgent}
                        insight={props.insight}
                        className="flex w-full h-full border-l-0"
                    />
                </>
            )}
        </div>
    );
}
