'use client';

import { Badge } from '@/components/ui/badge';
import { MessageSquare, Globe, Instagram, Lock, CreditCard } from 'lucide-react';
import { WhatsAppConnectionForm } from './whatsapp-form';
import { WebChatForm } from './webchat-form';
import { InstagramDMForm } from './instagram-dm-form';
import { MessengerForm } from './messenger-form';
import Link from 'next/link';
import { useDictionary } from '@/lib/i18n-context';

const WHATSAPP_NUMBER_LIMIT = 10;

type WhatsAppNumber = {
    channelId: string;
    phoneNumberId?: string;
    verifyToken?: string;
    wabaId?: string;
    hasAccessToken: boolean;
    automationPriority: string;
    phoneDisplay?: string;
    connectionMode?: 'oauth' | 'manual';
    tokenStatus?: string | null;
    tokenExpiresAt?: string | null;
    label?: string;
};

type ChannelsSectionProps = {
    whatsappNumbers: WhatsAppNumber[];
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
    messengerConfig: {
        hasAccessToken: boolean;
        channelId: string | null;
        automationPriority: string;
        pageName?: string;
    };
    hasActiveSubscription: boolean;
};

export function ChannelsSection({ whatsappNumbers, webchatConfig, instagramConfig, messengerConfig, hasActiveSubscription }: ChannelsSectionProps) {
    const dict = useDictionary();
    const t = dict.settingsUI?.channelsSection || {};

    if (!hasActiveSubscription) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-6 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-900">{t.subscriptionRequired || 'Suscripción requerida'}</h3>
                    <p className="text-sm text-amber-700 max-w-md mx-auto">
                        {t.subscriptionRequiredDesc || 'Para configurar canales necesitas un plan activo.'}
                    </p>
                    <Link href="?tab=billing">
                        <button className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#10B981] text-white px-4 py-2 text-sm font-medium">
                            <CreditCard className="h-4 w-4" />
                            {t.subscribeNow || 'Suscríbete ahora'}
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const canAddWhatsApp = whatsappNumbers.length < WHATSAPP_NUMBER_LIMIT;

    return (
        <div className="space-y-8">
            {/* WhatsApp numbers (up to 10) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-[#10B981]" />
                        <h3 className="text-[15px] font-semibold text-[#09090B]">Números de WhatsApp</h3>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                        {whatsappNumbers.length}/{WHATSAPP_NUMBER_LIMIT}
                    </Badge>
                </div>
                <p className="text-[13px] text-[#71717A]">
                    Conecta hasta {WHATSAPP_NUMBER_LIMIT} números. Cada número tiene su propia bandeja de entrada.
                </p>

                {/* Connected numbers — compact, collapsible rows in a single column */}
                {whatsappNumbers.length > 0 && (
                    <div className="space-y-3">
                        {whatsappNumbers.map((wa) => (
                            <WhatsAppConnectionForm
                                key={wa.channelId}
                                initialPhoneNumberId={wa.phoneNumberId}
                                initialVerifyToken={wa.verifyToken}
                                initialWabaId={wa.wabaId}
                                hasAccessToken={wa.hasAccessToken}
                                channelId={wa.channelId}
                                automationPriority={wa.automationPriority}
                                phoneDisplay={wa.phoneDisplay}
                                connectionMode={wa.connectionMode}
                                tokenStatus={wa.tokenStatus}
                                tokenExpiresAt={wa.tokenExpiresAt}
                                initialLabel={wa.label}
                            />
                        ))}
                    </div>
                )}

                {/* Add a new number (empty channelId → create on save) */}
                {canAddWhatsApp ? (
                    <WhatsAppConnectionForm
                        key="__add__"
                        channelId={null}
                        hasAccessToken={false}
                        isAdditional={whatsappNumbers.length > 0}
                    />
                ) : (
                    <p className="text-[12px] text-[#A1A1AA]">
                        Alcanzaste el límite de {WHATSAPP_NUMBER_LIMIT} números. Desconecta uno para agregar otro.
                    </p>
                )}
            </div>

            <p className="text-[14px] text-[#71717A]">
                {t.connectedChannelsDesc || 'Otros canales. Selecciona un canal para configurarlo.'}
            </p>

            {/* Other channels inline - no drill-down views */}
            <div className="grid gap-5 lg:grid-cols-3">
                {/* Instagram */}
                <InstagramDMForm
                    initialPageId={instagramConfig.pageId}
                    hasAccessToken={instagramConfig.hasAccessToken}
                    channelId={instagramConfig.channelId}
                    automationPriority={instagramConfig.automationPriority}
                    pageName={instagramConfig.pageName}
                />

                {/* Messenger */}
                <MessengerForm
                    hasAccessToken={messengerConfig.hasAccessToken}
                    channelId={messengerConfig.channelId}
                    automationPriority={messengerConfig.automationPriority}
                    pageName={messengerConfig.pageName}
                />

                {/* Web Chat */}
                <WebChatForm
                    isActive={webchatConfig.isActive}
                    apiKey={webchatConfig.apiKey}
                    channelId={webchatConfig.channelId}
                    automationPriority={webchatConfig.automationPriority}
                />
            </div>
        </div>
    );
}
