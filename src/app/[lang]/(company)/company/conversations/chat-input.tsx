'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { sendMessage } from './actions';

export default function ChatInput({ conversationId }: { conversationId: string }) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const router = useRouter();

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending) return;

        setIsSending(true);
        try {
            const result = await sendMessage(conversationId, message);
            if (result.success) {
                setMessage('');
                router.refresh();
            } else {
                alert(result.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('An unexpected error occurred.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-4 border-t bg-background">
            <form onSubmit={handleSend} className="flex gap-2">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                    disabled={isSending}
                />
                <Button
                    type="submit"
                    disabled={isSending || !message.trim()}
                    size="icon"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
