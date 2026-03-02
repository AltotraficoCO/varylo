'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ContactAvatar } from '@/components/contact-avatar';
import { Badge } from '@/components/ui/badge';
import { Instagram, Phone, Globe } from 'lucide-react';
import { UnreadDot } from './unread-dot';
import { ConversationListActions } from './conversation-list-actions';

interface ConversationItem {
    id: string;
    contact: { name: string | null; phone: string } | null;
    channel: { type: string } | null;
    messages: { content: string; createdAt: string | Date }[];
    assignedAgents: { id: string; name: string | null }[];
}

interface ConversationListProps {
    conversations: ConversationItem[];
    selectedId?: string;
    filter: string;
    isAgent: boolean;
}

export function ConversationList({ conversations, selectedId, filter, isAgent }: ConversationListProps) {
    return (
        <div className="flex-1 overflow-auto">
            {conversations.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground px-4 space-y-2">
                    <p className="font-medium">No hay conversaciones</p>
                    <p className="text-xs opacity-70">Las conversaciones aparecerán aquí.</p>
                </div>
            ) : (
                conversations.map((conv) => {
                    const lastMsg = conv.messages[0];
                    const isActive = conv.id === selectedId;
                    return (
                        <Link
                            key={conv.id}
                            href={`?filter=${filter}&conversationId=${conv.id}`}
                            className={cn(
                                "relative group flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors border-b last:border-0",
                                isActive && "bg-primary/5 border-l-4 border-l-primary pl-[13px]"
                            )}
                        >
                            <UnreadDot conversationId={conv.id} />
                            <ContactAvatar
                                name={conv.contact?.name}
                                phone={conv.contact?.phone}
                            />
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm truncate text-foreground">{conv.contact?.name || 'Usuario Desconocido'}</span>
                                    <div className="flex items-center gap-1 ml-2">
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                        {!isAgent && <ConversationListActions conversationId={conv.id} />}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground truncate mb-2">
                                    {lastMsg?.content || 'Nueva conversación'}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {conv.channel?.type === 'INSTAGRAM' ? (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-pink-200 text-pink-600 bg-pink-50 font-normal flex items-center gap-1">
                                            <Instagram className="h-3 w-3" /> Instagram
                                        </Badge>
                                    ) : conv.channel?.type === 'WHATSAPP' ? (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-200 text-green-600 bg-green-50 font-normal flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> WhatsApp
                                        </Badge>
                                    ) : conv.channel?.type === 'WEB_CHAT' ? (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-200 text-blue-600 bg-blue-50 font-normal flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> Web Chat
                                        </Badge>
                                    ) : conv.channel?.type ? (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-gray-200 text-gray-500 font-normal">
                                            {conv.channel.type}
                                        </Badge>
                                    ) : null}
                                    {conv.assignedAgents && conv.assignedAgents.length > 0 && (
                                        <div className="flex -space-x-2">
                                            {conv.assignedAgents.slice(0, 3).map(agent => (
                                                <Avatar key={agent.id} className="h-5 w-5 border-2 border-white ring-1 ring-gray-100">
                                                    <AvatarFallback className="text-[9px] font-medium bg-blue-100 text-blue-700">
                                                        {agent.name?.[0]?.toUpperCase() || 'A'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {conv.assignedAgents.length > 3 && (
                                                <div className="h-5 w-5 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center ring-1 ring-gray-100">
                                                    <span className="text-[8px] font-medium text-gray-500">+{conv.assignedAgents.length - 3}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })
            )}
        </div>
    );
}
