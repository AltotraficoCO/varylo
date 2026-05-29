import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { decryptMaybe } from '@/lib/encryption';

const globalForOpenAI = globalThis as unknown as {
    openai: OpenAI | undefined;
    companyClients: Map<string, { client: OpenAI; cachedAt: number }> | undefined;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getOpenAI(): OpenAI {
    if (!globalForOpenAI.openai) {
        globalForOpenAI.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return globalForOpenAI.openai;
}

export async function getOpenAIForCompany(companyId: string): Promise<{ client: OpenAI; usesOwnKey: boolean }> {
    // Check cache first
    if (!globalForOpenAI.companyClients) {
        globalForOpenAI.companyClients = new Map();
    }
    const cached = globalForOpenAI.companyClients.get(companyId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return { client: cached.client, usesOwnKey: true };
    }

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { openaiApiKey: true },
    });

    if (company?.openaiApiKey) {
        try {
            const decryptedKey = decryptMaybe(company.openaiApiKey);
            const client = new OpenAI({ apiKey: decryptedKey });
            globalForOpenAI.companyClients.set(companyId, { client, cachedAt: Date.now() });
            return { client, usesOwnKey: true };
        } catch (error) {
            console.error(`[OpenAI] Failed to decrypt API key for company ${companyId}, falling back to global key`);
        }
    }

    return { client: getOpenAI(), usesOwnKey: false };
}
