import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { findLeastBusyAgent } from '@/lib/assign-agent';

async function getWhatsAppConfig(companyId: string) {
  const channel = await prisma.channel.findFirst({
    where: { companyId, type: ChannelType.WHATSAPP, status: 'CONNECTED' },
  });
  if (!channel?.configJson) return null;
  const config = channel.configJson as {
    phoneNumberId?: string;
    accessToken?: string;
    wabaId?: string;
  };
  if (!config.phoneNumberId || !config.accessToken) return null;
  return { channel, config };
}

export async function sendTemplateToPhone(params: {
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string;
  templateName: string;
  templateLanguage: string;
  templateComponents: any[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const templatePayload: any = {
      name: params.templateName,
      language: { code: params.templateLanguage },
    };
    if (params.templateComponents.length > 0) {
      templatePayload.components = params.templateComponents;
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${params.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.recipientPhone,
          type: 'template',
          template: templatePayload,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = (data as any)?.error?.message || `HTTP ${res.status}`;
      return { success: false, error: errorMsg };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de red' };
  }
}

export async function executeBroadcast(broadcastId: string) {
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    include: {
      logs: {
        where: { status: 'PENDING' },
        include: { contact: true },
      },
    },
  });

  if (!broadcast) throw new Error('Broadcast not found');
  console.log(`[Broadcast ${broadcastId}] Starting with ${broadcast.logs.length} pending contacts`);

  const waConfig = await getWhatsAppConfig(broadcast.companyId);
  if (!waConfig) {
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'FAILED', completedAt: new Date() },
    });
    throw new Error('No WhatsApp channel configured');
  }

  const { channel, config } = waConfig;

  // Mark as in progress
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  let sentCount = broadcast.sentCount;
  let failedCount = broadcast.failedCount;
  const components = (broadcast.templateComponents as any[]) || [];

  for (const log of broadcast.logs) {
    const contact = log.contact;
    if (!contact.phone) {
      await prisma.broadcastLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage: 'Sin número de teléfono' },
      });
      failedCount++;
      continue;
    }

    // Send template
    const result = await sendTemplateToPhone({
      phoneNumberId: config.phoneNumberId!,
      accessToken: config.accessToken!,
      recipientPhone: contact.phone,
      templateName: broadcast.templateName,
      templateLanguage: broadcast.templateLang,
      templateComponents: components,
    });

    if (result.success) {
      // Create or find conversation + save message
      let conversation = await prisma.conversation.findFirst({
        where: {
          companyId: broadcast.companyId,
          contactId: contact.id,
          channelId: channel.id,
          status: 'OPEN',
        },
      });

      if (!conversation) {
        const agentId = (await findLeastBusyAgent(broadcast.companyId)) || broadcast.createdById;
        conversation = await prisma.conversation.create({
          data: {
            companyId: broadcast.companyId,
            channelId: channel.id,
            contactId: contact.id,
            status: 'OPEN',
            assignedAgents: { connect: { id: agentId } },
          },
        });
      }

      await prisma.message.create({
        data: {
          companyId: broadcast.companyId,
          conversationId: conversation.id,
          direction: MessageDirection.OUTBOUND,
          from: config.phoneNumberId!,
          to: contact.phone,
          content: broadcast.templateBody || `[Plantilla: ${broadcast.templateName}]`,
          providerMessageId: result.messageId,
          senderId: broadcast.createdById,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      await prisma.broadcastLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
      sentCount++;
      console.log(`[Broadcast ${broadcastId}] Sent to ${contact.phone} (${sentCount}/${broadcast.totalContacts})`);
    } else {
      await prisma.broadcastLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage: result.error },
      });
      failedCount++;
      console.log(`[Broadcast ${broadcastId}] Failed for ${contact.phone}: ${result.error}`);
    }

    // Update counts periodically
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { sentCount, failedCount },
    });

    // Rate limit: wait 1 second between sends
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Mark completed
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      status: failedCount === broadcast.totalContacts ? 'FAILED' : 'COMPLETED',
      sentCount,
      failedCount,
      completedAt: new Date(),
    },
  });

  return { sentCount, failedCount };
}
