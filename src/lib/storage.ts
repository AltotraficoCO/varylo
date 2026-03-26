/**
 * Supabase Storage utility for media files.
 * Uploads files to the "media" bucket and returns public URLs.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'media';

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the public URL or null on failure.
 *
 * Path format: {companyId}/{year-month}/{randomId}.{ext}
 */
export async function uploadToStorage(
    buffer: Buffer,
    path: string,
    mimeType: string,
): Promise<string | null> {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': mimeType,
                    'x-upsert': 'true',
                },
                body: new Uint8Array(buffer),
            },
        );

        if (!res.ok) {
            console.error('[Storage] Upload failed:', res.status, await res.text().catch(() => ''));
            return null;
        }

        // Return public URL
        return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    } catch (error) {
        console.error('[Storage] Upload error:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

/**
 * Upload a base64 data URL to Supabase Storage.
 * Extracts the binary from the data URL and uploads it.
 */
export async function uploadDataUrlToStorage(
    dataUrl: string,
    path: string,
    mimeType: string,
): Promise<string | null> {
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return null;
    const buffer = Buffer.from(base64Data, 'base64');
    return uploadToStorage(buffer, path, mimeType);
}

/**
 * Delete a file from Supabase Storage by its public URL.
 */
export async function deleteFromStorage(publicUrl: string): Promise<boolean> {
    try {
        const prefix = `/storage/v1/object/public/${BUCKET}/`;
        const idx = publicUrl.indexOf(prefix);
        if (idx === -1) return false;
        const path = publicUrl.slice(idx + prefix.length);

        const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            },
        );

        if (!res.ok) {
            console.error('[Storage] Delete failed:', res.status, await res.text().catch(() => ''));
            return false;
        }
        return true;
    } catch (error) {
        console.error('[Storage] Delete error:', error instanceof Error ? error.message : 'Unknown');
        return false;
    }
}

/**
 * Generate a storage path for a media file.
 */
export function buildMediaPath(companyId: string, fileName: string): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const id = crypto.randomUUID().slice(0, 8);
    // Sanitize filename
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    return `${companyId}/${yearMonth}/${id}_${safe}`;
}
