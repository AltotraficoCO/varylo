'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, Loader2, Search } from 'lucide-react';
import { getQuickRepliesForChat } from '../settings/quick-replies/actions';

interface QuickReply {
    id: string;
    shortcut: string;
    content: string;
}

interface Props {
    onPick: (content: string) => void;
    disabled?: boolean;
}

export function QuickReplyButton({ onPick, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<QuickReply[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        if (items !== null) return;
        setLoading(true);
        getQuickRepliesForChat()
            .then((data) => setItems(data))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [open, items]);

    useEffect(() => {
        if (!open) return;
        function onClickOutside(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    const filtered = (items ?? []).filter((r) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return r.shortcut.toLowerCase().includes(q) || r.content.toLowerCase().includes(q);
    });

    function refresh() {
        setItems(null);
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                disabled={disabled}
                title="Respuestas rápidas"
                className="h-9 w-9 shrink-0 rounded-full bg-[#F4F4F5] flex items-center justify-center hover:bg-[#E4E4E7] transition-colors disabled:opacity-50"
            >
                <Zap className="h-[18px] w-[18px] text-[#71717A]" />
            </button>

            {open && (
                <div className="absolute bottom-12 left-0 z-50 w-80 max-h-96 bg-white rounded-lg border shadow-lg flex flex-col overflow-hidden">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={refresh}
                                placeholder="Buscar respuesta..."
                                autoFocus
                                className="w-full pl-8 pr-2 py-2 text-sm rounded-md bg-[#FAFAFA] border border-[#E4E4E7] outline-none focus:border-[#10B981]"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading && (
                            <div className="py-8 flex justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!loading && filtered.length === 0 && (
                            <div className="py-8 text-center text-xs text-muted-foreground px-4">
                                {items && items.length === 0
                                    ? 'Aún no hay respuestas rápidas. Créalas en Ajustes → Respuestas rápidas.'
                                    : 'Sin resultados.'}
                            </div>
                        )}
                        {!loading && filtered.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                    onPick(r.content);
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[#F4F4F5] transition-colors border-b last:border-b-0"
                            >
                                <div className="flex items-center gap-2 mb-0.5">
                                    <code className="text-[11px] font-semibold bg-muted px-1.5 py-0.5 rounded">
                                        {r.shortcut}
                                    </code>
                                </div>
                                <p className="text-xs text-foreground line-clamp-2 break-words">
                                    {r.content}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
