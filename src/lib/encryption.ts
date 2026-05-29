import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    return Buffer.from(key, 'hex');
}

export function encrypt(text: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * True if the value has the `iv:tag:ciphertext` shape produced by `encrypt()`.
 * Used to distinguish encrypted values from legacy plaintext secrets stored
 * before encryption was introduced.
 */
export function isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return (
        parts.length === 3 &&
        parts[0].length === IV_LENGTH * 2 &&
        parts[1].length === TAG_LENGTH * 2 &&
        /^[0-9a-f]+$/i.test(parts[0]) &&
        /^[0-9a-f]+$/i.test(parts[1])
    );
}

/**
 * Decrypt a value that may be encrypted or stored as legacy plaintext (saved
 * before encryption was introduced). Plaintext is returned unchanged, so a
 * client's previously-registered API key keeps working without re-saving it.
 */
export function decryptMaybe(value: string): string {
    return isEncrypted(value) ? decrypt(value) : value;
}

export function decrypt(encryptedText: string): string {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
