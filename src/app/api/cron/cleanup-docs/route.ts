import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFromStorage } from '@/lib/storage';

const EXPIRY_HOURS = 73;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);

        // Find captured documents older than 73 hours that came from chatbot/ai_agent
        // (these are the ones sent via webhook — normal message attachments are untouched)
        const expiredDocs = await prisma.capturedData.findMany({
            where: {
                createdAt: { lt: cutoff },
                source: { in: ['chatbot', 'ai_agent'] },
            },
            select: { id: true, fieldValue: true },
        });

        let deletedCount = 0;
        let storageDeleted = 0;

        for (const doc of expiredDocs) {
            // Check if fieldValue is a JSON document (has url)
            try {
                const parsed = JSON.parse(doc.fieldValue);
                if (parsed && typeof parsed === 'object' && parsed.url) {
                    // It's a document — delete from storage
                    const removed = await deleteFromStorage(parsed.url);
                    if (removed) storageDeleted++;
                }
            } catch {
                // Not JSON — plain text captured data, just delete the record
            }

            // Delete the CapturedData record
            await prisma.capturedData.delete({ where: { id: doc.id } });
            deletedCount++;
        }

        console.log(`[Cleanup] Deleted ${deletedCount} captured data records (${storageDeleted} files from storage)`);

        return NextResponse.json({
            ok: true,
            deleted: deletedCount,
            storageFilesRemoved: storageDeleted,
        });
    } catch (error) {
        console.error('[Cleanup] Error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
