'use client';

import { Badge } from '@/components/ui/badge';
import { MessageSquare, Globe, Instagram, Lock, CreditCard } from 'lucide-react';
import { WhatsAppConnectionForm } from './whatsapp-form';
import { WebChatForm } from './webchat-form';
import { InstagramDMForm } from './instagram-dm-form';
import { MessengerForm } from './messenger-form';
import Link from 'next/link';
import { useDictionary } from '@/lib/i18n-context';

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
    messengerConfig: {
        hasAccessToken: boolean;
        channelId: string | null;
        automationPriority: string;
        pageName?: string;
    };
    hasActiveSubscription: boolean;
};

export function ChannelsSection({ whatsappConfig, webchatConfig, instagramConfig, messengerConfig, hasActiveSubscription }: ChannelsSectionProps) {
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

    return (
        <div className="space-y-5">
            <p className="text-[14px] text-[#71717A]">
                {t.connectedChannelsDesc || 'Canales conectados. Selecciona un canal para configurarlo.'}
            </p>

            {/* All channels inline - no drill-down views */}
            <div className="grid gap-5 lg:grid-cols-3">
                {/* WhatsApp */}
                <WhatsAppConnectionForm
                    initialPhoneNumberId={whatsappConfig.phoneNumberId}
                    initialVerifyToken={whatsappConfig.verifyToken}
                    initialWabaId={whatsappConfig.wabaId}
                    hasAccessToken={whatsappConfig.hasAccessToken}
                    channelId={whatsappConfig.channelId}
                    automationPriority={whatsappConfig.automationPriority}
                />

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
