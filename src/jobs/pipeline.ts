import { handleChatbotResponse, type InboundMediaInfo } from '@/jobs/chatbot';
import { handleAiAgentResponse } from '@/jobs/ai-agent';
import { analyzeConversation } from '@/jobs/ai';
import { runSmartCapture } from '@/jobs/smart-capture';
import type { AutomationPriority } from '@prisma/client';

/**
 * Shared automation pipeline used by all webhook routes.
 * Runs chatbot and AI agent in the order determined by the channel's automationPriority.
 */
export async function runAutomationPipeline(
    conversationId: string,
    text: string,
    priority: AutomationPriority = 'CHATBOT_FIRST',
    media?: InboundMediaInfo,
) {
    // Passive smart capture for human-handled conversations (self-gated by the
    // company flag + whether an AI agent is active). Fire-and-forget.
    runSmartCapture(conversationId, text, media).catch(() => {});

    try {
        if (priority === 'AI_FIRST') {
            // AI agent first, then chatbot fallback
            const aiResult = await handleAiAgentResponse(conversationId, text);
            if (aiResult.handled) return;

            const chatbotResult = await handleChatbotResponse(conversationId, text, media);
            if (chatbotResult.handled) {
                if (chatbotResult.transferToAi) {
                    // Already tried AI and it didn't handle — fall through to analysis
                } else {
                    return;
                }
            }
        } else {
            // Chatbot first (default), then AI agent
            const chatbotResult = await handleChatbotResponse(conversationId, text, media);
            if (chatbotResult.handled) {
                if (chatbotResult.transferToAi) {
                    // Fall through to AI agent
                } else {
                    return;
                }
            }

            const aiResult = await handleAiAgentResponse(conversationId, text);
            if (aiResult.handled) return;
        }

        // Fallback: analysis
        await analyzeConversation(conversationId);
    } catch (err) {
        console.error('[Pipeline] Processing error:', err);
    }
}
