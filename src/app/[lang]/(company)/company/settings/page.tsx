import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Building2, Plug, Coins, Tag, FileText, CreditCard, Key, Puzzle } from "lucide-react";
import { TagsSection } from "./tags-section";
import { TemplatesSection } from "./templates-section";
import { GeneralSection } from "./general-section";
import { ChannelsSection } from "./channels-section";
import { CreditBalanceCard } from "./credit-balance-card";
import { BillingSection } from "./billing-section";
import { ApiKeysSection } from "./api-keys-section";
import { IntegrationsClient } from "../integrations/integrations-client";
import { getActiveSubscription, getPaymentSources, getBillingHistory, getAvailablePlans } from "./billing-actions";
import { getWompiConfig } from "@/lib/wompi-config";
import { Role } from '@prisma/client';
import { getDictionary, Locale } from '@/lib/dictionary';

export default async function SettingsPage(props: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const [{ lang }, searchParams] = await Promise.all([props.params, props.searchParams]);
    const activeTab = searchParams.tab || 'general';
    const dict = await getDictionary(lang as Locale);
    const ts = dict.dashboard.settings;

    const TABS = [
        { key: 'general', label: ts.tabs.general, icon: Building2 },
        { key: 'channels', label: ts.tabs.channels, icon: Plug },
        { key: 'integrations', label: ts.tabs.integrations, icon: Puzzle },
        { key: 'ai', label: ts.tabs.credits, icon: Coins },
        { key: 'billing', label: ts.tabs.billing, icon: CreditCard },
        { key: 'api', label: ts.tabs.api, icon: Key },
        { key: 'tags', label: ts.tabs.tags, icon: Tag },
        { key: 'templates', label: ts.tabs.templates, icon: FileText },
    ];

    const session = await auth();
    const companyId = session?.user?.companyId;
    if (!companyId) return null;

    // Fetch all data in parallel
    let n8nWebhooks: any[] = [];
    try {
        const result = await prisma.webhookIntegration.findMany({ where: { companyId, platform: 'n8n' }, select: { id: true, name: true, platform: true, webhookUrl: true, events: true, active: true, lastUsedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
        n8nWebhooks = result || [];
    } catch (e) {
        console.error('[Settings] WebhookIntegration query failed:', e);
        n8nWebhooks = [];
    }

    const [company, whatsappChannel, webchatChannel, instagramChannel, messengerChannel, tags, companyAgents, ecommerceStoresRaw, activeSubscription] = await Promise.all([
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
        prisma.channel.findFirst({ where: { companyId, type: ChannelType.INSTAGRAM } }),
        prisma.channel.findFirst({ where: { companyId, type: ChannelType.MESSENGER } }),
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
        prisma.ecommerceIntegration.findMany({
            where: { companyId },
            select: { id: true, name: true, platform: true, storeUrl: true, active: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.subscription.findFirst({
            where: { companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
            select: { id: true },
        }).catch(() => null),
    ]);

    const ecommerceStores = Array.isArray(ecommerceStoresRaw) ? ecommerceStoresRaw : [];

    const companyName = company?.name || '';
    const hasOpenAIKey = !!company?.openaiApiKey;
    const openaiKeyUpdatedAt = company?.openaiApiKeyUpdatedAt?.toISOString() || null;
    const creditBalance = company?.creditBalance || 0;
    const userEmail = session?.user?.email || '';
    const hasGoogleCalendar = !!company?.googleCalendarRefreshToken;
    const googleCalendarEmail = company?.googleCalendarEmail || null;
    const googleCalendarConnectedAt = company?.googleCalendarConnectedAt?.toISOString() || null;

    // WhatsApp config
    const whatsappConfig = whatsappChannel?.configJson as { phoneNumberId?: string; verifyToken?: string; accessToken?: string; appSecret?: string; wabaId?: string; phoneDisplay?: string } | null;

    // WebChat config
    const webchatActive = webchatChannel?.status === 'CONNECTED';
    const webchatConfig = webchatChannel?.configJson as { apiKey?: string } | null;

    // Instagram config
    const instagramConnected = instagramChannel?.status === 'CONNECTED';
    const instagramConfigJson = instagramChannel?.configJson as { pageId?: string; accessToken?: string; verifyToken?: string; pageName?: string } | null;

    // Messenger config
    const messengerConnected = messengerChannel?.status === 'CONNECTED';
    const messengerConfigJson = messengerChannel?.configJson as { pageId?: string; accessToken?: string; pageName?: string } | null;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">{ts.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {ts.subtitle}
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
                                phoneDisplay: whatsappConfig?.phoneDisplay,
                            }}
                            webchatConfig={{
                                isActive: webchatActive,
                                apiKey: webchatConfig?.apiKey || null,
                                channelId: webchatChannel?.id || null,
                                automationPriority: webchatChannel?.automationPriority || 'CHATBOT_FIRST',
                            }}
                            instagramConfig={{
                                pageId: instagramConfigJson?.pageId,
                                verifyToken: instagramConfigJson?.verifyToken,
                                hasAccessToken: instagramConnected && !!instagramConfigJson?.accessToken,
                                channelId: instagramConnected ? instagramChannel?.id || null : null,
                                automationPriority: instagramChannel?.automationPriority || 'CHATBOT_FIRST',
                                pageName: instagramConfigJson?.pageName,
                            }}
                            messengerConfig={{
                                hasAccessToken: messengerConnected && !!messengerConfigJson?.accessToken,
                                channelId: messengerConnected ? messengerChannel?.id || null : null,
                                automationPriority: messengerChannel?.automationPriority || 'CHATBOT_FIRST',
                                pageName: messengerConfigJson?.pageName,
                            }}
                            hasActiveSubscription={!!activeSubscription}
                        />
                    )}

                    {activeTab === 'integrations' && (
                        <IntegrationsClient
                            openai={{
                                hasApiKey: hasOpenAIKey,
                                updatedAt: openaiKeyUpdatedAt,
                            }}
                            googleCalendar={{
                                isConnected: hasGoogleCalendar,
                                email: googleCalendarEmail,
                                connectedAt: googleCalendarConnectedAt,
                            }}
                            ecommerceStores={(Array.isArray(ecommerceStores) ? ecommerceStores : []).map(s => ({
                                ...s,
                                createdAt: s.createdAt.toISOString(),
                            }))}
                            n8nIntegrations={(Array.isArray(n8nWebhooks) ? n8nWebhooks : []).map(w => ({
                                ...w,
                                lastUsedAt: w.lastUsedAt?.toISOString() || null,
                                createdAt: w.createdAt.toISOString(),
                            }))}
                        />
                    )}

                    {activeTab === 'ai' && (
                        <CreditBalanceCard
                            balance={creditBalance}
                            hasOwnKey={hasOpenAIKey}
                            companyId={companyId}
                            companyEmail={userEmail}
                        />
                    )}

                    {activeTab === 'billing' && (
                        <BillingTabContent companyId={companyId} companyEmail={userEmail} />
                    )}

                    {activeTab === 'api' && (
                        <ApiKeysSection />
                    )}

                    {activeTab === 'tags' && (
                        <TagsSection tags={tags} />
                    )}

                    {activeTab === 'templates' && (
                        <TemplatesSection />
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
        cancelledAt: subscription.cancelledAt?.toISOString() || null,
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
