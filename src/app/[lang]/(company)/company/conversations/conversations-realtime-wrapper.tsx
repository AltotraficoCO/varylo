'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RealtimeProvider, type RealtimeConversation } from './realtime-context';

const POLL_INTERVAL = 5000;
const STORAGE_KEY = 'varylo_read_timestamps';

function getReadTimestamps(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function setReadTimestamp(conversationId: string) {
    const map = getReadTimestamps();
    map[conversationId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    // Notify other components (e.g. SidebarUnreadBadge) that read state changed
    window.dispatchEvent(new CustomEvent('varylo-read-update'));
}

export function ConversationsRealtimeWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('conversationId');

    const fingerprintRef = useRef<string | null>(null);
    const [conversations, setConversations] = useState<RealtimeConversation[]>([]);
    const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Pre-load audio
    useEffect(() => {
        audioRef.current = new Audio('/sounds/notification.wav');
        audioRef.current.volume = 0.5;
    }, []);

    // Mark selected conversation as read
    useEffect(() => {
        if (selectedId) {
            setReadTimestamp(selectedId);
            setUnreadMap(prev => {
                if (!prev[selectedId]) return prev;
                const next = { ...prev };
                delete next[selectedId];
                return next;
            });
        }
    }, [selectedId]);

    // Expose markAsRead so child components can mark conversations as read
    const markAsRead = useCallback((conversationId: string) => {
        setReadTimestamp(conversationId);
        setUnreadMap(prev => {
            if (!prev[conversationId]) return prev;
            const next = { ...prev };
            delete next[conversationId];
            return next;
        });
    }, []);

    const poll = useCallback(async () => {
        try {
            const res = await fetch('/api/conversations/updates');
            if (!res.ok) return;
            const data = await res.json();

            const newFingerprint: string = data.fingerprint;
            const newConversations: RealtimeConversation[] = data.conversations;

            // If the selected conversation got a new message, auto-mark it as read
            if (selectedId) {
                setReadTimestamp(selectedId);
            }

            // Compute unread map
            const readMap = getReadTimestamps();
            const newUnreadMap: Record<string, boolean> = {};
            for (const conv of newConversations) {
                const lastMsg = new Date(conv.lastMessageAt).getTime();
                const readAt = readMap[conv.id] || 0;
                if (lastMsg > readAt && conv.id !== selectedId) {
                    newUnreadMap[conv.id] = true;
                }
            }
            setUnreadMap(newUnreadMap);
            setConversations(newConversations);

            // If fingerprint changed, refresh server components and play sound
            if (fingerprintRef.current !== null && fingerprintRef.current !== newFingerprint) {
                router.refresh();
                // Only play sound if the change is NOT from the selected conversation
                const selectedConv = newConversations.find(c => c.id === selectedId);
                const wasSelectedUpdated = selectedConv && fingerprintRef.current !== null;
                const otherConvsChanged = Object.keys(newUnreadMap).length > 0;
                if (otherConvsChanged) {
                    try {
                        audioRef.current?.play().catch(() => { /* browser may block autoplay */ });
                    } catch { /* ignore */ }
                }
            }

            fingerprintRef.current = newFingerprint;
        } catch {
            // Silently ignore polling errors
        }
    }, [router, selectedId]);

    useEffect(() => {
        // Initial poll
        poll();
        const interval = setInterval(poll, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [poll]);

    const totalUnread = Object.keys(unreadMap).length;

    const value = useMemo(() => ({
        unreadMap, conversations, totalUnread, markAsRead,
    }), [unreadMap, conversations, totalUnread, markAsRead]);

    return (
        <RealtimeProvider value={value}>
            {children}
        </RealtimeProvider>
    );
}
