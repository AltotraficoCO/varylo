import { encrypt, decrypt } from '@/lib/encryption';

const ENCRYPTED_MARKER = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i;

/**
 * Detects whether a value looks like an aes-256-gcm encrypted payload
 * from `encrypt()` (iv:tag:ciphertext, all hex). Legacy plaintext tokens
 * don't match this shape, so we decrypt only when the shape matches.
 */
function looksEncrypted(value: string): boolean {
    return ENCRYPTED_MARKER.test(value);
}

/** Read a secret string out of a channel's configJson, decrypting if needed. */
export function readChannelSecret(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length === 0) return undefined;
    if (!looksEncrypted(value)) return value;
    try {
        return decrypt(value);
    } catch {
        return undefined;
    }
}

/** Encrypt a secret before persisting it into a channel's configJson. */
export function writeChannelSecret(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    if (looksEncrypted(value)) return value; // already encrypted, don't double-wrap
    return encrypt(value);
}
