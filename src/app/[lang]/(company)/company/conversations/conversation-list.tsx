'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ContactAvatar } from '@/components/contact-avatar';
import { Badge } from '@/components/ui/badge';
import { Instagram, Phone, Globe, Bot, FileWarning } from 'lucide-react';
import { UnreadDot } from './unread-dot';
import { ConversationListActions } from './conversation-list-actions';
import { useDictionary } from '@/lib/i18n-context';

interface ConversationItem {
    id: string;
    status: string;
    contact: { name: string | null; phone: string } | null;
    channel: { type: string; configJson?: { label?: string; phoneDisplay?: string } | null } | null;
    messages: { content: string; createdAt: string | Date }[];
    assignedAgents: { id: string; name: string | null }[];
    handledByAiAgent?: { id: string; name: string } | null;
    documentPendingAt?: string | Date | null;
}

interface ConversationListProps {
    conversations: ConversationItem[];
    selectedId?: string;
    filter: string;
    isAgent: boolean;
    tag?: string;
    agent?: string;
    channel?: string;
}

export function ConversationList({ conversations, selectedId, filter, isAgent, tag, agent, channel }: ConversationListProps) {
    const dict = useDictionary();
    const t = dict.conversations || {};

    // Preserve the active filters (tag, agent, number) when opening a conversation.
    const buildHref = (conversationId: string) => {
        const qs = new URLSearchParams();
        if (filter) qs.set('filter', filter);
        if (tag) qs.set('tag', tag);
        if (agent) qs.set('agent', agent);
        if (channel) qs.set('channel', channel);
        qs.set('conversationId', conversationId);
        return `?${qs.toString()}`;
    };

    return (
        <div className="flex-1 overflow-auto">
            {conversations.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground px-4 space-y-2">
                    <p className="font-medium">{t.noConversations}</p>
                    <p className="text-xs opacity-70">{t.conversationsAppearHere}</p>
                </div>
            ) : (
                conversations.map((conv) => {
                    const lastMsg = conv.messages[0];
                    const isActive = conv.id === selectedId;
                    return (
                        <Link
                            key={conv.id}
                            href={buildHref(conv.id)}
                            className={cn(
                                "relative group flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors border-b border-[#F4F4F5] last:border-0",
                                !isActive && conv.documentPendingAt && "bg-amber-50/70 hover:bg-amber-50",
                                isActive && "bg-[#ECFDF5] hover:bg-[#ECFDF5] border-l-[3px] border-l-primary pl-[13px]"
                            )}
                        >
                            <UnreadDot conversationId={conv.id} />
                            <ContactAvatar
                                name={conv.contact?.name}
                                phone={conv.contact?.phone}
                            />
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm truncate text-foreground">{conv.contact?.name || t.unknownUser}</span>
                                    <div className="flex items-center gap-1 ml-2">
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                        <ConversationListActions conversationId={conv.id} status={conv.status} isAgent={isAgent} />
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground truncate mb-2">
                                    {lastMsg?.content || t.newConversation}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {conv.channel?.type === 'INSTAGRAM' ? (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-pink-200 text-pink-600 bg-pink-50 font-normal flex items-center gap-1">
                                            <Instagram className="h-3 w-3" /> Instagram
                                        </Badge>
                                    ) : conv.channel?.type === 'WHATSAPP' ? (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-200 text-green-600 bg-green-50 font-normal flex items-center gap-1 max-w-[160px]">
                                            <Phone className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{conv.channel.configJson?.label?.trim() || conv.channel.configJson?.phoneDisplay || 'WhatsApp'}</span>
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
                                    {conv.documentPendingAt && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-300 text-amber-700 bg-amber-50 font-medium flex items-center gap-1">
                                            <FileWarning className="h-3 w-3" /> {t.docPendingBadge || 'Doc. por revisar'}
                                        </Badge>
                                    )}
                                    {conv.handledByAiAgent && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-purple-200 text-purple-600 bg-purple-50 font-normal flex items-center gap-1">
                                            <Bot className="h-3 w-3" /> {conv.handledByAiAgent.name}
                                        </Badge>
                                    )}
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
