import { prisma } from '@/lib/prisma';
import { checkCreditBalance } from '@/lib/credits';
import { detectProvider } from '@/lib/ai-provider';
import { transcribeMedia } from '@/lib/vision-ocr';
import { extractOpenFields } from '@/lib/field-capture';
import type { InboundMediaInfo } from '@/jobs/chatbot';

/** Pick an extraction model from whatever the company has active. */
function resolveCaptureModel(keys: {
    anthropicApiKey?: string | null;
    openaiApiKey?: string | null;
    geminiApiKey?: string | null;
    deepseekApiKey?: string | null;
}): string {
    if (keys.anthropicApiKey) return 'claude-haiku-4-5-20251001';
    if (keys.openaiApiKey) return 'gpt-4o-mini';
    if (keys.geminiApiKey) return 'gemini-2.0-flash';
    if (keys.deepseekApiKey) return 'deepseek-chat';
    return 'gpt-4o-mini'; // global key (requires Varylo credits)
}

/**
 * Passive, open-ended data capture for conversations handled by a HUMAN (not the
 * AI). Runs only when the company enabled account-wide smart capture. It detects
 * ANY personal/contact data in the recent text and in the current inbound
 * document/image (OCR) — no agent or predefined fields needed — and files each
 * datum into the contact. Self-gates, so it's safe to call on every inbound.
 */
export async function runSmartCapture(conversationId: string, text: string, media?: InboundMediaInfo) {
    void text;
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true, companyId: true, contactId: true, handledByAiAgentId: true,
                company: {
                    select: {
                        smartCaptureEnabled: true,
                        anthropicApiKey: true, openaiApiKey: true, geminiApiKey: true, deepseekApiKey: true,
                    },
                },
                messages: { orderBy: { createdAt: 'desc' }, take: 20, select: { direction: true, content: true } },
            },
        });
        if (!conversation) return;

        // Gate: account flag on, AND human-handled (no active AI agent already capturing).
        if (!conversation.company?.smartCaptureEnabled) return;
        if (conversation.handledByAiAgentId) return;

        const model = resolveCaptureModel(conversation.company);

        // Requires an active AI model: own key OR Varylo credits. Else skip silently.
        const credit = await checkCreditBalance(conversation.companyId, detectProvider(model));
        if (!credit.usesOwnKey && !credit.hasCredits) return;

        const { companyId, contactId } = conversation;

        // Signal the UI that capture is running (polled, auto-expires).
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { smartCapturingUntil: new Date(Date.now() + 15_000) },
        }).catch(() => {});

        // 1) Open extraction from what the CUSTOMER wrote only. Never the agent's
        //    own messages — those are not the contact's data.
        const convoText = conversation.messages
            .slice()
            .reverse()
            .filter(m => m.direction === 'INBOUND' && (m.content || '').trim())
            .map(m => m.content)
            .join('\n');
        if (convoText.trim()) {
            await extractOpenFields({ text: convoText, model, companyId, conversationId, contactId });
        }

        // 2) Open extraction from a document/image in the current inbound message (OCR).
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
                    await extractOpenFields({ text: ocr, model, companyId, conversationId, contactId });
                }
            }
        }
    } catch (e) {
        console.error('[smart-capture] error:', e instanceof Error ? e.message : e);
    }
}
