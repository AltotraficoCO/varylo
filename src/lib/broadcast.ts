import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import { readChannelSecret } from '@/lib/channel-config';

async function getWhatsAppConfig(companyId: string) {
  const channel = await prisma.channel.findFirst({
    where: { companyId, type: ChannelType.WHATSAPP, status: 'CONNECTED' },
  });
  if (!channel?.configJson) return null;
  const raw = channel.configJson as {
    phoneNumberId?: string;
    accessToken?: unknown;
    wabaId?: string;
  };
  const config = {
    phoneNumberId: raw.phoneNumberId,
    accessToken: readChannelSecret(raw.accessToken),
    wabaId: raw.wabaId,
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

  const { config } = waConfig;

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

    // Send template via Meta API only — no conversation/message created
    const result = await sendTemplateToPhone({
      phoneNumberId: config.phoneNumberId!,
      accessToken: config.accessToken!,
      recipientPhone: contact.phone,
      templateName: broadcast.templateName,
      templateLanguage: broadcast.templateLang,
      templateComponents: components,
    });

    if (result.success) {
      await prisma.broadcastLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          // Store providerMessageId in errorMessage field for reference (reuse field)
        },
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

    // Update counts
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
