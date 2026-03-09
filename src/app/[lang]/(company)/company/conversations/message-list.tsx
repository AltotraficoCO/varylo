'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download } from 'lucide-react';

interface Message {
    id: string;
    content: string;
    direction: string;
    createdAt: string | Date;
    mediaUrl?: string | null;
    mediaType?: string | null;
    mimeType?: string | null;
    fileName?: string | null;
}

/**
 * Resolve the display URL for a message's media.
 * - "wa:xxx" → proxy through /api/media?messageId=...
 * - "data:..." → use directly (outbound uploads)
 * - any other URL → use directly
 */
function resolveMediaSrc(msg: Message): string | null {
    if (!msg.mediaUrl) return null;
    if (msg.mediaUrl.startsWith('wa:')) {
        return `/api/media?messageId=${msg.id}`;
    }
    return msg.mediaUrl;
}

function MediaContent({ msg }: { msg: Message }) {
    const isOutbound = msg.direction === 'OUTBOUND';
    const src = resolveMediaSrc(msg);

    if (!src || !msg.mediaType) return null;

    switch (msg.mediaType) {
        case 'image':
        case 'sticker':
            return (
                <img
                    src={src}
                    alt={msg.fileName || 'Imagen'}
                    className={cn(
                        "rounded-lg max-w-full max-h-64 object-contain",
                        msg.mediaType === 'sticker' && "max-h-32"
                    )}
                    loading="lazy"
                />
            );

        case 'video':
            return (
                <video
                    src={src}
                    controls
                    className="rounded-lg max-w-full max-h-64"
                    preload="metadata"
                />
            );

        case 'audio':
            return (
                <audio
                    src={src}
                    controls
                    className="max-w-full min-w-[200px]"
                    preload="metadata"
                />
            );

        case 'document':
            return (
                <a
                    href={src}
                    download={msg.fileName || 'documento'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-sm",
                        isOutbound
                            ? "border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                            : "border-border hover:bg-muted"
                    )}
                >
                    <FileText className="h-8 w-8 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{msg.fileName || 'Documento'}</p>
                        <p className="text-xs opacity-70">{msg.mimeType || 'Archivo'}</p>
                    </div>
                    <Download className="h-4 w-4 shrink-0" />
                </a>
            );

        default:
            return null;
    }
}

export function MessageList({ messages }: { messages: Message[] }) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Scroll to bottom on initial mount (instant, no animation)
    useEffect(() => {
        bottomRef.current?.scrollIntoView();
    }, []);

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-muted/30">
            {messages.map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND';
                const hasMedia = msg.mediaUrl && msg.mediaType;
                const isPlaceholder = msg.content.startsWith('[') && msg.content.endsWith(']');

                return (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex w-full",
                            isOutbound ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                            className={cn(
                                "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                isOutbound
                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                    : "bg-card border rounded-bl-none text-foreground"
                            )}
                        >
                            {hasMedia && <MediaContent msg={msg} />}
                            {msg.content && !isPlaceholder && (
                                <p className={cn("whitespace-pre-wrap", hasMedia && "mt-1.5")}>
                                    {msg.content}
                                </p>
                            )}
                            <p className={cn(
                                "text-[10px] mt-1 text-right opacity-80",
                                isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}
