'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download, Play, Pause, AlertCircle } from 'lucide-react';

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

function AudioPlayer({ src, mimeType, isOutbound }: { src: string; mimeType?: string | null; isOutbound: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [error, setError] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch audio as Blob to bypass CORS and Content-Type issues
    useEffect(() => {
        let cancelled = false;
        async function loadAudio() {
            try {
                setLoading(true);
                const res = await fetch(src);
                if (!res.ok) throw new Error('fetch failed');
                const blob = await res.blob();
                // Create blob with explicit MIME type for better browser compatibility
                const type = mimeType?.split(';')[0] || blob.type || 'audio/ogg';
                const typedBlob = new Blob([blob], { type });
                if (!cancelled) {
                    setBlobUrl(URL.createObjectURL(typedBlob));
                }
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadAudio();
        return () => {
            cancelled = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    function formatTime(s: number) {
        if (!s || !isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function togglePlay() {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
            a.play().catch(() => setError(true));
        } else {
            a.pause();
        }
    }

    function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
        const a = audioRef.current;
        if (!a || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        a.currentTime = pct * duration;
    }

    if (error) {
        return (
            <a
                href={src}
                download
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs",
                    isOutbound
                        ? "border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                        : "border-border hover:bg-muted"
                )}
            >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Audio no compatible — toca para descargar</span>
                <Download className="h-4 w-4 shrink-0" />
            </a>
        );
    }

    if (loading || !blobUrl) {
        return (
            <div className="flex items-center gap-2 min-w-[220px]">
                <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    isOutbound ? "bg-primary-foreground/20" : "bg-primary/10"
                )}>
                    <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-muted/50" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 min-w-[220px]">
            <audio
                ref={audioRef}
                src={blobUrl}
                preload="metadata"
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setProgress(0); }}
                onError={() => setError(true)}
            />
            <button
                onClick={togglePlay}
                className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    isOutbound
                        ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                        : "bg-primary/10 hover:bg-primary/20 text-primary"
                )}
            >
                {playing
                    ? <Pause className="h-3.5 w-3.5" />
                    : <Play className="h-3.5 w-3.5 ml-0.5" />
                }
            </button>
            <div className="flex-1 flex flex-col gap-0.5">
                <div
                    className="h-1.5 rounded-full bg-muted/50 cursor-pointer relative overflow-hidden"
                    onClick={handleSeek}
                >
                    <div
                        className={cn(
                            "h-full rounded-full transition-all",
                            isOutbound ? "bg-primary-foreground/60" : "bg-primary/60"
                        )}
                        style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
                    />
                </div>
                <span className={cn(
                    "text-[10px]",
                    isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                    {playing ? formatTime(progress) : formatTime(duration)}
                </span>
            </div>
        </div>
    );
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
            return <AudioPlayer src={src} mimeType={msg.mimeType} isOutbound={isOutbound} />;

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
