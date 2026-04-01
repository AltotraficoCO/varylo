'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, MessageSquare, Globe, Instagram, Lock, CreditCard } from 'lucide-react';
import { WhatsAppConnectionForm } from './whatsapp-form';
import { WebChatForm } from './webchat-form';
import { InstagramDMForm } from './instagram-dm-form';
import Link from 'next/link';

type ChannelItem = {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    status: 'active' | 'coming_soon';
    color: string;
    badge: string;
};

type ChannelsSectionProps = {
    whatsappConfig: {
        phoneNumberId?: string;
        verifyToken?: string;
        wabaId?: string;
        hasAccessToken: boolean;
        channelId: string | null;
        automationPriority: string;
        phoneDisplay?: string;
    };
    webchatConfig: {
        isActive: boolean;
        apiKey: string | null;
        channelId: string | null;
        automationPriority: string;
    };
    instagramConfig: {
        pageId?: string;
        verifyToken?: string;
        hasAccessToken: boolean;
        channelId: string | null;
        automationPriority: string;
        pageName?: string;
    };
    hasActiveSubscription: boolean;
};

export function ChannelsSection({ whatsappConfig, webchatConfig, instagramConfig, hasActiveSubscription }: ChannelsSectionProps) {
    const [activeItem, setActiveItem] = useState<string | null>(null);

    const channels: ChannelItem[] = [
        {
            id: 'whatsapp',
            name: 'WhatsApp',
            description: 'Conecta tu número de WhatsApp Business para recibir y enviar mensajes.',
            icon: MessageSquare,
            status: 'active',
            color: 'bg-green-50 text-green-600 border-green-200',
            badge: whatsappConfig.channelId ? 'Conectado' : 'No conectado',
        },
        {
            id: 'webchat',
            name: 'Web Chat',
            description: 'Widget de chat en vivo para tu sitio web.',
            icon: Globe,
            status: 'active',
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            badge: webchatConfig.isActive ? 'Activo' : 'Inactivo',
        },
        {
            id: 'instagram',
            name: 'Instagram DM',
            description: 'Conecta tu cuenta de Instagram para recibir DMs.',
            icon: Instagram,
            status: 'active',
            color: 'bg-pink-50 text-pink-600 border-pink-200',
            badge: instagramConfig.channelId ? 'Conectado' : 'No conectado',
        },
    ];

    // No active subscription — show locked state
    if (!hasActiveSubscription) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Selecciona un canal para configurarlo.
                </p>

                {/* Subscription required banner */}
                <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-6 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-900">Suscripción requerida</h3>
                    <p className="text-sm text-amber-700 max-w-md mx-auto">
                        Para configurar canales de comunicación necesitas un plan activo. Suscríbete para empezar a recibir mensajes de tus clientes.
                    </p>
                    <Link href="?tab=billing">
                        <Button className="mt-2 gap-2">
                            <CreditCard className="h-4 w-4" />
                            Suscríbete ahora
                        </Button>
                    </Link>
                </div>

                {/* Greyed out channel cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {channels.map((ch) => (
                        <Card
                            key={ch.id}
                            className="opacity-50 grayscale pointer-events-none select-none"
                        >
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-2.5 rounded-lg border ${ch.color}`}>
                                        <ch.icon className="h-5 w-5" />
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Bloqueado
                                    </Badge>
                                </div>
                                <h3 className="font-semibold mb-1">{ch.name}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {ch.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (activeItem === 'whatsapp') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a canales
                </Button>
                <WhatsAppConnectionForm
                    initialPhoneNumberId={whatsappConfig.phoneNumberId}
                    hasAccessToken={whatsappConfig.hasAccessToken}
                    channelId={whatsappConfig.channelId}
                    automationPriority={whatsappConfig.automationPriority as any}
                    phoneDisplay={whatsappConfig.phoneDisplay}
                />
            </div>
        );
    }

    if (activeItem === 'webchat') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a canales
                </Button>
                <WebChatForm
                    isActive={webchatConfig.isActive}
                    apiKey={webchatConfig.apiKey}
                    channelId={webchatConfig.channelId}
                    automationPriority={webchatConfig.automationPriority as any}
                />
            </div>
        );
    }

    if (activeItem === 'instagram') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a canales
                </Button>
                <InstagramDMForm
                    initialPageId={instagramConfig.pageId}
                    hasAccessToken={instagramConfig.hasAccessToken}
                    channelId={instagramConfig.channelId}
                    automationPriority={instagramConfig.automationPriority}
                    pageName={instagramConfig.pageName}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Selecciona un canal para configurarlo.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {channels.map((ch) => (
                    <Card
                        key={ch.id}
                        className={`transition-all ${
                            ch.status === 'active'
                                ? 'cursor-pointer hover:shadow-md hover:border-primary/40'
                                : 'opacity-60'
                        }`}
                        onClick={() => ch.status === 'active' && setActiveItem(ch.id)}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-lg border ${ch.color}`}>
                                    <ch.icon className="h-5 w-5" />
                                </div>
                                {ch.status === 'active' ? (
                                    <Badge
                                        variant={ch.badge === 'Conectado' || ch.badge === 'Activo' ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {ch.badge}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-xs">{ch.badge}</Badge>
                                )}
                            </div>
                            <h3 className="font-semibold mb-1">{ch.name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {ch.description}
                            </p>
                            {ch.status === 'active' && (
                                <div className="mt-4 flex items-center text-sm text-primary font-medium gap-1">
                                    Configurar
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
