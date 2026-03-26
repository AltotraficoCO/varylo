import { createHmac } from 'crypto';
import type { WebhookConfig } from '@/types/chatbot';

interface WebhookPayload {
    event: string;
    conversationId: string;
    capturedData: Record<string, string>;
    documents: {
        fieldName: string;
        url: string;
        mimeType: string | null;
        fileName: string | null;
    }[];
    timestamp: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // ms
const TIMEOUT_MS = 15000;

/**
 * Sign a payload with HMAC-SHA256.
 */
function signPayload(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Send captured data to an external webhook (ERP, HR platform, etc).
 * Includes HMAC signing, custom headers, and retry logic.
 */
export async function sendWebhook(
    config: WebhookConfig,
    payload: WebhookPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Varylo-Webhook/1.0',
        ...config.headers,
    };

    if (config.secret) {
        headers['X-Varylo-Signature'] = `sha256=${signPayload(body, config.secret)}`;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

            const res = await fetch(config.url, {
                method: 'POST',
                headers,
                body,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (res.ok) {
                console.log(`[Webhook] Sent successfully to ${config.url} (status ${res.status})`);
                return { ok: true, status: res.status };
            }

            // Don't retry 4xx errors (client errors — bad config, not transient)
            if (res.status >= 400 && res.status < 500) {
                const text = await res.text().catch(() => '');
                console.error(`[Webhook] Client error ${res.status} from ${config.url}: ${text.slice(0, 200)}`);
                return { ok: false, status: res.status, error: text.slice(0, 200) };
            }

            // 5xx — retry
            console.warn(`[Webhook] Server error ${res.status} from ${config.url}, attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.warn(`[Webhook] Request failed to ${config.url}, attempt ${attempt + 1}/${MAX_RETRIES + 1}: ${message}`);

            if (attempt === MAX_RETRIES) {
                return { ok: false, error: message };
            }
        }

        // Wait before retrying
        if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        }
    }

    return { ok: false, error: 'Max retries exceeded' };
}

/**
 * Build the webhook payload from captured data only.
 * Does NOT include contact info from the database — only what was explicitly captured.
 */
export function buildWebhookPayload(
    conversationId: string,
    capturedFields: { fieldName: string; fieldValue: string }[],
    documents: { fieldName: string; url: string; mimeType: string | null; fileName: string | null }[],
    eventName: string = 'chatbot.data_captured',
): WebhookPayload {
    const capturedData: Record<string, string> = {};
    for (const field of capturedFields) {
        capturedData[field.fieldName] = field.fieldValue;
    }

    return {
        event: eventName,
        conversationId,
        capturedData,
        documents,
        timestamp: new Date().toISOString(),
    };
}
