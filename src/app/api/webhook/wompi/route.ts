import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { addCredits } from '@/lib/credits';
import { CreditTransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getWompiConfig } from '@/lib/wompi-config';
import { handlePaymentSuccess, handlePaymentFailure } from '@/lib/subscriptions';

async function getEventsSecret(): Promise<string | null> {
    const config = await getWompiConfig();
    if (config?.eventsSecret) return config.eventsSecret;
    return process.env.WOMPI_EVENTS_SECRET || null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const event = body.event;
        const data = body.data;
        const signature = body.signature;
        const timestamp = body.timestamp;

        if (event !== 'transaction.updated') {
            return NextResponse.json({ status: 'ignored' });
        }

        // Validate signature
        const eventsSecret = await getEventsSecret();
        if (!eventsSecret) {
            console.error('[Wompi] Events secret not configured');
            return NextResponse.json({ error: 'Not configured' }, { status: 500 });
        }

        const transaction = data?.transaction;
        if (!transaction) {
            return NextResponse.json({ status: 'ignored' });
        }

        // Wompi signature: SHA256 of concatenated properties + timestamp + events_secret
        const signatureString = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${eventsSecret}`;
        const expectedSignature = createHash('sha256').update(signatureString).digest('hex');

        if (signature?.checksum !== expectedSignature) {
            console.error('[Wompi] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const reference = transaction.reference as string;

        // Route: subscription payment
        if (reference?.startsWith('varylo-sub-')) {
            return await handleSubscriptionWebhook(transaction, reference);
        }

        // Route: credit recharge
        if (reference?.startsWith('varylo-')) {
            return await handleCreditRechargeWebhook(transaction, reference);
        }

        console.error('[Wompi] Unknown reference format:', reference);
        return NextResponse.json({ error: 'Unknown reference' }, { status: 400 });
    } catch (error) {
        console.error('[Wompi] Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

async function handleSubscriptionWebhook(transaction: any, reference: string) {
    // Reference format: varylo-sub-{subscriptionId}-{timestamp}
    const parts = reference.split('-');
    // "varylo" "sub" "{subscriptionId parts}" "{timestamp}"
    // subscriptionId is a cuid — extract between 'sub-' and last segment
    const subscriptionId = parts.slice(2, -1).join('-');

    if (!subscriptionId) {
        console.error('[Wompi] Could not extract subscriptionId from reference:', reference);
        return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
    }

    // Find the pending billing attempt for this subscription with this Wompi transaction
    const attempt = await prisma.billingAttempt.findFirst({
        where: {
            subscriptionId,
            wompiTransactionId: transaction.id,
            status: 'PENDING',
        },
    });

    if (!attempt) {
        console.error('[Wompi] No pending attempt found for transaction:', transaction.id);
        return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (transaction.status === 'APPROVED') {
        await handlePaymentSuccess(subscriptionId, attempt.id);
        console.log(`[Wompi] Subscription payment approved: ${subscriptionId}`);
        return NextResponse.json({ status: 'success' });
    }

    if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
        await handlePaymentFailure(subscriptionId, attempt.id, transaction.status_message);
        console.log(`[Wompi] Subscription payment failed: ${subscriptionId} - ${transaction.status}`);
        return NextResponse.json({ status: 'failed' });
    }

    if (transaction.status === 'VOIDED') {
        await prisma.billingAttempt.update({
            where: { id: attempt.id },
            data: { status: 'VOIDED' },
        });
        return NextResponse.json({ status: 'voided' });
    }

    return NextResponse.json({ status: 'ignored' });
}

async function handleCreditRechargeWebhook(transaction: any, reference: string) {
    // Only process APPROVED transactions for credits
    if (transaction.status !== 'APPROVED') {
        return NextResponse.json({ status: 'not_approved' });
    }

    const parts = reference.split('-');
    // Reference format: varylo-{companyId}-{timestamp}
    const companyId = parts.slice(1, -1).join('-');

    if (!companyId) {
        console.error('[Wompi] Could not extract companyId from reference:', reference);
        return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
    });

    if (!company) {
        console.error('[Wompi] Company not found:', companyId);
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // amount_in_cents → COP (divide by 100)
    const amountCop = Math.round(transaction.amount_in_cents / 100);

    const result = await addCredits({
        companyId,
        amount: amountCop,
        type: CreditTransactionType.RECHARGE,
        description: `Recarga Wompi - ${amountCop.toLocaleString('es-CO')} COP`,
        referenceId: transaction.id,
    });

    console.log(`[Wompi] Credits added for company ${companyId}: +${amountCop} COP, new balance: ${result.newBalance}`);

    return NextResponse.json({ status: 'success', newBalance: result.newBalance });
}
