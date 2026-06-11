import { prisma } from '@/lib/prisma';
import { CreditTransactionType } from '@prisma/client';

// Pricing per 1M tokens in COP (with ~2x margin over API cost)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    // OpenAI (2026)
    'gpt-5.5': { input: 42000, output: 252000 },
    'gpt-5.4': { input: 21000, output: 126000 },
    'gpt-5.4-mini': { input: 6300, output: 37800 },
    'gpt-5.4-nano': { input: 1680, output: 10500 },
    // OpenAI (anteriores)
    'gpt-4o-mini': { input: 1260, output: 5040 },
    'gpt-4o': { input: 21000, output: 84000 },
    'gpt-4-turbo': { input: 84000, output: 252000 },
    'gpt-3.5-turbo': { input: 4200, output: 6300 },
    // Anthropic Claude (current models)
    'claude-haiku-4-5-20251001': { input: 6300, output: 25200 },
    'claude-sonnet-4-5-20251030': { input: 25200, output: 126000 },
    'claude-sonnet-4-6': { input: 25200, output: 126000 },
    'claude-opus-4-8': { input: 126000, output: 630000 },
    'claude-opus-4-6': { input: 126000, output: 630000 },
    // Anthropic legacy aliases (for agents already configured)
    'claude-3-5-haiku-20241022': { input: 6300, output: 25200 },
    'claude-3-5-sonnet-20241022': { input: 25200, output: 126000 },
    'claude-3-7-sonnet-20250219': { input: 25200, output: 126000 },
    'claude-opus-4-5': { input: 126000, output: 630000 },
    // Google Gemini (2026)
    'gemini-3.5-flash': { input: 12600, output: 75600 },
    'gemini-2.5-pro': { input: 10500, output: 84000 },
    'gemini-2.5-flash': { input: 2520, output: 21000 },
    // Google Gemini (anteriores)
    'gemini-2.0-flash': { input: 1260, output: 5040 },
    'gemini-2.0-flash-lite': { input: 630, output: 2520 },
    'gemini-1.5-pro': { input: 25200, output: 75600 },
    'gemini-1.5-flash': { input: 1260, output: 5040 },
    // DeepSeek (2026)
    'deepseek-chat': { input: 2310, output: 9240 },
    'deepseek-reasoner': { input: 4620, output: 18480 },
};

const DEFAULT_PRICING = MODEL_PRICING['gpt-4o-mini'];

export function calculateCreditCost(
    model: string,
    promptTokens: number,
    completionTokens: number
): number {
    const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return Math.max(1, Math.round(inputCost + outputCost));
}

export async function checkCreditBalance(
    companyId: string,
    provider: 'openai' | 'anthropic' | 'google' | 'deepseek' = 'openai',
): Promise<{
    hasCredits: boolean;
    usesOwnKey: boolean;
    balance: number;
}> {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
            creditBalance: true,
            openaiApiKey: true,
            anthropicApiKey: true,
            geminiApiKey: true,
            deepseekApiKey: true,
        },
    });

    if (!company) {
        return { hasCredits: false, usesOwnKey: false, balance: 0 };
    }

    let usesOwnKey = false;
    if (provider === 'openai') usesOwnKey = !!company.openaiApiKey;
    else if (provider === 'anthropic') usesOwnKey = !!company.anthropicApiKey;
    else if (provider === 'google') usesOwnKey = !!company.geminiApiKey;
    else if (provider === 'deepseek') usesOwnKey = !!company.deepseekApiKey;

    return {
        hasCredits: usesOwnKey || company.creditBalance > 0,
        usesOwnKey,
        balance: company.creditBalance,
    };
}

export async function deductCredits(params: {
    companyId: string;
    conversationId?: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}): Promise<void> {
    const cost = calculateCreditCost(params.model, params.promptTokens, params.completionTokens);

    // Single interactive transaction: decrement and read the resulting balance
    // atomically, so balanceAfter is always the real post-deduction balance even
    // under concurrent deductions (the previous "patch the latest tx" approach
    // could overwrite the wrong row when two messages ran at once).
    await prisma.$transaction(async (tx) => {
        const updated = await tx.company.update({
            where: { id: params.companyId },
            data: { creditBalance: { decrement: cost } },
            select: { creditBalance: true },
        });
        await tx.creditTransaction.create({
            data: {
                companyId: params.companyId,
                type: CreditTransactionType.AI_USAGE,
                amount: -cost,
                balanceAfter: updated.creditBalance,
                description: `IA: ${params.model} (${params.totalTokens} tokens)`,
            },
        });
        await tx.aiUsageLog.create({
            data: {
                companyId: params.companyId,
                conversationId: params.conversationId,
                model: params.model,
                promptTokens: params.promptTokens,
                completionTokens: params.completionTokens,
                totalTokens: params.totalTokens,
                costCop: cost,
                usedOwnKey: false,
            },
        });
    });
}

/**
 * Record the cost of an AI call: log-only when the company used its own provider
 * key, deduct credits when it ran on Varylo's global key. Use this for every
 * provider call so no AI work goes unbilled (data extraction, OCR, etc.).
 * Never throws — accounting must not break the reply path.
 */
export async function recordAiUsage(params: {
    usesOwnKey: boolean;
    companyId: string;
    conversationId?: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}): Promise<void> {
    if (!params.totalTokens) return;
    const { usesOwnKey, ...rest } = params;
    try {
        if (usesOwnKey) await logUsageOnly(rest);
        else await deductCredits(rest);
    } catch (e) {
        console.error('[credits] recordAiUsage failed:', e instanceof Error ? e.message : e);
    }
}

export async function addCredits(params: {
    companyId: string;
    amount: number;
    type: CreditTransactionType;
    description: string;
    referenceId?: string;
}): Promise<{ success: boolean; newBalance: number }> {
    // Idempotency check for Wompi
    if (params.referenceId) {
        const existing = await prisma.creditTransaction.findUnique({
            where: { referenceId: params.referenceId },
        });
        if (existing) {
            const company = await prisma.company.findUnique({
                where: { id: params.companyId },
                select: { creditBalance: true },
            });
            return { success: true, newBalance: company?.creditBalance ?? 0 };
        }
    }

    const company = await prisma.company.update({
        where: { id: params.companyId },
        data: { creditBalance: { increment: params.amount } },
    });

    await prisma.creditTransaction.create({
        data: {
            companyId: params.companyId,
            type: params.type,
            amount: params.amount,
            balanceAfter: company.creditBalance,
            description: params.description,
            referenceId: params.referenceId,
        },
    });

    return { success: true, newBalance: company.creditBalance };
}

export async function logUsageOnly(params: {
    companyId: string;
    conversationId?: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}): Promise<void> {
    const cost = calculateCreditCost(params.model, params.promptTokens, params.completionTokens);

    await prisma.aiUsageLog.create({
        data: {
            companyId: params.companyId,
            conversationId: params.conversationId,
            model: params.model,
            promptTokens: params.promptTokens,
            completionTokens: params.completionTokens,
            totalTokens: params.totalTokens,
            costCop: cost,
            usedOwnKey: true,
        },
    });
}
