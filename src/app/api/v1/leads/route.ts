import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { dispatchLead } from '@/lib/lead-dispatch';

/**
 * POST /api/v1/leads
 * Ingest a lead from an external app and start an outbound WhatsApp conversation
 * handled by a specific AI agent.
 *
 * Body:
 * {
 *   "phone": "573001234567",
 *   "name": "Carolina",
 *   "agentId": "<ai agent id>",          // Phase 0: caller picks the agent
 *   "source": "ads_form",                // tags the contact + injected as context
 *   "metadata": { "vertical": "ia" },    // injected so the agent doesn't re-ask
 *   "template": { "name": "apertura_ads", "language": "es", "components": [] }
 * }
 */
export async function POST(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'messages:write');
    if (scopeError) return scopeError;

    const { companyId } = authResult.context;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!body.phone || typeof body.phone !== 'string') {
        return Response.json({ success: false, error: 'Field "phone" is required.' }, { status: 400 });
    }
    if (!body.agentId || typeof body.agentId !== 'string') {
        return Response.json({ success: false, error: 'Field "agentId" is required.' }, { status: 400 });
    }
    if (!body.template?.name || !body.template?.language) {
        return Response.json(
            {
                success: false,
                error: 'Field "template" with "name" and "language" is required (WhatsApp requires a template to start a conversation).',
            },
            { status: 400 },
        );
    }

    const result = await dispatchLead({
        companyId,
        agentId: body.agentId,
        phone: body.phone,
        name: typeof body.name === 'string' ? body.name : undefined,
        source: typeof body.source === 'string' ? body.source : undefined,
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
        template: {
            name: body.template.name,
            language: body.template.language,
            components: body.template.components,
            body: body.template.body,
        },
        channelId: typeof body.channelId === 'string' ? body.channelId : undefined,
    });

    if (!result.ok) {
        return Response.json(
            { success: false, error: result.error, conversationId: result.conversationId },
            { status: 400 },
        );
    }

    return Response.json({
        success: true,
        conversationId: result.conversationId,
        contactId: result.contactId,
        providerMessageId: result.providerMessageId,
    });
}
