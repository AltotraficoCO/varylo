import { prisma } from '@/lib/prisma';
import { callAIProvider } from '@/lib/ai-provider';
import { recordAiUsage } from '@/lib/credits';
import { mapFieldToContact } from '@/lib/data-capture-utils';

export interface CaptureFieldDef { key: string; label?: string; required?: boolean }

/** Upsert a captured field and fill the matching Contact column only if empty. */
export async function persistCapturedField(
    companyId: string,
    conversationId: string,
    contactId: string | null,
    fieldName: string,
    value: string,
): Promise<void> {
    const trimmed = (value || '').trim();
    if (!trimmed) return;

    const existing = await prisma.capturedData.findFirst({ where: { conversationId, fieldName }, select: { id: true } });
    if (existing) {
        await prisma.capturedData.update({ where: { id: existing.id }, data: { fieldValue: trimmed } });
    } else {
        await prisma.capturedData.create({
            data: { companyId, conversationId, contactId, fieldName, fieldValue: trimmed, source: 'ai_agent' },
        });
    }

    if (contactId) {
        const contactUpdate = mapFieldToContact(fieldName, trimmed);
        if (contactUpdate) {
            const key = Object.keys(contactUpdate)[0];
            const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { [key]: true } });
            if (contact && !(contact as Record<string, unknown>)[key]) {
                await prisma.contact.update({ where: { id: contactId }, data: contactUpdate }).catch(() => {});
            }
        }
    }
}

/**
 * Extract the given capture fields from a block of text using a structured LLM
 * call, and persist each found value. Returns "Label: value" lines for what was saved.
 */
export async function extractAndPersistFields(params: {
    text: string;
    captureFields: CaptureFieldDef[];
    model: string;
    companyId: string;
    conversationId: string;
    contactId: string | null;
}): Promise<string[]> {
    const { text, captureFields, model, companyId, conversationId, contactId } = params;
    if (!text.trim() || !captureFields?.length) return [];

    const fieldList = captureFields.map(f => `- ${f.key}${f.label ? ` (${f.label})` : ''}`).join('\n');
    let parsed: Record<string, unknown>;
    try {
        const extraction = await callAIProvider({
            model,
            temperature: 0,
            companyId,
            tools: [],
            messages: [
                { role: 'system', content: 'Eres un extractor de datos. Respondes ÚNICAMENTE con un objeto JSON válido, sin texto adicional.' },
                { role: 'user', content: `Del siguiente texto, identifica estos campos. Responde SOLO con un JSON {clave: valor} usando EXACTAMENTE estas claves. Si un campo no aparece, omítelo (no inventes).\n\nCampos:\n${fieldList}\n\nTexto:\n${text.slice(0, 12000)}` },
            ],
        });
        await recordAiUsage({ usesOwnKey: extraction.usesOwnKey, companyId, conversationId, model, promptTokens: extraction.usage.promptTokens, completionTokens: extraction.usage.completionTokens, totalTokens: extraction.usage.totalTokens });
        const rawJson = (extraction.content || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        parsed = JSON.parse(rawJson) as Record<string, unknown>;
    } catch (e) {
        console.error('[field-capture] extraction failed:', e instanceof Error ? e.message : e);
        return [];
    }

    const saved: string[] = [];
    for (const f of captureFields) {
        const v = parsed[f.key];
        if (v == null || v === '') continue;
        const value = String(typeof v === 'object' ? JSON.stringify(v) : v).trim();
        if (!value) continue;
        await persistCapturedField(companyId, conversationId, contactId, f.key, value);
        saved.push(`${f.label || f.key}: ${value}`);
    }
    return saved;
}

const SNAKE = /^[a-z][a-z0-9_]*$/;

/**
 * Open-ended extraction: detect ANY personal/contact data in the text and let
 * the model choose sensible field names. No predefined fields needed — this is
 * what makes smart capture work without configuring an agent.
 */
export async function extractOpenFields(params: {
    text: string;
    model: string;
    companyId: string;
    conversationId: string;
    contactId: string | null;
}): Promise<string[]> {
    const { text, model, companyId, conversationId, contactId } = params;
    if (!text.trim()) return [];

    let parsed: Record<string, unknown>;
    try {
        const extraction = await callAIProvider({
            model,
            temperature: 0,
            companyId,
            tools: [],
            messages: [
                { role: 'system', content: 'Eres un extractor de datos. Respondes ÚNICAMENTE con un objeto JSON válido, sin texto adicional.' },
                {
                    role: 'user',
                    content: `Del siguiente texto de una conversación o documento, extrae TODOS los datos personales o de contacto que el cliente haya proporcionado: nombre, telefono, email, cedula (o documento), direccion, ciudad, empresa, cargo, fecha_nacimiento, y cualquier otro dato relevante. Devuelve SOLO un objeto JSON { "clave_snake_case": "valor" } con claves claras en español, minúsculas y guion bajo. Incluye únicamente datos REALMENTE presentes; no inventes. Si no hay datos, devuelve {}.\n\nTexto:\n${text.slice(0, 12000)}`,
                },
            ],
        });
        await recordAiUsage({ usesOwnKey: extraction.usesOwnKey, companyId, conversationId, model, promptTokens: extraction.usage.promptTokens, completionTokens: extraction.usage.completionTokens, totalTokens: extraction.usage.totalTokens });
        const rawJson = (extraction.content || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        parsed = JSON.parse(rawJson) as Record<string, unknown>;
    } catch (e) {
        console.error('[field-capture] open extraction failed:', e instanceof Error ? e.message : e);
        return [];
    }

    const saved: string[] = [];
    for (const [rawKey, rawVal] of Object.entries(parsed)) {
        if (rawVal == null || rawVal === '') continue;
        const key = rawKey.toString().trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!SNAKE.test(key)) continue;
        const value = String(typeof rawVal === 'object' ? JSON.stringify(rawVal) : rawVal).trim();
        if (!value) continue;
        await persistCapturedField(companyId, conversationId, contactId, key, value);
        saved.push(`${key}: ${value}`);
    }
    return saved;
}
