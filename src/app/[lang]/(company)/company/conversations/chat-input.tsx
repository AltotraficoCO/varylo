'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Send, Paperclip, X, FileText, Image as ImageIcon,
    AlertTriangle, Loader2, ChevronLeft, Mic, Square,
} from "lucide-react";
import { sendMessage, sendMediaMessage } from './actions';
import { useRealtimeData } from './realtime-context';
import { getWhatsAppTemplates, sendTemplateMessage } from '@/lib/template-actions';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB (WhatsApp limit)
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RECORDING_MS = 120_000; // 2 minutes max

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
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

function getAllAcceptedTypes(): string {
    return Object.values(ACCEPTED_TYPES).flat().join(',');
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

interface TemplateComponent {
    type: string;
    text?: string;
    format?: string;
    parameters?: { type: string; text?: string }[];
    example?: { body_text?: string[][] };
}

interface Template {
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

interface ChatInputProps {
    conversationId: string;
    channelType?: string;
    contactId?: string;
}

export default function ChatInput({ conversationId, channelType, contactId }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const { markAsRead, conversations } = useRealtimeData();
    const markedRef = useRef(false);

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Template state
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateError, setTemplateError] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [paramValues, setParamValues] = useState<Record<string, string>>({});
    const [sendingTemplate, setSendingTemplate] = useState(false);
    const [templateStep, setTemplateStep] = useState<'list' | 'params'>('list');

    // Compute window expired status
    const isWhatsApp = channelType === 'WHATSAPP';
    const conv = conversations.find(c => c.id === conversationId);
    const lastInboundAt = conv?.lastInboundAt;

    const isWindowExpired = isWhatsApp && (
        !lastInboundAt ||
        (Date.now() - new Date(lastInboundAt).getTime()) > WINDOW_MS
    );

    // Reset state when switching conversations
    useEffect(() => {
        markedRef.current = false;
        setSelectedFile(null);
        setFilePreview(null);
        setShowTemplateSelector(false);
        setSelectedTemplate(null);
        setParamValues({});
        setTemplateStep('list');
        stopRecording();
    }, [conversationId]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (filePreview && filePreview.startsWith('blob:')) {
                URL.revokeObjectURL(filePreview);
            }
            stopRecording();
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

    // --- Voice Recording ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Priority: mp4 (WhatsApp + all browsers) > ogg (WhatsApp + Firefox) > webm (fallback)
            const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
                ? 'audio/mp4'
                : MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
                    ? 'audio/ogg; codecs=opus'
                    : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
                        ? 'audio/webm; codecs=opus'
                        : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                // Handled in stopAndSend
            };

            recorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setRecordingDuration(0);

            // Duration timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= MAX_RECORDING_MS / 1000) {
                        stopAndSendRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch {
            alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
        }
    };

    const stopRecording = () => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsRecording(false);
        setRecordingDuration(0);
    };

    const cancelRecording = () => {
        audioChunksRef.current = [];
        stopRecording();
    };

    const stopAndSendRecording = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

        return new Promise<void>((resolve) => {
            const recorder = mediaRecorderRef.current!;

            recorder.onstop = async () => {
                stopRecording();

                const chunks = audioChunksRef.current;
                if (chunks.length === 0) { resolve(); return; }

                const mimeType = recorder.mimeType || 'audio/ogg';
                const blob = new Blob(chunks, { type: mimeType });
                audioChunksRef.current = [];

                if (blob.size > MAX_FILE_SIZE) {
                    alert('La nota de voz excede el límite de 16MB.');
                    resolve();
                    return;
                }

                // Convert to base64 and send
                setIsSending(true);
                try {
                    const buffer = await blob.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    const cleanMime = mimeType.split(';')[0]; // "audio/mp4" or "audio/ogg" or "audio/webm"
                    const ext = cleanMime.includes('mp4') ? 'm4a'
                        : cleanMime.includes('ogg') ? 'ogg'
                        : 'webm';
                    const dataUrl = `data:${cleanMime};base64,${base64}`;
                    const fileName = `voice-note-${Date.now()}.${ext}`;

                    const result = await sendMediaMessage(
                        conversationId,
                        '',
                        dataUrl,
                        'audio',
                        cleanMime,
                        fileName
                    );

                    if (result.success) {
                        router.refresh();
                    } else if (result.windowExpired) {
                        setShowTemplateSelector(true);
                    } else {
                        alert(result.message || 'Error al enviar nota de voz');
                    }
                } catch (error) {
                    console.error('Error sending voice note:', error);
                    alert('Error al enviar la nota de voz.');
                } finally {
                    setIsSending(false);
                }
                resolve();
            };

            recorder.stop();
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!message.trim() && !selectedFile) || isSending) return;

        setIsSending(true);
        try {
            let result: any;

            if (selectedFile) {
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
            } else if (result.windowExpired) {
                setShowTemplateSelector(true);
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

    // Template functions
    const loadTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        setTemplateError('');
        const result = await getWhatsAppTemplates();
        if (result.success && result.templates) {
            setTemplates(result.templates);
        } else {
            setTemplateError(result.error || 'Error desconocido');
        }
        setLoadingTemplates(false);
    }, []);

    const handleOpenTemplateSelector = () => {
        setShowTemplateSelector(true);
        setTemplateStep('list');
        setSelectedTemplate(null);
        setParamValues({});
        if (templates.length === 0) {
            loadTemplates();
        }
    };

    const getBodyParams = (template: Template): string[] => {
        const bodyComponent = template.components.find((c) => c.type === 'BODY');
        if (!bodyComponent?.text) return [];
        const matches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
        if (!matches) return [];
        return [...new Set(matches)].sort();
    };

    const getPreviewText = (template: Template): string => {
        const bodyComponent = template.components.find((c) => c.type === 'BODY');
        if (!bodyComponent?.text) return '';
        let text = bodyComponent.text;
        const params = getBodyParams(template);
        params.forEach((p) => {
            const idx = p.replace(/[{}]/g, '');
            const value = paramValues[idx] || p;
            text = text.replace(p, value);
        });
        return text;
    };

    const handleSelectTemplate = (t: Template) => {
        setSelectedTemplate(t);
        setParamValues({});
        const params = getBodyParams(t);
        if (params.length > 0) {
            setTemplateStep('params');
        }
    };

    const handleSendTemplate = async () => {
        if (!selectedTemplate || !contactId) return;

        setSendingTemplate(true);

        const bodyParams = getBodyParams(selectedTemplate);
        const components: any[] = [];
        if (bodyParams.length > 0) {
            components.push({
                type: 'body',
                parameters: bodyParams.map((p) => ({
                    type: 'text',
                    text: paramValues[p.replace(/[{}]/g, '')] || '',
                })),
            });
        }

        const result = await sendTemplateMessage({
            contactId,
            templateName: selectedTemplate.name,
            templateLanguage: selectedTemplate.language,
            templateComponents: components,
            templateBody: getPreviewText(selectedTemplate),
        });

        setSendingTemplate(false);

        if (result.success) {
            setShowTemplateSelector(false);
            setSelectedTemplate(null);
            setParamValues({});
            setTemplateStep('list');
            router.refresh();
        } else {
            alert(result.error || 'Error al enviar plantilla');
        }
    };

    // Show expired window banner + template selector for WhatsApp
    if (isWindowExpired) {
        return (
            <div className="p-4 border-t bg-background">
                {!showTemplateSelector ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-4 py-2.5 rounded-lg w-full">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <div className="text-sm">
                                <p>La ventana de 24 horas ha expirado. Para volver a escribir a este contacto debes usar una <strong>plantilla aprobada</strong> de WhatsApp.</p>
                                {lastInboundAt && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Último mensaje del cliente: {new Date(lastInboundAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })} a las {new Date(lastInboundAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button onClick={handleOpenTemplateSelector} className="w-full" variant="default">
                            <Send className="h-4 w-4 mr-2" />
                            Enviar plantilla
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">
                                {templateStep === 'list' ? 'Seleccionar plantilla' : 'Completar parámetros'}
                            </h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (templateStep === 'params') {
                                        setTemplateStep('list');
                                        setSelectedTemplate(null);
                                    } else {
                                        setShowTemplateSelector(false);
                                    }
                                }}
                            >
                                {templateStep === 'params' ? (
                                    <><ChevronLeft className="h-4 w-4 mr-1" /> Atrás</>
                                ) : (
                                    <><X className="h-4 w-4 mr-1" /> Cerrar</>
                                )}
                            </Button>
                        </div>

                        {templateStep === 'list' && (
                            <>
                                {loadingTemplates ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">Cargando plantillas...</span>
                                    </div>
                                ) : templateError ? (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-destructive">{templateError}</p>
                                        <Button variant="outline" size="sm" className="mt-2" onClick={loadTemplates}>
                                            Reintentar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                                        {templates.map((t) => {
                                            const body = t.components.find((c) => c.type === 'BODY');
                                            const isSelected = selectedTemplate?.name === t.name && selectedTemplate?.language === t.language;
                                            return (
                                                <button
                                                    key={`${t.name}-${t.language}`}
                                                    className={cn(
                                                        'w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors',
                                                        isSelected && 'bg-primary/5 border-l-2 border-primary'
                                                    )}
                                                    onClick={() => handleSelectTemplate(t)}
                                                >
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span className="font-medium text-sm">{t.name}</span>
                                                        <Badge variant="outline" className="text-[10px] px-1 h-4">
                                                            {t.language}
                                                        </Badge>
                                                    </div>
                                                    {body?.text && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 pl-5">
                                                            {body.text}
                                                        </p>
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {templates.length === 0 && (
                                            <p className="text-xs text-muted-foreground p-3 text-center">
                                                No hay plantillas aprobadas.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {selectedTemplate && getBodyParams(selectedTemplate).length === 0 && (
                                    <Button onClick={handleSendTemplate} disabled={sendingTemplate} className="w-full">
                                        {sendingTemplate ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-2" />
                                        )}
                                        {sendingTemplate ? 'Enviando...' : 'Enviar plantilla'}
                                    </Button>
                                )}
                            </>
                        )}

                        {templateStep === 'params' && selectedTemplate && (
                            <>
                                <div className="space-y-2">
                                    {getBodyParams(selectedTemplate).map((p) => {
                                        const idx = p.replace(/[{}]/g, '');
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <Label className="text-xs">Parámetro {idx}</Label>
                                                <Input
                                                    placeholder={`Valor para ${p}`}
                                                    value={paramValues[idx] || ''}
                                                    onChange={(e) =>
                                                        setParamValues((prev) => ({ ...prev, [idx]: e.target.value }))
                                                    }
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="border rounded-md p-2.5 bg-muted/50">
                                    <p className="text-xs text-muted-foreground mb-1">Vista previa</p>
                                    <p className="text-sm whitespace-pre-wrap">{getPreviewText(selectedTemplate)}</p>
                                </div>

                                <Button onClick={handleSendTemplate} disabled={sendingTemplate} className="w-full">
                                    {sendingTemplate ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    {sendingTemplate ? 'Enviando...' : 'Enviar plantilla'}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Normal chat input
    return (
        <div className="bg-white py-3 px-5">
            {/* File preview */}
            {selectedFile && (
                <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-[#F4F4F5] text-sm">
                    {filePreview ? (
                        <img src={filePreview} alt="Preview" className="h-12 w-12 rounded object-cover" />
                    ) : selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="h-8 w-8 text-[#71717A]" />
                    ) : (
                        <FileText className="h-8 w-8 text-[#71717A]" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-[#09090B]">{selectedFile.name}</p>
                        <p className="text-xs text-[#71717A]">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                        </p>
                    </div>
                    <button type="button" onClick={removeFile} className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-[#E4E4E7] transition-colors">
                        <X className="h-4 w-4 text-[#71717A]" />
                    </button>
                </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
                <div className="mb-3 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-red-700 flex-1">
                        Grabando... {formatDuration(recordingDuration)}
                    </span>
                    <button
                        type="button"
                        onClick={cancelRecording}
                        className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={stopAndSendRecording}
                        disabled={isSending}
                        className="h-9 w-9 rounded-full bg-[#10B981] hover:bg-[#059669] flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                        {isSending ? (
                            <Loader2 className="h-[18px] w-[18px] animate-spin text-white" />
                        ) : (
                            <Send className="h-[18px] w-[18px] text-white" />
                        )}
                    </button>
                </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={getAllAcceptedTypes()}
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {/* Attach button - circular, bg #F4F4F5 */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isRecording}
                    className="h-9 w-9 shrink-0 rounded-full bg-[#F4F4F5] flex items-center justify-center hover:bg-[#E4E4E7] transition-colors disabled:opacity-50"
                >
                    <Paperclip className="h-[18px] w-[18px] text-[#71717A]" />
                </button>

                {/* Input field - bg #FAFAFA, border #E4E4E7 */}
                <input
                    value={message}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSend(e); } }}
                    placeholder={selectedFile ? "Agrega un mensaje (opcional)..." : "Escribe un mensaje..."}
                    className="flex-1 bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg py-2.5 px-3.5 text-[14px] text-[#09090B] placeholder:text-[#A1A1AA] outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/20 transition-colors disabled:opacity-50"
                    disabled={isSending || isRecording}
                />

                {/* Mic button - circular, bg #F4F4F5, shows when empty */}
                {!message.trim() && !selectedFile && !isRecording && (
                    <button
                        type="button"
                        onClick={startRecording}
                        disabled={isSending}
                        className="h-9 w-9 shrink-0 rounded-full bg-[#F4F4F5] flex items-center justify-center hover:bg-[#E4E4E7] transition-colors disabled:opacity-50"
                        title="Grabar nota de voz"
                    >
                        <Mic className="h-[18px] w-[18px] text-[#71717A]" />
                    </button>
                )}

                {/* Send button - circular, green #10B981, shows when there's content */}
                {(message.trim() || selectedFile) && (
                    <button
                        type="submit"
                        disabled={isSending || isRecording}
                        className="h-9 w-9 shrink-0 rounded-full bg-[#10B981] hover:bg-[#059669] flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                        <Send className="h-[18px] w-[18px] text-white" />
                    </button>
                )}
            </form>
        </div>
    );
}
