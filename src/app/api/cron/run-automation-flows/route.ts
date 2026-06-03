import { NextRequest, NextResponse } from 'next/server';
import { CronExpressionParser } from 'cron-parser';
import { prisma } from '@/lib/prisma';
import { runAutomationFlow } from '@/jobs/automation-runner';
import { Prisma } from '@prisma/client';
import type { AutomationGraph } from '@/types/automation';

/**
 * Dispatcher for scheduled (cron) automation flows. Runs frequently; for every
 * published flow it checks each cron node and fires the ones whose schedule has
 * ticked since the last run. n8n-style schedule trigger, done with a single
 * platform cron instead of one cron per user flow.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let fired = 0;

    try {
        const flows = await prisma.automationFlow.findMany({
            where: { status: 'PUBLISHED' },
            select: { id: true, companyId: true, graphJson: true, cronStateJson: true },
        });

        for (const flow of flows) {
            const graph = (flow.graphJson || {}) as unknown as AutomationGraph;
            const cronNodes = Object.values(graph?.nodes || {}).filter(n => n.type === 'cron' && n.schedule);
            if (cronNodes.length === 0) continue;

            const state = (flow.cronStateJson as Record<string, string> | null) || {};
            let changed = false;

            for (const node of cronNodes) {
                let prevScheduled: Date;
                try {
                    prevScheduled = CronExpressionParser.parse(node.schedule!, { currentDate: now }).prev().toDate();
                } catch {
                    continue; // invalid cron expression — skip
                }
                const lastRun = state[node.id] ? new Date(state[node.id]) : null;
                const isDue = !lastRun || lastRun < prevScheduled;
                if (!isDue) continue;

                await runAutomationFlow(flow, { triggeredBy: 'cron', at: now.toISOString() }, node.id);
                state[node.id] = now.toISOString();
                changed = true;
                fired++;
            }

            if (changed) {
                await prisma.automationFlow.update({
                    where: { id: flow.id },
                    data: { cronStateJson: state as Prisma.InputJsonValue },
                }).catch(() => {});
            }
        }

        return NextResponse.json({ ok: true, fired });
    } catch (error) {
        console.error('[Cron automation flows] Error:', error);
        return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 });
    }
}
