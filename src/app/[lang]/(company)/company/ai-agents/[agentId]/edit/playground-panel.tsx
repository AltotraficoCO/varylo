'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, RotateCcw, Loader2, FlaskConical, AlertTriangle, Paperclip, X, FileText } from 'lucide-react';

type Attachment = { dataUrl: string; fileName: string; mimeType: string; isImage: boolean };
type MsgAttachment = { name: string; isImage: boolean; previewUrl?: string };
type ChatMessage = { id: string; role: 'user' | 'agent'; content: string; attachment?: MsgAttachment };

const MAX_FILE_BYTES = 3 * 1024 * 1024;

interface PlaygroundPanelProps {
    agentId: string;
}

export function PlaygroundPanel({ agentId }: PlaygroundPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [attachment, setAttachment] = useState<Attachment | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading]);

    function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
            setError('El archivo es muy grande para la prueba (máx. 3 MB).');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const mimeType = file.type || 'application/octet-stream';
            setError(null);
            setAttachment({
                dataUrl: String(reader.result),
                fileName: file.name,
                mimeType,
                isImage: mimeType.startsWith('image/'),
            });
        };
        reader.readAsDataURL(file);
    }

    async function send() {
        const content = input.trim();
        if ((!content && !attachment) || loading) return;

        setError(null);
        const localId = `u-${messages.length}-${content.length}`;
        const sentAttachment = attachment;
        setMessages(prev => [...prev, {
            id: localId,
            role: 'user',
            content,
            attachment: sentAttachment
                ? { name: sentAttachment.fileName, isImage: sentAttachment.isImage, previewUrl: sentAttachment.isImage ? sentAttachment.dataUrl : undefined }
                : undefined,
        }]);
        setInput('');
        setAttachment(null);
        setLoading(true);

        try {
            const res = await fetch(`/api/ai-agents/${agentId}/playground`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conversationIdRef.current,
                    content,
                    media: sentAttachment
                        ? { dataUrl: sentAttachment.dataUrl, fileName: sentAttachment.fileName, mimeType: sentAttachment.mimeType }
                        : undefined,
                }),
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
        setAttachment(null);
    }

    const canSend = !loading && (!!input.trim() || !!attachment);

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
                    disabled={messages.length === 0 && !error && !attachment}
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
                        <p className="text-[13px]">Escribe un mensaje o adjunta un archivo</p>
                        <p className="text-[12px] mt-0.5">como si fueras un cliente, y mira cómo responde el agente.</p>
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
                            {m.attachment && (
                                <div className="mb-1.5">
                                    {m.attachment.isImage && m.attachment.previewUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.attachment.previewUrl} alt={m.attachment.name} className="max-h-40 rounded-lg" />
                                    ) : (
                                        <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] ${m.role === 'user' ? 'bg-white/20' : 'bg-[#F4F4F5]'}`}>
                                            <FileText className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{m.attachment.name}</span>
                                        </div>
                                    )}
                                </div>
                            )}
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

            {/* Selected attachment chip */}
            {attachment && (
                <div className="flex items-center gap-2 px-4 pt-3 -mb-1">
                    <div className="flex items-center gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-1.5 text-[12px] text-[#3F3F46] max-w-full">
                        {attachment.isImage
                            ? <img src={attachment.dataUrl} alt="" className="h-6 w-6 rounded object-cover" />
                            : <FileText className="h-4 w-4 text-[#71717A] shrink-0" />}
                        <span className="truncate max-w-[200px]">{attachment.fileName}</span>
                        <button type="button" onClick={() => setAttachment(null)} className="text-[#A1A1AA] hover:text-[#EF4444]">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 p-3 border-t border-[#F4F4F5]">
                <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile}
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    title="Adjuntar archivo"
                    className="h-10 w-10 p-0 rounded-lg border-[#E4E4E7] text-[#71717A] shrink-0"
                >
                    <Paperclip className="h-4 w-4" />
                </Button>
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
                    disabled={!canSend}
                    className="h-10 w-10 p-0 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white shrink-0"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
