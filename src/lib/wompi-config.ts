import { prisma } from '@/lib/prisma';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const secret = process.env.WOMPI_ENCRYPTION_KEY;
    if (!secret) throw new Error('WOMPI_ENCRYPTION_KEY env var not set');
    return scryptSync(secret, 'wompi-salt', 32);
}

export function encrypt(text: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv:tag:encrypted (all hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encoded: string): string {
    const key = getEncryptionKey();
    const [ivHex, tagHex, encryptedHex] = encoded.split(':');
    if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid encrypted format');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
}

export type WompiConfigData = {
    publicKey: string;
    privateKey: string;
    eventsSecret: string;
    integritySecret: string;
    isSandbox: boolean;
    webhookUrl: string | null;
};

/**
 * Read Wompi config from DB, fall back to env vars.
 */
export async function getWompiConfig(): Promise<WompiConfigData | null> {
    try {
        const config = await prisma.wompiConfig.findFirst();
        if (config) {
            return {
                publicKey: config.publicKey,
                privateKey: decrypt(config.privateKey),
                eventsSecret: decrypt(config.eventsSecret),
                integritySecret: decrypt(config.integritySecret),
                isSandbox: config.isSandbox,
                webhookUrl: config.webhookUrl,
            };
        }
    } catch {
        // Table may not exist yet or decryption may fail — fall through to env vars
    }

    // Fallback to env vars
    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!publicKey || !eventsSecret) return null;

    return {
        publicKey,
        privateKey: privateKey || '',
        eventsSecret,
        integritySecret: integritySecret || '',
        isSandbox: publicKey.startsWith('pub_test_'),
        webhookUrl: null,
    };
}

export function getWompiBaseUrl(isSandbox: boolean): string {
    return isSandbox
        ? 'https://sandbox.wompi.co'
        : 'https://production.wompi.co';
}

/**
 * Mask a secret for display — show first 8 and last 4 chars.
 */
export function maskSecret(value: string): string {
    if (value.length <= 12) return '••••••••';
    return `${value.slice(0, 8)}${'•'.repeat(8)}${value.slice(-4)}`;
}
