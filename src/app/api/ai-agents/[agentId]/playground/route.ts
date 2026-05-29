import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MessageDirection } from '@prisma/client';
import { handleAiAgentResponse } from '@/jobs/ai-agent';
import { startPlaygroundConversation } from '@/lib/playground';
import { uploadDataUrlToStorage, buildMediaPath } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 4096;
// Keep under Vercel's ~4.5MB request body limit (base64 inflates ~33%).
const MAX_FILE_BYTES = 3 * 1024 * 1024;

type IncomingMedia = { dataUrl: string; fileName?: string; mimeType?: string };

/** Map a MIME type to the engine's mediaType buckets. */
function mediaTypeFromMime(mime: string): string {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    return 'document';
}

/**
 * POST /api/ai-agents/[agentId]/playground
 * Send a simulated customer message to an agent and get its reply, using the
 * real reply engine but on a hidden test conversation (isTest = true).
 *
 * Body: { conversationId?: string, content: string }
 *  - omit conversationId (or send null) to start a fresh test conversation.
 * Returns: { conversationId, responses }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> },
) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = session.user.companyId;
    const { agentId } = await params;

    // Verify the agent belongs to the company
    const agent = await prisma.aiAgent.findFirst({
        where: { id: agentId, companyId },
        select: { id: true },
    });
    if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let body: { conversationId?: string | null; content?: string; media?: IncomingMedia };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const content = (body.content || '').trim();
    const media = body.media;

    if (content.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }
    // Require either text or an attachment.
    if (!content && !media?.dataUrl) {
        return NextResponse.json({ error: 'Envía un mensaje o adjunta un archivo' }, { status: 400 });
    }

    // Validate attachment size up front (base64 length → byte estimate).
    if (media?.dataUrl) {
        const base64 = media.dataUrl.split(',')[1] || '';
        const approxBytes = Math.floor(base64.length * 0.75);
        if (approxBytes > MAX_FILE_BYTES) {
            return NextResponse.json(
                { error: 'El archivo es muy grande para la prueba (máx. 3 MB).' },
                { status: 413 },
            );
        }
    }

    // Resolve the test conversation: reuse if provided + valid, else start fresh
    let conversationId = body.conversationId || undefined;
    if (conversationId) {
        const existing = await prisma.conversation.findFirst({
            where: { id: conversationId, companyId, isTest: true },
            select: { id: true },
        });
        if (!existing) conversationId = undefined;
    }
    if (!conversationId) {
        conversationId = await startPlaygroundConversation(companyId, agentId);
    }

    // Upload the attachment (if any) to storage so the engine's tools
    // (analyze_file / save_document) can fetch it just like a real channel.
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimeType: string | undefined;
    let fileName: string | undefined;
    if (media?.dataUrl) {
        mimeType = (media.mimeType || media.dataUrl.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream').split(';')[0];
        mediaType = mediaTypeFromMime(mimeType);
        fileName = media.fileName || `adjunto.${mimeType.split('/')[1] || 'bin'}`;
        const stored = await uploadDataUrlToStorage(media.dataUrl, buildMediaPath(companyId, fileName), mimeType);
        if (!stored) {
            return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 500 });
        }
        mediaUrl = stored;
    }

    // Save the inbound (simulated customer) message
    const inbound = await prisma.message.create({
        data: {
            companyId,
            conversationId,
            direction: MessageDirection.INBOUND,
            from: 'Prueba',
            to: 'playground',
            content,
            mediaUrl,
            mediaType,
            mimeType,
            fileName,
        },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), lastInboundAt: new Date() },
    });

    // Run the real reply engine (tools, data capture, credits — all as in production).
    // ignoreActiveCheck lets the user test agents that aren't activated yet.
    let result;
    try {
        result = await handleAiAgentResponse(conversationId, content, { ignoreActiveCheck: true });
    } catch (err) {
        console.error('[Playground] Engine error:', err);
        return NextResponse.json(
            { conversationId, responses: [], error: 'El agente no pudo responder. Revisa los créditos o las API keys.' },
            { status: 200 },
        );
    }

    // Return everything created after the inbound message (assistant replies, etc.)
    const responses = await prisma.message.findMany({
        where: { conversationId, createdAt: { gt: inbound.createdAt } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, direction: true, content: true, from: true, createdAt: true },
    });

    // If the engine didn't produce a reply, surface a specific reason so the
    // user knows whether it's credits, the API key, decryption, etc.
    let error: string | undefined;
    if (responses.filter(r => r.direction === 'OUTBOUND').length === 0) {
        error = reasonMessage(result.error, result.errorDetail);
    }

    return NextResponse.json({ conversationId, responses, error });
}

/** Map an engine error code to an actionable Spanish message for the playground. */
function reasonMessage(code?: string, detail?: string): string {
    const tail = detail ? ` (detalle: ${detail})` : '';
    switch (code) {
        case 'no_credits_or_key':
            return 'La empresa no tiene créditos ni una API key propia configurada para el proveedor de este modelo. Agrega créditos o una API key en Integraciones.';
        case 'decrypt_failed':
            return `No se pudo descifrar la API key guardada (el ENCRYPTION_KEY del entorno no coincide con el que la cifró). Vuelve a guardar la API key en Integraciones.${tail}`;
        case 'provider_auth':
            return `El proveedor rechazó la autenticación: la API key no se pudo usar (inválida, expirada, o no se pudo descifrar y no hay key global). Vuelve a guardar una API key válida en Integraciones.${tail}`;
        case 'rate_limited':
            return `El proveedor está saturado o limitó la tasa de peticiones. Intenta de nuevo en unos segundos.${tail}`;
        case 'model_error':
            return `El modelo configurado del agente no está disponible o no existe para esta API key. Revisa el modelo seleccionado.${tail}`;
        case 'empty_response':
            return 'El proveedor respondió sin contenido. Revisa el prompt del agente e inténtalo de nuevo.';
        case 'engine_error':
            return `Ocurrió un error al generar la respuesta.${tail}`;
        default:
            return 'El agente no generó respuesta. Verifica el prompt, los créditos o las API keys.';
    }
}
