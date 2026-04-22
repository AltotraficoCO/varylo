'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Role, MessageDirection } from '@prisma/client';

export async function getAnalyticsData(heatmapDays: number = 7) {
    const session = await auth();
    if (!session?.user?.companyId) return null;
    const companyId = session.user.companyId;

    // --- 1. Conversations Summary ---
    // Abrir: Total conversations with status OPEN
    const openCount = await prisma.conversation.count({
        where: { companyId, status: 'OPEN' }
    });

    // Sin asignar: OPEN and no assigned agents
    const unassignedCount = await prisma.conversation.count({
        where: { companyId, status: 'OPEN', assignedAgents: { none: {} } }
    });

    // Desatendido: OPEN conversations with no activity in 24h
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const unattendedCount = await prisma.conversation.count({
        where: {
            companyId,
            status: 'OPEN',
            lastMessageAt: { lt: yesterday }
        }
    });

    // Pendientes: OPEN conversations where the last message is INBOUND (customer waiting for reply)
    const openConversations = await prisma.conversation.findMany({
        where: { companyId, status: 'OPEN' },
        select: {
            id: true,
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { direction: true },
            },
        },
    });
    const pendingCount = openConversations.filter(
        c => c.messages[0]?.direction === MessageDirection.INBOUND
    ).length;

    // --- 2. Agent Status ---
    // Uses the real UserStatus field from the database
    const allAgents = await prisma.user.findMany({
        where: {
            companyId,
            role: { in: [Role.AGENT, Role.COMPANY_ADMIN] }
        },
        include: {
            assignedConversations: {
                where: { status: 'OPEN' }
            }
        }
    });

    let onlineCount = 0;
    let busyCount = 0;
    let offlineCount = 0;

    for (const agent of allAgents) {
        if (agent.status === 'ONLINE') {
            onlineCount++;
        } else if (agent.status === 'BUSY') {
            busyCount++;
        } else {
            offlineCount++;
        }
    }

    // --- 3. Traffic Heatmap ---
    // Count messages in the last 7 days, grouped by DayOfWeek (0-6) and Hour (0-23)
    // Prisma doesn't do complex date grouping well without raw query.
    // Let's verify database provider. Postgres usually supports date_part.

    // Fallback: Fetch metadata of recent messages and aggregate in JS (safe for < 10k messages)
    // Or use groupBy if possible? groupBy doesn't support date parts extracted.
    // Let's user raw query for efficiency or JS for simplicity if volume is low.
    // JS approach for MVP consistency/safety.

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - heatmapDays);

    const recentMessages = await prisma.message.findMany({
        where: {
            companyId,
            createdAt: { gte: sevenDaysAgo }
        },
        select: { createdAt: true }
    });

    // Initialize 7x24 grid
    // Days: 0 (Sun) - 6 (Sat). The UI mock shows dates, so we map accordingly.
    const heatmap: Record<string, number> = {};

    recentMessages.forEach(msg => {
        const date = new Date(msg.createdAt);
        const day = date.getDay(); // 0-6
        const hour = date.getHours(); // 0-23
        const key = `${day}-${hour}`;
        heatmap[key] = (heatmap[key] || 0) + 1;
    });


    // --- 4. Conversaciones por agentes (Detailed) ---
    const conversationsByAgent = allAgents.map(agent => {
        const unattended = agent.assignedConversations.filter(
            c => c.lastMessageAt < yesterday
        ).length;

        return {
            id: agent.id,
            name: agent.name || agent.email,
            email: agent.email,
            role: agent.role,
            avatar: agent.name?.[0] || '?',
            status: agent.status === 'ONLINE' ? 'active' : agent.status === 'BUSY' ? 'busy' : 'inactive',
            openCount: agent.assignedConversations.length,
            unattendedCount: unattended,
        };
    });

    // --- 5. Teams ---
    const teamsData: any[] = []; // Empty for now

    // --- 6. AI Insights Metrics ---
    const insights = await prisma.conversationInsight.findMany({
        where: { companyId },
    });

    let avgTone = 0;
    let avgClarity = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    if (insights.length > 0) {
        let toneSum = 0;
        let claritySum = 0;
        let toneCount = 0;
        let clarityCount = 0;

        for (const ins of insights) {
            if (ins.toneScore != null) { toneSum += ins.toneScore; toneCount++; }
            if (ins.clarityScore != null) { claritySum += ins.clarityScore; clarityCount++; }
            const flags = ins.flagsJson as { sentiment?: string } | null;
            if (flags?.sentiment === 'positive') positiveCount++;
            else if (flags?.sentiment === 'negative') negativeCount++;
            else neutralCount++;
        }

        avgTone = toneCount > 0 ? Math.round(toneSum / toneCount) : 0;
        avgClarity = clarityCount > 0 ? Math.round(claritySum / clarityCount) : 0;
    }

    return {
        summary: {
            open: openCount,
            unattended: unattendedCount,
            unassigned: unassignedCount,
            pending: pendingCount
        },
        agentStatus: {
            online: onlineCount,
            busy: busyCount,
            offline: offlineCount
        },
        heatmap,
        conversationsByAgent,
        teamsData,
        aiMetrics: {
            totalInsights: insights.length,
            avgTone,
            avgClarity,
            positive: positiveCount,
            neutral: neutralCount,
            negative: negativeCount,
        }
    };
}
