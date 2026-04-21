import Anthropic from '@anthropic-ai/sdk';
import { getOpenAIForCompany } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

// ── Types ────────────────────────────────────────────────────────────

export type NormalizedMessage =
    | { role: 'system'; content: string }
    | { role: 'user'; content: string }
    | { role: 'assistant'; content: string | null; toolCalls?: NormalizedToolCall[] }
    | { role: 'tool'; toolCallId: string; toolName: string; content: string };

export type NormalizedToolCall = {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
};

export type NormalizedTool = {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
};

export type NormalizedCompletion = {
    content: string | null;
    toolCalls: NormalizedToolCall[];
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    finishReason: 'stop' | 'tool_calls' | 'length';
    usesOwnKey: boolean;
};

export type AIProvider = 'openai' | 'anthropic' | 'google';

// ── Provider detection ───────────────────────────────────────────────

// Deprecated model → current replacement. Keeps existing agents working after Anthropic EOLs.
const MODEL_ALIASES: Record<string, string> = {
    'claude-3-5-haiku-20241022': 'claude-haiku-4-5-20251001',
    'claude-3-5-sonnet-20241022': 'claude-sonnet-4-6',
    'claude-3-7-sonnet-20250219': 'claude-sonnet-4-6',
    'claude-opus-4-5': 'claude-opus-4-6',
};

export function resolveModel(model: string): string {
    return MODEL_ALIASES[model] ?? model;
}

export function detectProvider(model: string): AIProvider {
    const resolved = resolveModel(model);
    if (resolved.startsWith('claude-')) return 'anthropic';
    if (resolved.startsWith('gemini-')) return 'google';
    return 'openai';
}

// ── Client factories ─────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;

const globalForAI = globalThis as unknown as {
    anthropicClients: Map<string, { client: Anthropic; cachedAt: number }> | undefined;
    geminiKeys: Map<string, { key: string; cachedAt: number }> | undefined;
};

export async function getAnthropicForCompany(companyId: string): Promise<{ client: Anthropic; usesOwnKey: boolean }> {
    if (!globalForAI.anthropicClients) globalForAI.anthropicClients = new Map();
    const cached = globalForAI.anthropicClients.get(companyId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return { client: cached.client, usesOwnKey: true };
    }

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { anthropicApiKey: true },
    });

    if (company?.anthropicApiKey) {
        try {
            const decryptedKey = decrypt(company.anthropicApiKey);
            const client = new Anthropic({ apiKey: decryptedKey });
            globalForAI.anthropicClients.set(companyId, { client, cachedAt: Date.now() });
            return { client, usesOwnKey: true };
        } catch {
            console.error(`[Anthropic] Failed to decrypt key for company ${companyId}, using global key`);
        }
    }

    const globalKey = process.env.ANTHROPIC_API_KEY;
    return { client: new Anthropic({ apiKey: globalKey }), usesOwnKey: false };
}

export async function getGeminiKeyForCompany(companyId: string): Promise<{ key: string; usesOwnKey: boolean }> {
    if (!globalForAI.geminiKeys) globalForAI.geminiKeys = new Map();
    const cached = globalForAI.geminiKeys.get(companyId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return { key: cached.key, usesOwnKey: true };
    }

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { geminiApiKey: true },
    });

    if (company?.geminiApiKey) {
        try {
            const decryptedKey = decrypt(company.geminiApiKey);
            globalForAI.geminiKeys.set(companyId, { key: decryptedKey, cachedAt: Date.now() });
            return { key: decryptedKey, usesOwnKey: true };
        } catch {
            console.error(`[Gemini] Failed to decrypt key for company ${companyId}, using global key`);
        }
    }

    return { key: process.env.GEMINI_API_KEY || '', usesOwnKey: false };
}

// ── OpenAI converters ────────────────────────────────────────────────

function toOpenAIMessages(messages: NormalizedMessage[]): ChatCompletionMessageParam[] {
    return messages.map(m => {
        if (m.role === 'system') return { role: 'system', content: m.content };
        if (m.role === 'user') return { role: 'user', content: m.content };
        if (m.role === 'tool') return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
        if (m.role === 'assistant') {
            if (m.toolCalls?.length) {
                return {
                    role: 'assistant',
                    content: m.content || null,
                    tool_calls: m.toolCalls.map(tc => ({
                        type: 'function' as const,
                        id: tc.id,
                        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
                    })),
                };
            }
            return { role: 'assistant', content: m.content || '' };
        }
        throw new Error(`Unknown message role: ${(m as Record<string, unknown>).role}`);
    });
}

function toOpenAITools(tools: NormalizedTool[]): ChatCompletionTool[] {
    return tools.map(t => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters as Record<string, unknown> },
    }));
}

// ── Anthropic converters ─────────────────────────────────────────────

function toAnthropicMessages(messages: NormalizedMessage[]): {
    system: string;
    messages: Anthropic.MessageParam[];
} {
    const system = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');

    const nonSystem = messages.filter(m => m.role !== 'system');
    const result: Anthropic.MessageParam[] = [];
    let i = 0;

    while (i < nonSystem.length) {
        const m = nonSystem[i];

        if (m.role === 'user') {
            result.push({ role: 'user', content: m.content });
            i++;
        } else if (m.role === 'assistant') {
            if (m.toolCalls?.length) {
                // Use plain objects cast to the param type (SDK adds fields like citations/caller on responses, not inputs)
                const content = [
                    ...(m.content ? [{ type: 'text' as const, text: m.content }] : []),
                    ...m.toolCalls.map(tc => ({ type: 'tool_use' as const, id: tc.id, name: tc.name, input: tc.arguments })),
                ] as Anthropic.MessageParam['content'];
                result.push({ role: 'assistant', content });
            } else {
                result.push({ role: 'assistant', content: m.content || '' });
            }
            i++;
        } else if (m.role === 'tool') {
            // Batch consecutive tool results into a single user message
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            while (i < nonSystem.length && nonSystem[i].role === 'tool') {
                const t = nonSystem[i] as Extract<NormalizedMessage, { role: 'tool' }>;
                toolResults.push({ type: 'tool_result', tool_use_id: t.toolCallId, content: t.content });
                i++;
            }
            result.push({ role: 'user', content: toolResults });
        } else {
            i++;
        }
    }

    return { system, messages: result };
}

function toAnthropicTools(tools: NormalizedTool[]): Anthropic.Tool[] {
    return tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool['input_schema'],
    }));
}

// ── Gemini converters ────────────────────────────────────────────────

type GeminiPart =
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

function toGeminiContents(messages: NormalizedMessage[]): {
    systemInstruction: string;
    contents: GeminiContent[];
} {
    const systemInstruction = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');

    const nonSystem = messages.filter(m => m.role !== 'system');
    const contents: GeminiContent[] = [];
    let i = 0;

    while (i < nonSystem.length) {
        const m = nonSystem[i];

        if (m.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: m.content }] });
            i++;
        } else if (m.role === 'assistant') {
            if (m.toolCalls?.length) {
                const parts: GeminiPart[] = [];
                if (m.content) parts.push({ text: m.content });
                for (const tc of m.toolCalls) {
                    parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
                }
                contents.push({ role: 'model', parts });
            } else {
                contents.push({ role: 'model', parts: [{ text: m.content || '' }] });
            }
            i++;
        } else if (m.role === 'tool') {
            // Batch consecutive tool results into a single user message
            const parts: GeminiPart[] = [];
            while (i < nonSystem.length && nonSystem[i].role === 'tool') {
                const t = nonSystem[i] as Extract<NormalizedMessage, { role: 'tool' }>;
                parts.push({ functionResponse: { name: t.toolName, response: { output: t.content } } });
                i++;
            }
            contents.push({ role: 'user', parts });
        } else {
            i++;
        }
    }

    return { systemInstruction, contents };
}

// ── Unified call ─────────────────────────────────────────────────────

export async function callAIProvider(params: {
    model: string;
    temperature: number;
    messages: NormalizedMessage[];
    tools: NormalizedTool[];
    companyId: string;
}): Promise<NormalizedCompletion> {
    const model = resolveModel(params.model);
    const provider = detectProvider(model);

    // ── OpenAI ──────────────────────────────────────────────────────
    if (provider === 'openai') {
        const { client, usesOwnKey } = await getOpenAIForCompany(params.companyId);
        const openaiMessages = toOpenAIMessages(params.messages);
        const openaiTools = params.tools.length > 0 ? toOpenAITools(params.tools) : undefined;

        const response = await client.chat.completions.create({
            model,
            temperature: params.temperature,
            messages: openaiMessages,
            ...(openaiTools ? { tools: openaiTools } : {}),
        });

        const choice = response.choices[0];
        const msg = choice?.message;
        type FnToolCall = { id: string; function: { name: string; arguments: string } };
        const toolCalls: NormalizedToolCall[] = (msg?.tool_calls || [])
            .filter((tc): tc is FnToolCall & typeof tc => 'function' in tc)
            .map(tc => ({
                id: tc.id,
                name: (tc as FnToolCall).function.name,
                arguments: JSON.parse((tc as FnToolCall).function.arguments) as Record<string, unknown>,
            }));

        return {
            content: msg?.content || null,
            toolCalls,
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
            finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
            usesOwnKey,
        };
    }

    // ── Anthropic ────────────────────────────────────────────────────
    if (provider === 'anthropic') {
        const { client, usesOwnKey } = await getAnthropicForCompany(params.companyId);
        const { system, messages: anthropicMessages } = toAnthropicMessages(params.messages);
        const anthropicTools = params.tools.length > 0 ? toAnthropicTools(params.tools) : undefined;

        const response = await client.messages.create({
            model,
            max_tokens: 4096,
            temperature: params.temperature,
            ...(system ? { system } : {}),
            messages: anthropicMessages,
            ...(anthropicTools ? { tools: anthropicTools } : {}),
        });

        const textContent = response.content
            .filter(b => b.type === 'text')
            .map(b => (b as { type: 'text'; text: string }).text)
            .join('');
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as {
            type: 'tool_use'; id: string; name: string; input: unknown;
        }[];

        const toolCalls: NormalizedToolCall[] = toolUseBlocks.map(tu => ({
            id: tu.id,
            name: tu.name,
            arguments: tu.input as Record<string, unknown>,
        }));

        return {
            content: textContent || null,
            toolCalls,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
            usesOwnKey,
        };
    }

    // ── Google Gemini ────────────────────────────────────────────────
    if (provider === 'google') {
        const { key, usesOwnKey } = await getGeminiKeyForCompany(params.companyId);
        const { systemInstruction, contents } = toGeminiContents(params.messages);

        const requestBody: Record<string, unknown> = {
            contents,
            generationConfig: { temperature: params.temperature },
        };

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        if (params.tools.length > 0) {
            requestBody.tools = [{
                functionDeclarations: params.tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                })),
            }];
        }

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': key,
                },
                body: JSON.stringify(requestBody),
            },
        );

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
        }

        const data = await res.json() as {
            candidates?: {
                content?: { parts?: Array<Record<string, unknown>> };
                finishReason?: string;
            }[];
            usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
            };
        };

        const parts = data.candidates?.[0]?.content?.parts || [];
        const textParts = parts.filter(p => typeof p.text === 'string') as { text: string }[];
        const fnCallParts = parts.filter(p => p.functionCall) as {
            functionCall: { name: string; args: Record<string, unknown> };
        }[];

        const toolCalls: NormalizedToolCall[] = fnCallParts.map((p, idx) => ({
            id: `gemini-tc-${idx}-${Date.now()}`,
            name: p.functionCall.name,
            arguments: p.functionCall.args || {},
        }));

        const promptTokens = data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

        return {
            content: textParts.map(p => p.text).join('') || null,
            toolCalls,
            usage: {
                promptTokens,
                completionTokens,
                totalTokens: data.usageMetadata?.totalTokenCount || promptTokens + completionTokens,
            },
            finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
            usesOwnKey,
        };
    }

    throw new Error(`Unknown provider for model: ${params.model}`);
}
