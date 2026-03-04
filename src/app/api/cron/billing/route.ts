import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chargeSubscription, cancelSubscription } from '@/lib/subscriptions';
import { Plan } from '@prisma/client';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_INTERVAL_DAYS = 3;

export async function GET(req: NextRequest) {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        let charged = 0;
        let failed = 0;
        let cancelled = 0;

        // 1. Charge ACTIVE subscriptions whose period has ended
        const dueSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                currentPeriodEnd: { lte: now },
            },
            select: { id: true },
        });

        for (const sub of dueSubscriptions) {
            try {
                await chargeSubscription(sub.id);
                charged++;
            } catch (error) {
                console.error(`[Cron] Failed to charge subscription ${sub.id}:`, error);
                failed++;
            }
        }

        // 2. Charge TRIAL subscriptions whose trial has ended
        const trialEndedSubs = await prisma.subscription.findMany({
            where: {
                status: 'TRIAL',
                currentPeriodEnd: { lte: now },
            },
            select: { id: true },
        });

        for (const sub of trialEndedSubs) {
            // Move trial to ACTIVE and set new period
            await prisma.subscription.update({
                where: { id: sub.id },
                data: { status: 'ACTIVE' },
            });
            try {
                await chargeSubscription(sub.id);
                charged++;
            } catch (error) {
                console.error(`[Cron] Failed to charge trial-ended subscription ${sub.id}:`, error);
                failed++;
            }
        }

        // 3. Retry PAST_DUE subscriptions
        const pastDueSubs = await prisma.subscription.findMany({
            where: { status: 'PAST_DUE' },
            include: {
                billingAttempts: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        for (const sub of pastDueSubs) {
            const lastAttempt = sub.billingAttempts[0];
            if (!lastAttempt) continue;

            // Check if we've exceeded max retries
            if (lastAttempt.attemptNumber >= MAX_RETRY_ATTEMPTS) {
                // Cancel subscription and downgrade to STARTER
                await cancelSubscription(sub.id);
                await prisma.company.update({
                    where: { id: sub.companyId },
                    data: { plan: Plan.STARTER },
                });
                cancelled++;
                console.log(`[Cron] Cancelled subscription ${sub.id} after ${MAX_RETRY_ATTEMPTS} failed attempts`);
                continue;
            }

            // Check if enough time has passed since last attempt
            const daysSinceLastAttempt =
                (now.getTime() - new Date(lastAttempt.createdAt).getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceLastAttempt < RETRY_INTERVAL_DAYS) continue;

            try {
                await chargeSubscription(sub.id);
                charged++;
            } catch (error) {
                console.error(`[Cron] Retry failed for subscription ${sub.id}:`, error);
                failed++;
            }
        }

        const summary = {
            status: 'ok',
            charged,
            failed,
            cancelled,
            dueCount: dueSubscriptions.length,
            trialEndedCount: trialEndedSubs.length,
            pastDueCount: pastDueSubs.length,
            timestamp: now.toISOString(),
        };

        console.log('[Cron] Billing run complete:', summary);
        return NextResponse.json(summary);
    } catch (error) {
        console.error('[Cron] Billing error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
