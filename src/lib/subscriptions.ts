import { prisma } from '@/lib/prisma';
import { createTransaction } from '@/lib/wompi';
import { Plan } from '@prisma/client';

const PLAN_SLUG_TO_ENUM: Record<string, Plan> = {
    STARTER: Plan.STARTER,
    PRO: Plan.PRO,
    SCALE: Plan.SCALE,
};

/**
 * Create a new subscription for a company.
 */
export async function createSubscription(
    companyId: string,
    planPricingId: string,
    paymentSourceId: string,
) {
    const pricing = await prisma.planPricing.findUniqueOrThrow({
        where: { id: planPricingId },
        include: { landingPlan: { select: { slug: true } } },
    });

    const now = new Date();
    const periodEnd = new Date(now);

    // If trial, don't charge immediately
    if (pricing.trialDays > 0) {
        periodEnd.setDate(periodEnd.getDate() + pricing.trialDays);
        const subscription = await prisma.subscription.create({
            data: {
                companyId,
                planPricingId,
                paymentSourceId,
                status: 'TRIAL',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
        });

        // Upgrade company plan
        const planEnum = PLAN_SLUG_TO_ENUM[pricing.landingPlan.slug];
        if (planEnum) {
            await prisma.company.update({
                where: { id: companyId },
                data: { plan: planEnum },
            });
        }

        return subscription;
    }

    // No trial — create subscription + charge
    periodEnd.setDate(periodEnd.getDate() + pricing.billingPeriodDays);
    const subscription = await prisma.subscription.create({
        data: {
            companyId,
            planPricingId,
            paymentSourceId,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
        },
    });

    // Create first billing attempt
    await chargeSubscription(subscription.id);

    return subscription;
}

/**
 * Charge a subscription: create a Wompi transaction + BillingAttempt.
 */
export async function chargeSubscription(subscriptionId: string) {
    const sub = await prisma.subscription.findUniqueOrThrow({
        where: { id: subscriptionId },
        include: {
            planPricing: true,
            paymentSource: true,
            billingAttempts: {
                where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            },
        },
    });

    const reference = `varylo-sub-${subscriptionId}-${Date.now()}`;
    const attemptNumber = sub.billingAttempts.length + 1;

    const attempt = await prisma.billingAttempt.create({
        data: {
            subscriptionId,
            amountInCents: sub.planPricing.priceInCents,
            status: 'PENDING',
            attemptNumber,
        },
    });

    try {
        const tx = await createTransaction({
            amountInCents: sub.planPricing.priceInCents,
            paymentSourceId: sub.paymentSource.wompiSourceId,
            reference,
            customerEmail: sub.paymentSource.wompiCustomerEmail,
        });

        await prisma.billingAttempt.update({
            where: { id: attempt.id },
            data: { wompiTransactionId: tx.id },
        });

        return { attempt, wompiTransactionId: tx.id };
    } catch (error: any) {
        await prisma.billingAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'ERROR',
                errorReason: error.message || 'Transaction creation failed',
            },
        });
        throw error;
    }
}

/**
 * Handle successful payment — extend subscription period, upgrade plan.
 */
export async function handlePaymentSuccess(subscriptionId: string, attemptId: string) {
    const sub = await prisma.subscription.findUniqueOrThrow({
        where: { id: subscriptionId },
        include: {
            planPricing: {
                include: { landingPlan: { select: { slug: true } } },
            },
        },
    });

    const newPeriodStart = sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
    const newPeriodEnd = new Date(newPeriodStart);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + sub.planPricing.billingPeriodDays);

    await prisma.$transaction([
        prisma.billingAttempt.update({
            where: { id: attemptId },
            data: { status: 'APPROVED' },
        }),
        prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: 'ACTIVE',
                currentPeriodStart: newPeriodStart,
                currentPeriodEnd: newPeriodEnd,
            },
        }),
    ]);

    // Ensure company plan matches
    const planEnum = PLAN_SLUG_TO_ENUM[sub.planPricing.landingPlan.slug];
    if (planEnum) {
        await prisma.company.update({
            where: { id: sub.companyId },
            data: { plan: planEnum },
        });
    }

    console.log(`[Subscription] Payment success for sub ${subscriptionId}, new period ends ${newPeriodEnd.toISOString()}`);
}

/**
 * Handle failed payment — mark PAST_DUE.
 */
export async function handlePaymentFailure(
    subscriptionId: string,
    attemptId: string,
    reason?: string,
) {
    await prisma.$transaction([
        prisma.billingAttempt.update({
            where: { id: attemptId },
            data: {
                status: 'DECLINED',
                errorReason: reason || 'Payment declined',
            },
        }),
        prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: 'PAST_DUE' },
        }),
    ]);

    console.log(`[Subscription] Payment failure for sub ${subscriptionId}: ${reason}`);
}

/**
 * Cancel subscription.
 */
export async function cancelSubscription(subscriptionId: string) {
    await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
        },
    });

    console.log(`[Subscription] Cancelled subscription ${subscriptionId}`);
}
