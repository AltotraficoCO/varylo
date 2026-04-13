import { prisma } from '@/lib/prisma';
import { CreditTransactionType } from '@prisma/client';

// Pricing per 1M tokens in COP (with ~2x margin over API cost)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    // OpenAI
    'gpt-4o-mini': { input: 1260, output: 5040 },
    'gpt-4o': { input: 21000, output: 84000 },
    'gpt-4-turbo': { input: 84000, output: 252000 },
    'gpt-3.5-turbo': { input: 4200, output: 6300 },
    // Anthropic Claude (current models)
    'claude-haiku-4-5-20251001': { input: 6300, output: 25200 },
    'claude-sonnet-4-5-20251030': { input: 25200, output: 126000 },
    'claude-sonnet-4-6': { input: 25200, output: 126000 },
    'claude-opus-4-6': { input: 126000, output: 630000 },
    // Anthropic legacy aliases (for agents already configured)
    'claude-3-5-haiku-20241022': { input: 6300, output: 25200 },
    'claude-3-5-sonnet-20241022': { input: 25200, output: 126000 },
    'claude-3-7-sonnet-20250219': { input: 25200, output: 126000 },
    'claude-opus-4-5': { input: 126000, output: 630000 },
    // Google Gemini
    'gemini-2.0-flash': { input: 1260, output: 5040 },
    'gemini-2.0-flash-lite': { input: 630, output: 2520 },
    'gemini-1.5-pro': { input: 25200, output: 75600 },
    'gemini-1.5-flash': { input: 1260, output: 5040 },
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
    provider: 'openai' | 'anthropic' | 'google' = 'openai',
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
        },
    });

    if (!company) {
        return { hasCredits: false, usesOwnKey: false, balance: 0 };
    }

    let usesOwnKey = false;
    if (provider === 'openai') usesOwnKey = !!company.openaiApiKey;
    else if (provider === 'anthropic') usesOwnKey = !!company.anthropicApiKey;
    else if (provider === 'google') usesOwnKey = !!company.geminiApiKey;

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

    await prisma.$transaction([
        prisma.company.update({
            where: { id: params.companyId },
            data: { creditBalance: { decrement: cost } },
        }),
        prisma.creditTransaction.create({
            data: {
                companyId: params.companyId,
                type: CreditTransactionType.AI_USAGE,
                amount: -cost,
                balanceAfter: 0, // will be updated below
                description: `IA: ${params.model} (${params.totalTokens} tokens)`,
            },
        }),
        prisma.aiUsageLog.create({
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
        }),
    ]);

    // Update balanceAfter on the transaction
    const company = await prisma.company.findUnique({
        where: { id: params.companyId },
        select: { creditBalance: true },
    });
    if (company) {
        const lastTx = await prisma.creditTransaction.findFirst({
            where: { companyId: params.companyId },
            orderBy: { createdAt: 'desc' },
        });
        if (lastTx) {
            await prisma.creditTransaction.update({
                where: { id: lastTx.id },
                data: { balanceAfter: company.creditBalance },
            });
        }
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
