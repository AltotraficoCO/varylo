import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection, Prisma } from '@prisma/client';
import { readChannelSecret } from '@/lib/channel-config';
import { sendTemplateToPhone } from '@/lib/broadcast';

/**
 * Outbound lead dispatch — the headless core of the lead-routing feature.
 *
 * Given a lead (from an external app), it: resolves the WhatsApp channel,
 * finds/creates the contact (tagging it with the source), opens (or reuses) a
 * conversation pre-assigned to a SPECIFIC AI agent, stores the lead's metadata
 * as context so the agent doesn't re-ask, and sends the opening WhatsApp
 * template (required by Meta to business-initiate a conversation).
 *
 * Which agent handles the lead is decided by the caller in Phase 0 (explicit
 * agentId); in Phase 1 the visual automation builder will resolve it.
 */
export interface DispatchLeadParams {
    companyId: string;
    agentId: string;
    phone: string;
    name?: string;
    source?: string;
    metadata?: Record<string, unknown>;
    template: { name: string; language: string; components?: unknown[]; body?: string };
    channelId?: string;
}

export interface DispatchLeadResult {
    ok: boolean;
    conversationId?: string;
    contactId?: string;
    providerMessageId?: string;
    error?: string;
}

export async function dispatchLead(params: DispatchLeadParams): Promise<DispatchLeadResult> {
    const phone = params.phone.replace(/[^0-9]/g, '');
    if (phone.length < 10 || phone.length > 15) {
        return { ok: false, error: 'Invalid phone number.' };
    }

    // 1. Validate the target agent belongs to this company.
    const agent = await prisma.aiAgent.findFirst({
        where: { id: params.agentId, companyId: params.companyId },
        select: { id: true, active: true },
    });
    if (!agent) return { ok: false, error: 'AI agent not found for this company.' };
    if (!agent.active) return { ok: false, error: 'Target AI agent is inactive.' };

    // 2. Resolve the WhatsApp channel (explicit or the company's connected one).
    const channel = params.channelId
        ? await prisma.channel.findFirst({
              where: { id: params.channelId, companyId: params.companyId, type: ChannelType.WHATSAPP },
              select: { id: true, configJson: true },
          })
        : await prisma.channel.findFirst({
              where: { companyId: params.companyId, type: ChannelType.WHATSAPP, status: 'CONNECTED' },
              select: { id: true, configJson: true },
          });
    if (!channel?.configJson) return { ok: false, error: 'No WhatsApp channel configured.' };

    const rawConfig = channel.configJson as { phoneNumberId?: string; accessToken?: unknown };
    const phoneNumberId = rawConfig.phoneNumberId;
    const accessToken = readChannelSecret(rawConfig.accessToken);
    if (!phoneNumberId || !accessToken) {
        return { ok: false, error: 'WhatsApp channel credentials incomplete.' };
    }

    // 3. Find or create the contact; keep its name fresh.
    let contact = await prisma.contact.findFirst({ where: { companyId: params.companyId, phone } });
    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                companyId: params.companyId,
                phone,
                name: params.name || phone,
                originChannel: ChannelType.WHATSAPP,
            },
        });
    } else if (params.name && (!contact.name || contact.name === phone)) {
        contact = await prisma.contact.update({ where: { id: contact.id }, data: { name: params.name } });
    }

    // 4. Tag the contact with its source (find-or-create the tag, then connect).
    if (params.source) {
        let tag = await prisma.tag.findFirst({ where: { companyId: params.companyId, name: params.source } });
        if (!tag) {
            tag = await prisma.tag.create({ data: { companyId: params.companyId, name: params.source } });
        }
        await prisma.contact.update({
            where: { id: contact.id },
            data: { tags: { connect: { id: tag.id } } },
        });
    }

    // 5. Open or reuse a conversation, pre-assigned to the chosen agent, with the
    //    lead's known data attached as context.
    const leadContext = { source: params.source ?? null, ...(params.metadata || {}) } as unknown as Prisma.InputJsonValue;

    let conversation = await prisma.conversation.findFirst({
        where: { companyId: params.companyId, contactId: contact.id, channelId: channel.id, status: 'OPEN' },
        select: { id: true },
    });
    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                companyId: params.companyId,
                channelId: channel.id,
                contactId: contact.id,
                status: 'OPEN',
                handledByAiAgentId: params.agentId,
                leadContextJson: leadContext,
            },
            select: { id: true },
        });
    } else {
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { handledByAiAgentId: params.agentId, leadContextJson: leadContext },
        });
    }

    // 6. Send the opening template (Meta requires a template to business-initiate).
    const sent = await sendTemplateToPhone({
        phoneNumberId,
        accessToken,
        recipientPhone: phone,
        templateName: params.template.name,
        templateLanguage: params.template.language,
        templateComponents: (params.template.components as unknown[]) || [],
    });
    if (!sent.success) {
        return { ok: false, conversationId: conversation.id, contactId: contact.id, error: sent.error };
    }

    await prisma.message.create({
        data: {
            companyId: params.companyId,
            conversationId: conversation.id,
            direction: MessageDirection.OUTBOUND,
            from: phoneNumberId,
            to: phone,
            content: params.template.body || `[Template: ${params.template.name}]`,
            providerMessageId: sent.messageId,
        },
    });
    await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastInboundAt: new Date() }, // template opens the 24h window
    });

    return { ok: true, conversationId: conversation.id, contactId: contact.id, providerMessageId: sent.messageId };
}
