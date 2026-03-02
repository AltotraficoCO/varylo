'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    content: string;
    direction: string;
    createdAt: string | Date;
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
                            <p className="whitespace-pre-wrap">{msg.content}</p>
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
