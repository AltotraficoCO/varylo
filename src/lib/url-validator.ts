import { lookup } from 'dns/promises';

const PRIVATE_HOSTNAMES = new Set([
    'localhost',
    'ip6-localhost',
    'ip6-loopback',
    'broadcasthost',
]);

function isPrivateOrReservedIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('::ffff:')) {
        return isPrivateOrReservedIPv4(lower.replace('::ffff:', ''));
    }
    return false;
}

export type ValidatedUrl = { ok: true; url: URL } | { ok: false; error: string };

/**
 * Validates that a webhook URL is safe to fetch. Performs two passes:
 *  1. Synchronous hostname check — rejects obvious private literals before any DNS work.
 *  2. DNS lookup — rejects hostnames that resolve to private/loopback/link-local addresses.
 * Only http(s) schemes are allowed. In production, only https.
 */
export async function validateExternalWebhookUrl(input: string): Promise<ValidatedUrl> {
    if (!input || typeof input !== 'string') {
        return { ok: false, error: 'URL requerida' };
    }

    let parsed: URL;
    try {
        parsed = new URL(input.trim());
    } catch {
        return { ok: false, error: 'URL inválida' };
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (parsed.protocol !== 'https:' && (isProd || parsed.protocol !== 'http:')) {
        return { ok: false, error: 'Solo se permite https' };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (PRIVATE_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
        return { ok: false, error: 'Host no permitido' };
    }

    if (isPrivateOrReservedIPv4(hostname) || isPrivateOrReservedIPv6(hostname)) {
        return { ok: false, error: 'Host no permitido' };
    }

    try {
        const addrs = await lookup(hostname, { all: true });
        for (const a of addrs) {
            if (a.family === 4 && isPrivateOrReservedIPv4(a.address)) {
                return { ok: false, error: 'Host no permitido' };
            }
            if (a.family === 6 && isPrivateOrReservedIPv6(a.address)) {
                return { ok: false, error: 'Host no permitido' };
            }
        }
    } catch {
        return { ok: false, error: 'Host no resolvible' };
    }

    return { ok: true, url: parsed };
}
