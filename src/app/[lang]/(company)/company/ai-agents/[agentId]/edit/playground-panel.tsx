'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, RotateCcw, Loader2, FlaskConical, AlertTriangle } from 'lucide-react';

type ChatMessage = { id: string; role: 'user' | 'agent'; content: string };

interface PlaygroundPanelProps {
    agentId: string;
}

export function PlaygroundPanel({ agentId }: PlaygroundPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading]);

    async function send() {
        const content = input.trim();
        if (!content || loading) return;

        setError(null);
        setInput('');
        const localId = `u-${messages.length}-${content.length}`;
        setMessages(prev => [...prev, { id: localId, role: 'user', content }]);
        setLoading(true);

        try {
            const res = await fetch(`/api/ai-agents/${agentId}/playground`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: conversationIdRef.current, content }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'No se pudo enviar el mensaje.');
                return;
            }

            conversationIdRef.current = data.conversationId;

            if (data.error) setError(data.error);

            const replies: ChatMessage[] = (data.responses || [])
                .filter((m: { direction: string }) => m.direction === 'OUTBOUND')
                .map((m: { id: string; content: string }) => ({ id: m.id, role: 'agent' as const, content: m.content }));

            if (replies.length === 0 && !data.error) {
                setError('El agente no generó respuesta. Verifica el prompt, los créditos o las API keys.');
            }

            setMessages(prev => [...prev, ...replies]);
        } catch {
            setError('Error de red. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        conversationIdRef.current = null;
        setMessages([]);
        setError(null);
        setInput('');
    }

    return (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F4F4F5] bg-[#FAFAFA] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-[#8B5CF6]" />
                    <h2 className="text-[15px] font-semibold text-[#09090B]">Probar agente</h2>
                </div>
                <button
                    type="button"
                    onClick={reset}
                    disabled={messages.length === 0 && !error}
                    className="flex items-center gap-1.5 text-[12px] text-[#71717A] hover:text-[#09090B] disabled:opacity-40 transition-colors"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
                </button>
            </div>

            {/* Warning banner */}
            <div className="flex items-start gap-2 px-6 py-3 bg-[#FFFBEB] border-b border-[#FEF3C7] text-[12px] text-[#92400E]">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p>
                    Las pruebas usan la <strong>versión guardada</strong> del agente y consumen créditos.
                    Las acciones se ejecutan de verdad: pueden crear pedidos, eventos de calendario y enviar al webhook.
                </p>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="h-[360px] overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFAFA]">
                {messages.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#A1A1AA]">
                        <FlaskConical className="h-8 w-8 mb-2 text-[#D4D4D8]" />
                        <p className="text-[13px]">Escribe un mensaje como si fueras un cliente</p>
                        <p className="text-[12px] mt-0.5">para ver cómo responde el agente.</p>
                    </div>
                )}

                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] whitespace-pre-wrap break-words ${
                                m.role === 'user'
                                    ? 'bg-[#10B981] text-white rounded-br-sm'
                                    : 'bg-white border border-[#E4E4E7] text-[#09090B] rounded-bl-sm'
                            }`}
                        >
                            {m.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-[#E4E4E7] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                            <Loader2 className="h-4 w-4 animate-spin text-[#A1A1AA]" />
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="px-4 py-2 bg-[#FEF2F2] border-t border-[#FECACA] text-[12px] text-[#DC2626]">
                    {error}
                </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 p-3 border-t border-[#F4F4F5]">
                <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    placeholder="Escribe un mensaje de prueba..."
                    disabled={loading}
                    className="h-10 rounded-lg border-[#E4E4E7] text-[14px] flex-1"
                />
                <Button
                    type="button"
                    onClick={send}
                    disabled={loading || !input.trim()}
                    className="h-10 w-10 p-0 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white shrink-0"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
