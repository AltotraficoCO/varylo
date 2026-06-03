import { prisma } from '@/lib/prisma';
import { runAutomationFlow } from '@/jobs/automation-runner';

/**
 * POST /api/automations/[flowId]/trigger
 * Entry point for an automation flow. The external app posts the lead payload
 * here, authenticated with the flow's webhook secret.
 *
 * Header: x-automation-secret: <flow webhookSecret>
 * Body:   { "phone": "57...", "name": "...", "source": "ads_form", ... }
 */
export async function POST(req: Request, { params }: { params: Promise<{ flowId: string }> }) {
    const { flowId } = await params;

    const secret = req.headers.get('x-automation-secret');
    if (!secret) {
        return Response.json({ success: false, error: 'Missing x-automation-secret header.' }, { status: 401 });
    }

    const flow = await prisma.automationFlow.findUnique({
        where: { id: flowId },
        select: { id: true, companyId: true, status: true, webhookSecret: true, graphJson: true },
    });

    if (!flow || flow.webhookSecret !== secret) {
        return Response.json({ success: false, error: 'Invalid flow or secret.' }, { status: 401 });
    }
    if (flow.status !== 'PUBLISHED') {
        return Response.json({ success: false, error: 'Flow is not published.' }, { status: 409 });
    }

    let payload: unknown;
    try {
        payload = await req.json();
    } catch {
        return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return Response.json({ success: false, error: 'Body must be a JSON object.' }, { status: 400 });
    }

    const result = await runAutomationFlow(flow, payload as Record<string, unknown>);

    const httpStatus = result.status === 'SUCCESS' ? 200 : result.status === 'NO_MATCH' ? 422 : 400;
    return Response.json(
        {
            success: result.status === 'SUCCESS',
            status: result.status,
            conversationId: result.conversationId,
            error: result.error,
            path: result.path,
        },
        { status: httpStatus },
    );
}
