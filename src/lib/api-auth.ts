import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export interface ApiKeyContext {
    apiKeyId: string;
    companyId: string;
    scopes: string[];
}

function hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key from the Authorization header.
 * Returns the company context or an error response.
 */
export async function authenticateApiKey(
    req: Request
): Promise<{ context: ApiKeyContext } | { error: Response }> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return {
            error: Response.json(
                { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' },
                { status: 401 }
            ),
        };
    }

    const rawKey = authHeader.slice(7).trim();
    if (!rawKey || rawKey.length > 200) {
        return {
            error: Response.json({ error: 'Invalid API key format.' }, { status: 401 }),
        };
    }

    const hashed = hashKey(rawKey);

    const apiKey = await prisma.apiKey.findUnique({
        where: { hashedKey: hashed },
        include: {
            company: { select: { status: true } },
        },
    });

    if (!apiKey || !apiKey.active) {
        return {
            error: Response.json({ error: 'Invalid or inactive API key.' }, { status: 401 }),
        };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return {
            error: Response.json({ error: 'API key has expired.' }, { status: 401 }),
        };
    }

    if (apiKey.company.status === 'SUSPENDED') {
        return {
            error: Response.json({ error: 'Account is suspended.' }, { status: 403 }),
        };
    }

    // Rate limit by API key
    const rateResult = checkRateLimit(apiKey.id, {
        prefix: 'api-v1',
        limit: apiKey.rateLimit,
        windowSeconds: 60,
    });

    if (!rateResult.success) {
        return {
            error: new Response(
                JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
                        'X-RateLimit-Limit': String(rateResult.limit),
                        'X-RateLimit-Remaining': '0',
                    },
                }
            ),
        };
    }

    // Update lastUsedAt (fire and forget)
    prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
        context: {
            apiKeyId: apiKey.id,
            companyId: apiKey.companyId,
            scopes: apiKey.scopes,
        },
    };
}

/**
 * Check if the API key has the required scope.
 */
export function requireScope(
    context: ApiKeyContext,
    scope: string
): Response | null {
    if (!context.scopes.includes(scope)) {
        return Response.json(
            { error: `Insufficient permissions. Required scope: ${scope}` },
            { status: 403 }
        );
    }
    return null;
}
