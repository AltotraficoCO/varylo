import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Instagram, Building2, Bell, Plug, Brain, Tag } from "lucide-react";
import { WhatsAppConnectionForm } from "./whatsapp-form";
import { OpenAIKeyForm } from "./openai-form";
import { CreditBalanceCard } from "./credit-balance-card";
import { WebChatForm } from "./webchat-form";
import { TagsSection } from "./tags-section";

const TABS = [
    { key: 'general', label: 'General', icon: Building2 },
    { key: 'channels', label: 'Canales', icon: Plug },
    { key: 'ai', label: 'IA y Créditos', icon: Brain },
    { key: 'tags', label: 'Etiquetas', icon: Tag },
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
    const [company, whatsappChannel, webchatChannel, tags] = await Promise.all([
        prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, openaiApiKey: true, openaiApiKeyUpdatedAt: true, creditBalance: true },
        }),
        prisma.channel.findFirst({ where: { companyId, type: ChannelType.WHATSAPP } }),
        prisma.channel.findFirst({ where: { companyId, type: ChannelType.WEB_CHAT } }),
        prisma.tag.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { conversations: true } } }
        }),
    ]);

    const companyName = company?.name || '';
    const hasOpenAIKey = !!company?.openaiApiKey;
    const openaiKeyUpdatedAt = company?.openaiApiKeyUpdatedAt?.toISOString() || null;
    const creditBalance = company?.creditBalance || 0;
    const userEmail = session?.user?.email || '';

    // WhatsApp config
    const whatsappConfig = whatsappChannel?.configJson as { phoneNumberId?: string; verifyToken?: string; accessToken?: string; appSecret?: string; wabaId?: string } | null;

    // WebChat config
    const webchatActive = webchatChannel?.status === 'CONNECTED';
    const webchatConfig = webchatChannel?.configJson as { apiKey?: string } | null;

    return (
        <div className="max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Administra tu empresa, canales de comunicación y preferencias.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b mb-8">
                <nav className="flex gap-6 -mb-px">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <Link
                                key={tab.key}
                                href={`?tab=${tab.key}`}
                                className={cn(
                                    "flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'general' && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Perfil de Empresa</CardTitle>
                                <CardDescription>Información básica de tu empresa.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">Nombre de Empresa</Label>
                                        <Input id="companyName" defaultValue={companyName} disabled className="bg-muted/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" defaultValue={userEmail} disabled className="bg-muted/50" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">Notificaciones</CardTitle>
                                        <CardDescription>Configura cómo quieres recibir alertas.</CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">Próximamente</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 opacity-50 pointer-events-none">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="email-notif" className="flex flex-col gap-1">
                                        <span>Notificaciones por Email</span>
                                        <span className="font-normal text-xs text-muted-foreground">Resúmenes semanales de actividad.</span>
                                    </Label>
                                    <Switch id="email-notif" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="desktop-notif" className="flex flex-col gap-1">
                                        <span>Notificaciones de Escritorio</span>
                                        <span className="font-normal text-xs text-muted-foreground">Alertas en tiempo real.</span>
                                    </Label>
                                    <Switch id="desktop-notif" />
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {activeTab === 'channels' && (
                    <>
                        <WhatsAppConnectionForm
                            initialPhoneNumberId={whatsappConfig?.phoneNumberId}
                            initialVerifyToken={whatsappConfig?.verifyToken}
                            initialWabaId={whatsappConfig?.wabaId}
                            hasAccessToken={!!whatsappConfig?.accessToken}
                            channelId={whatsappChannel?.id || null}
                            automationPriority={whatsappChannel?.automationPriority || 'CHATBOT_FIRST'}
                        />
                        <WebChatForm
                            isActive={webchatActive}
                            apiKey={webchatConfig?.apiKey || null}
                            channelId={webchatChannel?.id || null}
                            automationPriority={webchatChannel?.automationPriority || 'CHATBOT_FIRST'}
                        />
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Instagram className="h-5 w-5 text-pink-600" />
                                        <CardTitle>Instagram DM</CardTitle>
                                    </div>
                                    <Badge variant="secondary">Próximamente</Badge>
                                </div>
                                <CardDescription>Conecta tu cuenta de Instagram para recibir DMs.</CardDescription>
                            </CardHeader>
                            <CardContent className="opacity-50 pointer-events-none">
                                <p className="text-center py-4 text-sm text-muted-foreground">
                                    Esta integración estará disponible próximamente.
                                </p>
                            </CardContent>
                        </Card>
                    </>
                )}

                {activeTab === 'ai' && (
                    <>
                        <OpenAIKeyForm hasApiKey={hasOpenAIKey} updatedAt={openaiKeyUpdatedAt} />
                        <CreditBalanceCard
                            balance={creditBalance}
                            hasOwnKey={hasOpenAIKey}
                            companyId={companyId}
                            companyEmail={userEmail}
                        />
                    </>
                )}

                {activeTab === 'tags' && (
                    <TagsSection tags={tags} />
                )}
            </div>
        </div>
    );
}
