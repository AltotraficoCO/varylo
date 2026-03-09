'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { sendMessage, sendMediaMessage } from './actions';
import { useRealtimeData } from './realtime-context';

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB (WhatsApp limit)

const ACCEPTED_TYPES: Record<string, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/webp'],
    video: ['video/mp4', 'video/3gpp'],
    audio: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
    ],
};

function getMediaType(mimeType: string): string {
    for (const [type, mimes] of Object.entries(ACCEPTED_TYPES)) {
        if (mimes.includes(mimeType)) return type;
    }
    // Fallback by prefix
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

function getAllAcceptedTypes(): string {
    return Object.values(ACCEPTED_TYPES).flat().join(',');
}

export default function ChatInput({ conversationId }: { conversationId: string }) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const { markAsRead } = useRealtimeData();
    const markedRef = useRef(false);

    // Reset marked flag when switching conversations
    useEffect(() => {
        markedRef.current = false;
        setSelectedFile(null);
        setFilePreview(null);
    }, [conversationId]);

    // Cleanup file preview URL
    useEffect(() => {
        return () => {
            if (filePreview && filePreview.startsWith('blob:')) {
                URL.revokeObjectURL(filePreview);
            }
        };
    }, [filePreview]);

    const handleChange = (value: string) => {
        setMessage(value);
        if (!markedRef.current && value.length > 0) {
            markedRef.current = true;
            markAsRead(conversationId);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert('El archivo excede el límite de 16MB.');
            return;
        }

        setSelectedFile(file);

        // Generate preview for images
        if (file.type.startsWith('image/')) {
            setFilePreview(URL.createObjectURL(file));
        } else {
            setFilePreview(null);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (filePreview && filePreview.startsWith('blob:')) {
            URL.revokeObjectURL(filePreview);
        }
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!message.trim() && !selectedFile) || isSending) return;

        setIsSending(true);
        try {
            let result;

            if (selectedFile) {
                // Convert file to base64 data URL for server action
                const buffer = await selectedFile.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                const dataUrl = `data:${selectedFile.type};base64,${base64}`;
                const mediaType = getMediaType(selectedFile.type);

                result = await sendMediaMessage(conversationId, message, dataUrl, mediaType, selectedFile.type, selectedFile.name);
                removeFile();
            } else {
                result = await sendMessage(conversationId, message);
            }

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
            {/* File preview */}
            {selectedFile && (
                <div className="mb-2 flex items-center gap-2 p-2 rounded-lg bg-muted text-sm">
                    {filePreview ? (
                        <img src={filePreview} alt="Preview" className="h-12 w-12 rounded object-cover" />
                    ) : selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    ) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeFile} className="h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={getAllAcceptedTypes()}
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    className="shrink-0"
                >
                    <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                    value={message}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={selectedFile ? "Agrega un mensaje (opcional)..." : "Escribe un mensaje..."}
                    className="flex-1"
                    disabled={isSending}
                />
                <Button
                    type="submit"
                    disabled={isSending || (!message.trim() && !selectedFile)}
                    size="icon"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
