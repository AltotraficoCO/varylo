import { getOpenAIForCompany } from '@/lib/openai';
import { getAnthropicForCompany, getGeminiKeyForCompany } from '@/lib/ai-provider';
import { deductCredits, logUsageOnly } from '@/lib/credits';

export interface OcrMedia {
    mediaUrl: string;
    mimeType?: string | null;
    fileName?: string | null;
    mediaType?: string | null;
}

const DEFAULT_INSTRUCTION =
    'Transcribe TODO el texto visible del documento o imagen, campo por campo, tal como aparece, sin resumir ni omitir nada.';

function isRefusal(t: string): boolean {
    const lower = t.toLowerCase().trim();
    return lower.startsWith('lo siento') || lower.startsWith("i'm sorry") ||
        lower.startsWith('i am sorry') || lower.includes("can't assist") ||
        lower.includes('cannot assist') || lower.includes('no puedo ayudar') ||
        (lower.length < 80 && (lower.includes('sorry') || lower.includes('lo siento')));
}

/**
 * Transcribe an image or PDF to text via the company's vision providers.
 * Priority: Gemini (company/global key) → Claude (company key) → gpt-4o (company key, images only).
 * Returns the transcription, or empty string if no provider succeeded.
 */
export async function transcribeMedia(
    media: OcrMedia,
    opts: { companyId: string; usesOwnKey: boolean; instruction?: string; conversationId?: string },
): Promise<{ text: string; model: string }> {
    const { companyId, usesOwnKey } = opts;
    const instruction = opts.instruction || DEFAULT_INSTRUCTION;
    const isPdf = (media.mimeType || '').includes('pdf') || (media.fileName || '').toLowerCase().endsWith('.pdf');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Short-lived signed URL so gpt-4o can fetch the image directly.
    let accessUrl = media.mediaUrl;
    if (media.mediaUrl.includes('supabase') && SUPABASE_URL && SUPABASE_KEY) {
        try {
            const pathMatch = media.mediaUrl.match(/\/storage\/v1\/object\/(?:public\/)?media\/(.+)$/);
            if (pathMatch) {
                const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/media/${pathMatch[1]}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expiresIn: 120 }),
                });
                if (signRes.ok) {
                    const { signedURL } = await signRes.json() as { signedURL?: string };
                    if (signedURL) {
                        const normalizedPath = signedURL.startsWith('/storage/v1') ? signedURL : `/storage/v1${signedURL}`;
                        accessUrl = `${SUPABASE_URL}${normalizedPath}`;
                    }
                }
            }
        } catch (e) {
            console.error('[vision-ocr] sign URL error:', e instanceof Error ? e.message : e);
        }
    }

    // Download bytes (needed for Gemini/Claude base64).
    let imageBuffer: Buffer | null = null;
    let imageMime = media.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg');
    try {
        const dlHeaders: Record<string, string> = {};
        if (media.mediaUrl.includes('supabase') && SUPABASE_KEY) dlHeaders['Authorization'] = `Bearer ${SUPABASE_KEY}`;
        const dlRes = await fetch(media.mediaUrl, { headers: dlHeaders });
        if (dlRes.ok) {
            imageBuffer = Buffer.from(await dlRes.arrayBuffer());
            const ct = dlRes.headers.get('content-type')?.split(';')[0];
            if (ct && (ct.startsWith('image/') || ct === 'application/pdf')) imageMime = ct;
        }
    } catch { /* non-critical */ }

    let text = '';
    let model = '';

    // 1. Gemini
    if (!text.trim() && imageBuffer) {
        const { key: geminiKey } = await getGeminiKeyForCompany(companyId);
        if (geminiKey) {
            try {
                const res = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: instruction }, { inline_data: { mime_type: imageMime, data: imageBuffer.toString('base64') } }] }],
                            generationConfig: { temperature: 0.1 },
                        }),
                    },
                );
                if (res.ok) {
                    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
                    const out = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (out.trim()) { text = out; model = 'gemini-2.0-flash'; }
                }
            } catch (e) { console.error('[vision-ocr] Gemini failed:', e instanceof Error ? e.message : e); }
        }
    }

    // 2. Claude vision (company Anthropic key)
    if (!text.trim() && imageBuffer) {
        const { client, usesOwnKey: usesAnthropicKey } = await getAnthropicForCompany(companyId);
        if (usesAnthropicKey) {
            try {
                const mediaBlock = isPdf
                    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: imageBuffer.toString('base64') } }
                    : { type: 'image' as const, source: { type: 'base64' as const, media_type: imageMime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBuffer.toString('base64') } };
                const res = await client.messages.create({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 4096,
                    system: 'You are a professional OCR service. Accurately read and transcribe all visible text from the provided image or PDF exactly as it appears. Reproduce every character without interpreting, summarizing, or omitting anything.',
                    messages: [{ role: 'user', content: [{ type: 'text', text: instruction }, mediaBlock] }],
                });
                const out = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('');
                if (out.trim() && !isRefusal(out)) { text = out; model = 'claude-haiku-4-5-20251001'; }
            } catch (e) { console.error('[vision-ocr] Claude failed:', e instanceof Error ? e.message : e); }
        }
    }

    // 3. gpt-4o (company OpenAI key, images only)
    if (!text.trim() && !isPdf) {
        const { client, usesOwnKey: usesOpenAIKey } = await getOpenAIForCompany(companyId);
        if (usesOpenAIKey) {
            try {
                const res = await client.chat.completions.create({
                    model: 'gpt-4o',
                    temperature: 0.1,
                    messages: [
                        { role: 'system', content: 'You are a professional OCR service. Accurately read and transcribe all visible text from images exactly as it appears. Reproduce every character without interpreting, summarizing, or omitting anything.' },
                        { role: 'user', content: [{ type: 'text', text: instruction }, { type: 'image_url', image_url: { url: accessUrl, detail: 'high' } }] },
                    ],
                });
                const out = res.choices[0]?.message?.content || '';
                if (out.trim() && !isRefusal(out)) {
                    text = out;
                    model = 'gpt-4o';
                    if (res.usage) {
                        const fn = usesOwnKey ? logUsageOnly : deductCredits;
                        await fn({ companyId, conversationId: opts.conversationId, model: 'gpt-4o', promptTokens: res.usage.prompt_tokens, completionTokens: res.usage.completion_tokens, totalTokens: res.usage.total_tokens });
                    }
                }
            } catch (e) { console.error('[vision-ocr] gpt-4o failed:', e instanceof Error ? e.message : e); }
        }
    }

    return { text, model };
}
