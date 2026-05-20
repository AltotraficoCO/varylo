import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

/**
 * Assign a conversation to an agent based on the company's configured strategy.
 * Returns the userId to assign, or null if no assignment should happen.
 */
export async function assignAgent(companyId: string): Promise<string | null> {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
            assignmentStrategy: true,
            specificAgentId: true,
            roundRobinLastUserId: true,
            excludedAgentIds: true,
        },
    });

    if (!company) return null;

    const excluded = company.excludedAgentIds ?? [];

    switch (company.assignmentStrategy) {
        case 'LEAST_BUSY':
            return leastBusy(companyId, excluded);

        case 'ROUND_ROBIN':
            return roundRobin(companyId, company.roundRobinLastUserId, excluded);

        case 'SPECIFIC_AGENT':
            return specificAgent(companyId, company.specificAgentId);

        case 'MANUAL_ONLY':
            return null;

        default:
            return leastBusy(companyId, excluded);
    }
}

/** Backward-compatible alias — now respects the company's configured strategy. */
export const findLeastBusyAgent = assignAgent;

// --- Strategy implementations ---

async function getActiveAgents(companyId: string, excluded: string[] = []) {
    return prisma.user.findMany({
        where: {
            companyId,
            active: true,
            role: { in: [Role.AGENT, Role.COMPANY_ADMIN] },
            ...(excluded.length > 0 ? { id: { notIn: excluded } } : {}),
        },
        select: {
            id: true,
            _count: {
                select: {
                    assignedConversations: {
                        where: { status: 'OPEN' },
                    },
                },
            },
        },
    });
}

async function leastBusy(companyId: string, excluded: string[] = []): Promise<string | null> {
    const users = await getActiveAgents(companyId, excluded);
    if (users.length === 0) return null;

    users.sort((a, b) => a._count.assignedConversations - b._count.assignedConversations);
    return users[0].id;
}

async function roundRobin(companyId: string, lastUserId: string | null, excluded: string[] = []): Promise<string | null> {
    const users = await prisma.user.findMany({
        where: {
            companyId,
            active: true,
            role: { in: [Role.AGENT, Role.COMPANY_ADMIN] },
            ...(excluded.length > 0 ? { id: { notIn: excluded } } : {}),
        },
        select: { id: true },
        orderBy: { id: 'asc' },
    });

    if (users.length === 0) return null;

    let nextIndex = 0;
    if (lastUserId) {
        const lastIndex = users.findIndex(u => u.id === lastUserId);
        nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % users.length;
    }

    const selectedId = users[nextIndex].id;

    // Update round-robin pointer
    await prisma.company.update({
        where: { id: companyId },
        data: { roundRobinLastUserId: selectedId },
    });

    return selectedId;
}

async function specificAgent(companyId: string, agentId: string | null): Promise<string | null> {
    if (!agentId) return leastBusy(companyId);

    // Verify the agent is still active in this company
    const agent = await prisma.user.findFirst({
        where: {
            id: agentId,
            companyId,
            active: true,
        },
        select: { id: true },
    });

    if (!agent) return leastBusy(companyId);
    return agent.id;
}
