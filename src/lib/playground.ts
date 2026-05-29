import { prisma } from '@/lib/prisma';
import { ChannelType, ChannelStatus } from '@prisma/client';

/**
 * Playground / agent testing utilities.
 *
 * A "playground" lets a company test an AI agent with a simulated conversation
 * without using a real channel and without polluting the inbox.
 *
 * It reuses the production reply engine (`handleAiAgentResponse`) by creating a
 * real but hidden Conversation (`isTest = true`) on a dedicated hidden WEB_CHAT
 * channel and a dedicated hidden contact. WEB_CHAT is used because
 * `sendChannelMessage` performs no external API call for that channel type — the
 * reply is simply stored in the DB.
 *
 * Isolation:
 *  - The channel is marked `configJson.isPlayground = true` and kept
 *    `DISCONNECTED` so it is never matched by the public webchat apiKey lookup
 *    (which requires `status: CONNECTED`) and is excluded from channel pickers.
 *  - The contact uses the sentinel phone `PLAYGROUND_CONTACT_PHONE` so it can be
 *    filtered out of contact pickers.
 *  - Conversations are flagged `isTest = true` and excluded from inbox,
 *    dashboard, analytics and the public v1 API.
 */

export const PLAYGROUND_CONTACT_PHONE = '__playground__';

/** Find or create the hidden WEB_CHAT channel used for agent testing. */
export async function getOrCreatePlaygroundChannel(companyId: string) {
    const existing = await prisma.channel.findFirst({
        where: {
            companyId,
            type: ChannelType.WEB_CHAT,
            configJson: { path: ['isPlayground'], equals: true },
        },
    });
    if (existing) return existing;

    return prisma.channel.create({
        data: {
            companyId,
            type: ChannelType.WEB_CHAT,
            status: ChannelStatus.DISCONNECTED,
            configJson: { isPlayground: true },
        },
    });
}

/** Find or create the hidden contact used for agent testing. */
export async function getOrCreatePlaygroundContact(companyId: string) {
    const existing = await prisma.contact.findFirst({
        where: { companyId, phone: PLAYGROUND_CONTACT_PHONE },
    });
    if (existing) return existing;

    return prisma.contact.create({
        data: {
            companyId,
            phone: PLAYGROUND_CONTACT_PHONE,
            name: '🧪 Prueba',
            originChannel: ChannelType.WEB_CHAT,
        },
    });
}

/**
 * Start a fresh test conversation for an agent. Each call creates a new clean
 * conversation so "reset" in the UI simply starts a new one. Returns the id.
 */
export async function startPlaygroundConversation(companyId: string, agentId: string): Promise<string> {
    const [channel, contact] = await Promise.all([
        getOrCreatePlaygroundChannel(companyId),
        getOrCreatePlaygroundContact(companyId),
    ]);

    const conversation = await prisma.conversation.create({
        data: {
            companyId,
            channelId: channel.id,
            contactId: contact.id,
            handledByAiAgentId: agentId,
            status: 'OPEN',
            isTest: true,
            lastInboundAt: new Date(),
        },
    });

    return conversation.id;
}
