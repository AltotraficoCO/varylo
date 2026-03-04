import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Building2, Plug, Brain, Tag, FileText, BookOpen, CreditCard } from "lucide-react";
import { TagsSection } from "./tags-section";
import { TemplatesSection } from "./templates-section";
import { GuidesSection } from "./guides-section";
import { GeneralSection } from "./general-section";
import { ChannelsSection } from "./channels-section";
import { IntegrationsSection } from "./integrations-section";
import { BillingSection } from "./billing-section";
import { getActiveSubscription, getPaymentSources, getBillingHistory, getAvailablePlans } from "./billing-actions";
import { getWompiConfig } from "@/lib/wompi-config";
import { Role } from '@prisma/client';

const TABS = [
    { key: 'general', label: 'General', icon: Building2 },
    { key: 'channels', label: 'Canales', icon: Plug },
    { key: 'ai', label: 'IA y Créditos', icon: Brain },
    { key: 'billing', label: 'Facturación', icon: CreditCard },
    { key: 'tags', label: 'Etiquetas', icon: Tag },
    { key: 'templates', label: 'Plantillas', icon: FileText },
    { key: 'guides', label: 'Guías', icon: BookOpen },
];

export default async function SettingsPage(props: {
    searchParams: Promise<{ tab?: string }>
}) {
    const searchParams = await props.searchParams;
    const activeTab = searchParams.tab || 'general';

    const session = await auth();
    const companyId = session?.user?.companyId;
    if (!companyId) return null;

    // Fetch all data in parallel
    const [company, whatsappChannel, webchatChannel, tags, companyAgents] = await Promise.all([
        prisma.company.findUnique({
            where: { id: companyId },
            select: {
                name: true,
                openaiApiKey: true,
                openaiApiKeyUpdatedAt: true,
                creditBalance: true,
                googleCalendarEmail: true,
                googleCalendarConnectedAt: true,
                googleCalendarRefreshToken: true,
                assignmentStrategy: true,
                specificAgentId: true,
            },
        }),
        prisma.channel.findFirst({ where: { companyId, type: ChannelType.WHATSAPP } }),
        prisma.channel.findFirst({ where: { companyId, type: ChannelType.WEB_CHAT } }),
        prisma.tag.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { conversations: true } } }
        }),
        prisma.user.findMany({
            where: { companyId, active: true, role: { in: [Role.AGENT, Role.COMPANY_ADMIN] } },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    const companyName = company?.name || '';
    const hasOpenAIKey = !!company?.openaiApiKey;
    const openaiKeyUpdatedAt = company?.openaiApiKeyUpdatedAt?.toISOString() || null;
    const creditBalance = company?.creditBalance || 0;
    const userEmail = session?.user?.email || '';
    const hasGoogleCalendar = !!company?.googleCalendarRefreshToken;
    const googleCalendarEmail = company?.googleCalendarEmail || null;
    const googleCalendarConnectedAt = company?.googleCalendarConnectedAt?.toISOString() || null;

    // WhatsApp config
    const whatsappConfig = whatsappChannel?.configJson as { phoneNumberId?: string; verifyToken?: string; accessToken?: string; appSecret?: string; wabaId?: string } | null;

    // WebChat config
    const webchatActive = webchatChannel?.status === 'CONNECTED';
    const webchatConfig = webchatChannel?.configJson as { apiKey?: string } | null;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Administra tu empresa, canales de comunicación y preferencias.
                </p>
            </div>

            <div className="flex gap-8">
                {/* Sidebar Navigation — sticky */}
                <nav className="hidden md:flex flex-col gap-1 w-48 shrink-0 sticky top-20 self-start">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <Link
                                key={tab.key}
                                href={`?tab=${tab.key}`}
                                className={cn(
                                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Mobile: horizontal scroll tabs */}
                <div className="md:hidden border-b mb-6 -mt-2 w-full">
                    <nav className="flex gap-4 -mb-px overflow-x-auto pb-px">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <Link
                                    key={tab.key}
                                    href={`?tab=${tab.key}`}
                                    className={cn(
                                        "flex items-center gap-1.5 pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                                        isActive
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-w-0 space-y-6">
                    {activeTab === 'general' && (
                        <GeneralSection
                            companyName={companyName}
                            userEmail={userEmail}
                            assignmentStrategy={company?.assignmentStrategy || 'LEAST_BUSY'}
                            specificAgentId={company?.specificAgentId || null}
                            agents={companyAgents}
                        />
                    )}

                    {activeTab === 'channels' && (
                        <ChannelsSection
                            whatsappConfig={{
                                phoneNumberId: whatsappConfig?.phoneNumberId,
                                verifyToken: whatsappConfig?.verifyToken,
                                wabaId: whatsappConfig?.wabaId,
                                hasAccessToken: !!whatsappConfig?.accessToken,
                                channelId: whatsappChannel?.id || null,
                                automationPriority: whatsappChannel?.automationPriority || 'CHATBOT_FIRST',
                            }}
                            webchatConfig={{
                                isActive: webchatActive,
                                apiKey: webchatConfig?.apiKey || null,
                                channelId: webchatChannel?.id || null,
                                automationPriority: webchatChannel?.automationPriority || 'CHATBOT_FIRST',
                            }}
                        />
                    )}

                    {activeTab === 'ai' && (
                        <IntegrationsSection
                            openai={{
                                hasApiKey: hasOpenAIKey,
                                updatedAt: openaiKeyUpdatedAt,
                            }}
                            credits={{
                                balance: creditBalance,
                                hasOwnKey: hasOpenAIKey,
                                companyId,
                                companyEmail: userEmail,
                            }}
                            googleCalendar={{
                                isConnected: hasGoogleCalendar,
                                email: googleCalendarEmail,
                                connectedAt: googleCalendarConnectedAt,
                            }}
                        />
                    )}

                    {activeTab === 'billing' && (
                        <BillingTabContent companyId={companyId} companyEmail={userEmail} />
                    )}

                    {activeTab === 'tags' && (
                        <TagsSection tags={tags} />
                    )}

                    {activeTab === 'templates' && (
                        <TemplatesSection />
                    )}

                    {activeTab === 'guides' && (
                        <GuidesSection />
                    )}
                </div>
            </div>
        </div>
    );
}

async function BillingTabContent({ companyId, companyEmail }: { companyId: string; companyEmail: string }) {
    const [subscription, paymentSources, billingHistory, availablePlans, wompiConfig] = await Promise.all([
        getActiveSubscription(),
        getPaymentSources(),
        getBillingHistory(),
        getAvailablePlans(),
        getWompiConfig(),
    ]);

    const serializedSub = subscription ? {
        ...subscription,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    } : null;

    const serializedSources = paymentSources.map((s) => ({
        ...s,
        expiresAt: s.expiresAt?.toISOString() || null,
        createdAt: s.createdAt.toISOString(),
    }));

    const serializedHistory = billingHistory.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
    }));

    const serializedPlans = availablePlans.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        landingPlan: {
            ...p.landingPlan,
            createdAt: p.landingPlan.createdAt.toISOString(),
            updatedAt: p.landingPlan.updatedAt.toISOString(),
        },
    }));

    return (
        <BillingSection
            subscription={serializedSub}
            availablePlans={serializedPlans}
            hasPaymentSource={paymentSources.length > 0}
            sources={serializedSources}
            companyEmail={companyEmail}
            wompiPublicKey={wompiConfig?.publicKey}
            wompiIsSandbox={wompiConfig?.isSandbox}
            attempts={serializedHistory}
        />
    );
}
