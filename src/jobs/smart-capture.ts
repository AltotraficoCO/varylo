import { prisma } from '@/lib/prisma';
import { checkCreditBalance } from '@/lib/credits';
import { detectProvider } from '@/lib/ai-provider';
import { transcribeMedia } from '@/lib/vision-ocr';
import { extractAndPersistFields, type CaptureFieldDef } from '@/lib/field-capture';
import type { InboundMediaInfo } from '@/jobs/chatbot';

/**
 * Passive data capture for conversations handled by a HUMAN (not the AI).
 * Runs only when the company enabled account-wide smart capture. Extracts the
 * company's configured capture fields from the recent text and from any
 * document/image in the current inbound message (OCR), filing each into the
 * contact. Self-gates, so it's safe to call on every inbound.
 */
export async function runSmartCapture(conversationId: string, text: string, media?: InboundMediaInfo) {
    void text;
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true, companyId: true, channelId: true, contactId: true, handledByAiAgentId: true,
                company: { select: { smartCaptureEnabled: true } },
                handledByAiAgent: { select: { captureFields: true, model: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 20, select: { direction: true, content: true } },
            },
        });
        if (!conversation) return;

        // Gate: account flag on, AND human-handled (no active AI agent already capturing).
        if (!conversation.company?.smartCaptureEnabled) return;
        if (conversation.handledByAiAgentId) return;

        // Resolve capture fields + model: channel's agent with fields, else any company agent with fields.
        let captureFields = conversation.handledByAiAgent?.captureFields as CaptureFieldDef[] | null;
        let model = conversation.handledByAiAgent?.model || undefined;
        if (!captureFields?.length) {
            const agents = await prisma.aiAgent.findMany({
                where: { companyId: conversation.companyId, active: true },
                select: { captureFields: true, model: true, channels: { select: { id: true } } },
            });
            const hasFields = (a: { captureFields: unknown }) => Array.isArray(a.captureFields) && (a.captureFields as unknown[]).length > 0;
            const onChannel = agents.find(a => a.channels.some(c => c.id === conversation.channelId) && hasFields(a));
            const chosen = onChannel || agents.find(hasFields);
            captureFields = (chosen?.captureFields as CaptureFieldDef[] | null) || null;
            model = chosen?.model;
        }
        if (!captureFields?.length || !model) return;

        // Skip silently if the company can't pay for the extraction calls.
        const credit = await checkCreditBalance(conversation.companyId, detectProvider(model));
        if (!credit.usesOwnKey && !credit.hasCredits) return;

        const { companyId, contactId } = conversation;

        // 1) Extract from recent conversation text.
        const convoText = conversation.messages
            .slice()
            .reverse()
            .filter(m => (m.content || '').trim())
            .map(m => `${m.direction === 'INBOUND' ? 'Cliente' : 'Agente'}: ${m.content}`)
            .join('\n');
        if (convoText.trim()) {
            await extractAndPersistFields({ text: convoText, captureFields, model, companyId, conversationId, contactId });
        }

        // 2) Extract from a document/image in the current inbound message (OCR).
        if (media?.mediaUrl) {
            const isDoc = media.mediaType === 'image'
                || (media.mimeType || '').includes('pdf')
                || (media.fileName || '').toLowerCase().endsWith('.pdf');
            if (isDoc) {
                const { text: ocr } = await transcribeMedia(
                    { mediaUrl: media.mediaUrl, mimeType: media.mimeType, fileName: media.fileName, mediaType: media.mediaType },
                    { companyId, usesOwnKey: credit.usesOwnKey, conversationId },
                );
                if (ocr.trim()) {
                    await extractAndPersistFields({ text: ocr, captureFields, model, companyId, conversationId, contactId });
                }
            }
        }
    } catch (e) {
        console.error('[smart-capture] error:', e instanceof Error ? e.message : e);
    }
}
