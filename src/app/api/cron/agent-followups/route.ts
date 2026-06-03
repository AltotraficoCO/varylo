import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, MessageDirection } from '@prisma/client';
import { sendChannelMessage } from '@/lib/channel-sender';
import { sendTemplateToPhone } from '@/lib/broadcast';
import { readChannelSecret } from '@/lib/channel-config';

interface FollowupStep { delayMinutes: number; text?: string; templateName?: string; templateLang?: string }
interface FollowupConfig { enabled?: boolean; steps?: FollowupStep[] }

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Automatic follow-ups. For agents with follow-ups enabled, re-engage OPEN
 * conversations where the customer went silent. Steps are counted from the
 * customer's last inbound message; a new customer reply resets the sequence.
 * WhatsApp rule: free text only within 24h of the last inbound — beyond that a
 * step must use an approved template, or it's skipped.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    let sent = 0;

    try {
        const agents = await prisma.aiAgent.findMany({
            where: { active: true, followupJson: { path: ['enabled'], equals: true } },
            select: { id: true, name: true, companyId: true, followupJson: true },
        });

        for (const agent of agents) {
            const cfg = (agent.followupJson || {}) as FollowupConfig;
            const steps = (cfg.steps || []).filter(s => s && typeof s.delayMinutes === 'number');
            if (steps.length === 0) continue;
            const minDelayMs = Math.min(...steps.map(s => s.delayMinutes)) * 60_000;

            const conversations = await prisma.conversation.findMany({
                where: {
                    status: 'OPEN',
                    isTest: false,
                    handledByAiAgentId: agent.id,
                    lastInboundAt: { not: null, lt: new Date(now - minDelayMs) },
                },
                include: { contact: true, channel: true },
                take: 200,
            });

            for (const conv of conversations) {
                if (!conv.lastInboundAt) continue;
                // Only follow up when we're waiting on the customer (we sent the last message).
                if (conv.lastMessageAt.getTime() <= conv.lastInboundAt.getTime()) continue;

                const anchor = conv.lastInboundAt.toISOString();
                const prev = (conv.followupJson || {}) as { step?: number; anchor?: string };
                // Customer replied since our last follow-up → restart the sequence.
                let step = prev.anchor === anchor ? (prev.step ?? 0) : 0;
                if (step >= steps.length) continue;

                const elapsed = now - conv.lastInboundAt.getTime();
                const nextStep = steps[step];
                if (elapsed < nextStep.delayMinutes * 60_000) continue;

                const withinWindow = elapsed < WINDOW_MS;
                let delivered = false;

                if (withinWindow && nextStep.text?.trim()) {
                    await sendChannelMessage({
                        conversationId: conv.id,
                        companyId: agent.companyId,
                        content: nextStep.text.trim(),
                        fromName: agent.name,
                    }).then(() => { delivered = true; }).catch(() => {});
                } else if (nextStep.templateName) {
                    const raw = conv.channel?.configJson as { phoneNumberId?: string; accessToken?: unknown } | null;
                    const phoneNumberId = raw?.phoneNumberId;
                    const accessToken = readChannelSecret(raw?.accessToken);
                    if (phoneNumberId && accessToken && conv.contact?.phone) {
                        const res = await sendTemplateToPhone({
                            phoneNumberId,
                            accessToken,
                            recipientPhone: conv.contact.phone,
                            templateName: nextStep.templateName,
                            templateLanguage: nextStep.templateLang || 'es',
                            templateComponents: [],
                        });
                        if (res.success) {
                            delivered = true;
                            await prisma.message.create({
                                data: {
                                    companyId: agent.companyId,
                                    conversationId: conv.id,
                                    direction: MessageDirection.OUTBOUND,
                                    from: phoneNumberId,
                                    to: conv.contact.phone,
                                    content: nextStep.text?.trim() || `[Seguimiento: ${nextStep.templateName}]`,
                                    providerMessageId: res.messageId,
                                },
                            }).catch(() => {});
                            await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } }).catch(() => {});
                        }
                    }
                }

                // Advance the step when delivered; if outside the window with no template,
                // stop the sequence (can't reach them) by jumping past the last step.
                const newStep = delivered ? step + 1 : (withinWindow ? step : steps.length);
                await prisma.conversation.update({
                    where: { id: conv.id },
                    data: { followupJson: { step: newStep, anchor } as Prisma.InputJsonValue },
                }).catch(() => {});
                if (delivered) sent++;
            }
        }

        return NextResponse.json({ ok: true, sent });
    } catch (error) {
        console.error('[Agent follow-ups] Error:', error);
        return NextResponse.json({ error: 'Follow-up dispatch failed' }, { status: 500 });
    }
}
