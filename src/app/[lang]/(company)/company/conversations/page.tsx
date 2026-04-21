import { auth } from '@/auth';
import { prisma } from '@/lib/prisma'; // force re-sync after client generation

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContactAvatar } from "@/components/contact-avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Settings, Users, Tag, Inbox, Instagram, Phone, Globe, CheckCircle2, MessageSquare, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import ChatInput from './chat-input';
import { MessageList } from './message-list';
import { Role, ChannelType } from '@prisma/client';
import { getDictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/dictionary';

import { ConversationRightSidebar } from './conversation-right-sidebar';
import { ConversationsRealtimeWrapper } from './conversations-realtime-wrapper';
import { WindowTimer } from './window-timer';
import { ConversationList } from './conversation-list';
import { NewConversationButton } from './new-conversation-button';
import { ReopenBanner } from './reopen-banner';
import { ScrollableTabs } from './scrollable-tabs';

// Server Component receiving searchParams
export default async function ConversationsPage({
    searchParams,
    params: routeParams,
}: {
    searchParams: Promise<{ conversationId?: string; filter?: string; tag?: string }>;
    params: Promise<{ lang: string }>;
}) {
    const session = await auth();
    if (!session?.user?.companyId) return null;
    const userId = session.user.id;
    const userRole = session.user.role;
    const isAgent = userRole === Role.AGENT;

    const params = await searchParams;
    const selectedId = params?.conversationId;
    // Force 'mine' filter for agents if they try to access others, or default to 'mine'
    let filter = params?.filter || 'mine';
    const tag = params?.tag;

    if (isAgent && filter !== 'mine' && filter !== 'resolved') {
        filter = 'mine';
    }

    const { lang } = await routeParams;
    const dict = await getDictionary(lang as Locale);
    const t = dict.conversations || {};

    // Fetch Tags for Selector
    const companyTags = await prisma.tag.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { name: 'asc' }
    });

    // --- 1. Fetch Counts for Tabs ---
    // Efficiently fetch counts using Promise.all
    const [mineCount, unassignedCount, allCount, resolvedCount] = await Promise.all([
        prisma.conversation.count({
            where: { companyId: session.user.companyId, assignedAgents: { some: { id: userId } }, status: 'OPEN' }
        }),
        !isAgent ? prisma.conversation.count({
            where: { companyId: session.user.companyId, assignedAgents: { none: {} }, handledByAiAgentId: null, status: 'OPEN' }
        }) : Promise.resolve(0),
        !isAgent ? prisma.conversation.count({
            where: { companyId: session.user.companyId, status: 'OPEN' }
        }) : Promise.resolve(0),
        isAgent
            ? prisma.conversation.count({
                where: { companyId: session.user.companyId, assignedAgents: { some: { id: userId } }, status: 'RESOLVED' }
            })
            : prisma.conversation.count({
                where: { companyId: session.user.companyId, status: 'RESOLVED' }
            })
    ]);

    // --- 2. Fetch Filtered Conversations ---
    const where: any = {
        companyId: session.user.companyId,
        status: filter === 'resolved' ? 'RESOLVED' : 'OPEN'
    };

    if (filter === 'resolved') {
        if (isAgent) {
            where.assignedAgents = { some: { id: userId } };
        }
    } else if (filter === 'mine') {
        where.assignedAgents = { some: { id: userId } };
    } else if (filter === 'unassigned' && !isAgent) {
        where.assignedAgents = { none: {} };
        where.handledByAiAgentId = null;
    } else if (isAgent) {
        // Fallback safety: always filter by mine for agents
        where.assignedAgents = { some: { id: userId } };
    }

    if (tag) {
        where.tags = {
            some: {
                id: tag
            }
        };
    }

    const conversations = await prisma.conversation.findMany({
        where,
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            contact: true,
            assignedAgents: true,
            handledByAiAgent: { select: { id: true, name: true } },
            channel: true
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });


    // --- 3. Fetch Selected Conversation Data ---
    let selectedConversation = null;
    let messages: any[] = [];
    const companyAgents = await prisma.user.findMany({
        where: {
            companyId: session.user.companyId,
            active: true,
            role: { in: [Role.AGENT, Role.COMPANY_ADMIN] } // Show Admins too so they can assign to themselves
        },
        select: { id: true, name: true, email: true }
    });

    // Fetch contacts for "New conversation" button
    const contactsForTemplate = await prisma.contact.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
        take: 200,
    });

    if (selectedId) {
        // Enforce ownership check for agents
        const conversationCheck = await prisma.conversation.findUnique({
            where: { id: selectedId },
            include: { assignedAgents: true }
        });

        if (conversationCheck) {
            const isAssigned = conversationCheck.assignedAgents.some(a => a.id === userId);
            if (!isAgent || isAssigned) {
                const [convData, capturedData] = await Promise.all([
                    prisma.conversation.findUnique({
                        where: { id: selectedId },
                        include: {
                            contact: true,
                            messages: {
                                orderBy: { createdAt: 'asc' }
                            },
                            assignedAgents: true,
                            handledByAiAgent: { select: { id: true, name: true } },
                            tags: true,
                            channel: true,
                            insights: {
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        }
                    }),
                    prisma.capturedData.findMany({
                        where: { conversationId: selectedId },
                        orderBy: { createdAt: 'asc' },
                    }).catch(() => []),
                ]);
                if (convData) {
                    selectedConversation = { ...convData, capturedData };
                    messages = convData.messages;
                }
            }
        }
    }

    const hasSelection = !!selectedConversation;
    const backToListHref = (() => {
        const qs = new URLSearchParams();
        if (filter) qs.set('filter', filter);
        if (tag) qs.set('tag', tag);
        const query = qs.toString();
        return `/${lang}/company/conversations${query ? `?${query}` : ''}`;
    })();

    return (
        <ConversationsRealtimeWrapper>
        <div className="flex h-[calc(100vh-5rem)] flex-col md:flex-row border rounded-xl overflow-hidden bg-background">
            {/* Sidebar List — hidden on mobile when a conversation is selected */}
            <div className={cn(
                "w-full md:w-[320px] lg:w-[380px] border-r flex-col bg-card",
                hasSelection ? "hidden md:flex" : "flex"
            )}>
                {/* Header & Tabs */}
                <div className="border-b">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            {t.title}
                            <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal border-none text-[10px] h-5 px-1.5">
                                {filter === 'resolved' ? t.finished : t.opened}
                            </Badge>
                        </h2>
                        <NewConversationButton contacts={contactsForTemplate} lang={lang} />
                    </div>
                    {/* Tabs */}
                    <ScrollableTabs>
                        <Link
                            href={`?filter=mine`}
                            className={cn(
                                "pb-3 border-b-2 px-1 transition-colors whitespace-nowrap flex items-center gap-1.5",
                                filter === 'mine' ? "border-primary text-primary" : "border-transparent hover:text-primary/80"
                            )}
                        >
                            {t.mine} <Badge variant="secondary" className="px-1 py-0 h-4 min-w-[16px] justify-center bg-muted text-muted-foreground text-[10px]">{mineCount}</Badge>
                        </Link>
                        {!isAgent && (
                            <>
                                <Link
                                    href={`?filter=unassigned`}
                                    className={cn(
                                        "pb-3 border-b-2 px-1 transition-colors whitespace-nowrap flex items-center gap-1.5",
                                        filter === 'unassigned' ? "border-primary text-primary" : "border-transparent hover:text-primary/80"
                                    )}
                                >
                                    {t.unassigned} <Badge variant="secondary" className="px-1 py-0 h-4 min-w-[16px] justify-center bg-muted text-muted-foreground text-[10px]">{unassignedCount}</Badge>
                                </Link>
                                <Link
                                    href={`?filter=all`}
                                    className={cn(
                                        "pb-3 border-b-2 px-1 transition-colors whitespace-nowrap flex items-center gap-1.5",
                                        filter === 'all' ? "border-primary text-primary" : "border-transparent hover:text-primary/80"
                                    )}
                                >
                                    {t.all} <Badge variant="secondary" className="px-1 py-0 h-4 min-w-[16px] justify-center bg-muted text-muted-foreground text-[10px]">{allCount}</Badge>
                                </Link>
                            </>
                        )}
                        <Link
                            href={`?filter=resolved`}
                            className={cn(
                                "pb-3 border-b-2 px-1 transition-colors whitespace-nowrap flex items-center gap-1.5",
                                filter === 'resolved' ? "border-primary text-primary" : "border-transparent hover:text-primary/80"
                            )}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t.finished} <Badge variant="secondary" className="px-1 py-0 h-4 min-w-[16px] justify-center bg-muted text-muted-foreground text-[10px]">{resolvedCount}</Badge>
                        </Link>
                    </ScrollableTabs>
                </div>

                {/* Search */}
                <div className="p-3 border-b bg-muted/50">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t.searchPlaceholder}
                            className="pl-8 h-9 bg-background"
                        />
                    </div>
                </div>

                <ConversationList
                    conversations={conversations as any}
                    selectedId={selectedId}
                    filter={filter}
                    isAgent={isAgent}
                />
            </div>

            {/* Main Area (Chat or Welcome) — hidden on mobile when no conversation is selected */}
            <div className={cn(
                "flex-1 flex-col bg-card min-w-0",
                hasSelection ? "flex" : "hidden md:flex"
            )}>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b flex items-center px-3 sm:px-6 bg-card justify-between sticky top-0 z-10 gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <Link
                                    href={backToListHref}
                                    className="md:hidden shrink-0 -ml-1 p-2 rounded-md hover:bg-muted text-foreground"
                                    aria-label="Volver a la lista"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <ContactAvatar
                                    name={selectedConversation.contact?.name}
                                    phone={selectedConversation.contact?.phone}
                                    imageUrl={selectedConversation.contact?.imageUrl}
                                    className="h-9 w-9 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-sm text-foreground truncate">{selectedConversation.contact?.name}</h3>
                                    <div className="flex items-center gap-2">
                                        {selectedConversation.channel?.type === ChannelType.INSTAGRAM ? (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-pink-200 text-pink-600 bg-pink-50 flex items-center gap-1">
                                                <Instagram className="h-3 w-3" /> Instagram
                                            </Badge>
                                        ) : selectedConversation.channel?.type === ChannelType.MESSENGER ? (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-200 text-blue-600 bg-blue-50 flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" /> Messenger
                                            </Badge>
                                        ) : selectedConversation.channel?.type === ChannelType.WHATSAPP ? (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-200 text-green-600 bg-green-50 flex items-center gap-1">
                                                <Phone className="h-3 w-3" /> WhatsApp
                                            </Badge>
                                        ) : selectedConversation.channel?.type === ChannelType.WEB_CHAT ? (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-200 text-blue-600 bg-blue-50 flex items-center gap-1">
                                                <Globe className="h-3 w-3" /> Web Chat
                                            </Badge>
                                        ) : selectedConversation.channel?.type ? (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1">{selectedConversation.channel.type}</Badge>
                                        ) : null}
                                        {selectedConversation.channel?.type !== ChannelType.WEB_CHAT && (
                                            <p className="text-xs text-muted-foreground">{selectedConversation.contact?.phone}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {selectedConversation.channel?.type !== ChannelType.WEB_CHAT && (
                                <div className="shrink-0">
                                    <WindowTimer conversationId={selectedConversation.id} />
                                </div>
                            )}
                        </div>


                        {/* Messages */}
                        <MessageList messages={messages} />

                        {/* Input Area */}
                        {selectedConversation.status === 'RESOLVED' ? (
                            <ReopenBanner conversationId={selectedConversation.id} />
                        ) : (
                            <div className="p-3 sm:p-4 bg-card border-t sticky bottom-0 z-10" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                                <ChatInput
                                conversationId={selectedConversation.id}
                                channelType={selectedConversation.channel?.type}
                                contactId={selectedConversation.contactId}
                            />
                            </div>
                        )}
                    </>
                ) : (
                    // --- WELCOME DASHBOARD (Empty State) ---
                    <div className="flex-1 overflow-auto bg-muted/20 p-8 md:p-12 flex flex-col items-center justify-center">
                        {isAgent ? (
                            <div className="max-w-2xl w-full space-y-8 text-center">
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <div className="bg-primary/10 p-4 rounded-full">
                                            <Inbox className="h-12 w-12 text-primary" />
                                        </div>
                                    </div>
                                    <h1 className="text-2xl font-semibold text-foreground">
                                        👋 {t.welcomeAgent.replace('{name}', session.user.name || 'Agente')}
                                    </h1>
                                    <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
                                        {t.welcomeAgentDesc}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-4xl w-full space-y-8">
                                <div className="space-y-4">
                                    <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                                        👋 {t.welcomeAdmin.replace('{name}', session.user.name || 'Usuario')}
                                    </h1>
                                    <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
                                        {t.welcomeAdminDesc}
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Card 1: Inbox */}
                                    <Card className="p-6 hover:shadow-md transition-all border shadow-sm group">
                                        <div className="flex flex-col gap-4 h-full justify-between">
                                            <div className="flex justify-center py-4">
                                                {/* Placeholder for the 'apps' icon in mockup */}
                                                <div className="relative">
                                                    <Inbox className="h-12 w-12 text-primary" />
                                                    <Badge className="absolute -top-2 -right-2 bg-red-500 h-5 w-5 rounded-full p-0 flex items-center justify-center border-2 border-white">3</Badge>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-center">
                                                <h3 className="font-semibold text-foreground">{t.cardInboxTitle}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t.cardInboxDesc}
                                                </p>
                                            </div>
                                            <Link href="?filter=all" className="text-primary text-xs font-medium hover:underline text-center flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
                                                {t.cardInboxCta} <Search className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </Card>

                                    {/* Card 2: Team */}
                                    <Card className="p-6 hover:shadow-md transition-all border shadow-sm group">
                                        <div className="flex flex-col gap-4 h-full justify-between">
                                            <div className="flex justify-center py-4">
                                                <div className="flex -space-x-3">
                                                    <Avatar className="border-2 border-white ring-2 ring-muted"><AvatarFallback className="bg-emerald-100 text-emerald-700">A</AvatarFallback></Avatar>
                                                    <Avatar className="border-2 border-white ring-2 ring-muted"><AvatarFallback className="bg-green-100 text-green-600">B</AvatarFallback></Avatar>
                                                    <Avatar className="border-2 border-white ring-2 ring-muted"><AvatarFallback className="bg-purple-100 text-purple-600">C</AvatarFallback></Avatar>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-center">
                                                <h3 className="font-semibold text-foreground">{t.cardTeamTitle}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t.cardTeamDesc}
                                                </p>
                                            </div>
                                            <Link href="/company/agents" className="text-primary text-xs font-medium hover:underline text-center flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
                                                {t.cardTeamCta} <Users className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </Card>

                                    {/* Card 3: Canned Responses (Stub) */}
                                    <Card className="p-6 hover:shadow-md transition-all border shadow-sm group">
                                        <div className="flex flex-col gap-4 h-full justify-between">
                                            <div className="flex justify-center py-4">
                                                <div className="bg-muted p-3 rounded-lg">
                                                    <code className="text-xs text-muted-foreground">{t.cannedReplyExample}</code>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-center">
                                                <h3 className="font-semibold text-foreground">{t.cardRepliesTitle}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t.cardRepliesDesc}
                                                </p>
                                            </div>
                                            <Link href="/company/settings" className="text-primary text-xs font-medium hover:underline text-center flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
                                                {t.cardRepliesCta} <Settings className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </Card>

                                    {/* Card 4: Tags (Stub) */}
                                    <Card className="p-6 hover:shadow-md transition-all border shadow-sm group">
                                        <div className="flex flex-col gap-4 h-full justify-between">
                                            <div className="flex justify-center py-4 gap-2">
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200">{t.tagSales}</Badge>
                                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">{t.tagSupport}</Badge>
                                            </div>
                                            <div className="space-y-2 text-center">
                                                <h3 className="font-semibold text-foreground">{t.cardTagsTitle}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t.cardTagsDesc}
                                                </p>
                                            </div>
                                            <Link href="/company/settings/tags" className="text-primary text-xs font-medium hover:underline text-center flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
                                                {t.cardTagsCta} <Tag className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Context Sidebar */}
            {
                selectedConversation && (
                    <ConversationRightSidebar
                        conversation={selectedConversation}
                        companyTags={companyTags}
                        companyAgents={companyAgents}
                        className="hidden lg:flex w-[320px] xl:w-[350px] shrink-0 border-l"
                        isAgent={isAgent}
                        insight={(selectedConversation as any).insights?.[0] || null}
                    />
                )
            }
        </div >
        </ConversationsRealtimeWrapper>
    );
}
