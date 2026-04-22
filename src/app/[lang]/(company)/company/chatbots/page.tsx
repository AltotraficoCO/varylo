import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CreateChatbotDialog } from './create-chatbot-dialog';
import { ChatbotCardControls } from './chatbot-card-controls';
import Link from 'next/link';
import { Bot, MessageSquare, Zap } from 'lucide-react';
import { getDictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/dictionary';

const ICON_THEMES = [
    { bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]', Icon: Bot },
    { bg: 'bg-[#EFF6FF]', color: 'text-[#3B82F6]', Icon: MessageSquare },
    { bg: 'bg-[#FFF7ED]', color: 'text-[#F97316]', Icon: Zap },
    { bg: 'bg-[#F5F3FF]', color: 'text-[#8B5CF6]', Icon: Bot },
];

export default async function ChatbotsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;
    const dict = await getDictionary(lang as Locale);
    const t = dict.chatbots || {} as Record<string, any>;

    const chatbots = await prisma.chatbot.findMany({
        where: { companyId: session.user.companyId },
        include: { channels: true, _count: { select: { channels: true } } },
        orderBy: { createdAt: 'desc' },
    });

    const channels = await prisma.channel.findMany({
        where: { companyId: session.user.companyId },
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#09090B]">{t.title}</h1>
                    <p className="text-sm text-[#71717A] mt-1">{t.subtitlePage}</p>
                </div>
                <CreateChatbotDialog channels={channels.map(c => ({ id: c.id, type: c.type }))} />
            </div>

            {/* Card Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {chatbots.map((chatbot, index) => {
                    const theme = ICON_THEMES[index % ICON_THEMES.length];
                    const IconComponent = theme.Icon;
                    const nodeCount = chatbot.flowJson ? (Array.isArray(chatbot.flowJson) ? (chatbot.flowJson as any[]).length : 0) : 0;

                    return (
                        <div key={chatbot.id} className="relative">
                            <ChatbotCardControls
                                chatbotId={chatbot.id}
                                chatbotName={chatbot.name}
                                isActive={chatbot.active}
                            />
                            <Link
                                href={`/${lang}/company/chatbots/${chatbot.id}`}
                                className="bg-white rounded-xl border border-[#E4E4E7] p-6 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer"
                            >
                                {/* Icon */}
                                <div className={`h-12 w-12 rounded-lg ${theme.bg} flex items-center justify-center`}>
                                    <IconComponent className={`h-6 w-6 ${theme.color}`} />
                                </div>

                                {/* Title + Badge */}
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-semibold text-[#09090B]">{chatbot.name}</h3>
                                    {chatbot.active && (
                                        <span className="bg-[#ECFDF5] text-[#10B981] text-xs rounded-xl px-2.5 py-0.5">
                                            {t.active}
                                        </span>
                                    )}
                                    {!chatbot.active && (
                                        <span className="bg-[#F4F4F5] text-[#71717A] text-xs rounded-xl px-2.5 py-0.5">
                                            {t.inactive}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-[13px] text-[#3F3F46] leading-[1.4] line-clamp-2">
                                    {t.automatedFlow}
                                </p>

                                {/* Stats */}
                                <p className="text-xs text-[#71717A]">
                                    {nodeCount} {t.nodes} • {chatbot._count.channels} {chatbot._count.channels === 1 ? t.channel : t.channelsPlural}
                                </p>
                            </Link>
                        </div>
                    );
                })}

                {/* Empty/Create card */}
                <CreateChatbotDialog channels={channels.map(c => ({ id: c.id, type: c.type }))} trigger={
                    <button type="button" className="bg-[#FAFAFA] rounded-xl border border-[#E4E4E7] p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[200px] hover:shadow-md transition-shadow cursor-pointer w-full">
                        <div className="h-12 w-12 bg-[#F4F4F5] rounded-full flex items-center justify-center">
                            <span className="text-2xl font-light text-[#71717A]">+</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-[#09090B]">{t.createNewChatbot}</h3>
                            <p className="text-[13px] text-[#71717A] mt-1">{t.designVisualFlows}</p>
                        </div>
                    </button>
                } />
            </div>
        </div>
    );
}
