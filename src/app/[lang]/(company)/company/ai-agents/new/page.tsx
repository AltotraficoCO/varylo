import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NewAgentFlow } from './new-agent-flow';

export default async function NewAgentPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const [channels, company, ecommerceStores] = await Promise.all([
        prisma.channel.findMany({
            where: { companyId: session.user.companyId },
            select: { id: true, type: true, configJson: true },
        }),
        prisma.company.findUnique({
            where: { id: session.user.companyId },
            select: { googleCalendarRefreshToken: true },
        }),
        prisma.ecommerceIntegration.findMany({
            where: { companyId: session.user.companyId, active: true },
            select: { platform: true },
        }),
    ]);

    return (
        <NewAgentFlow
            lang={lang}
            channels={channels
                .filter(c => !(c.configJson as { isPlayground?: boolean } | null)?.isPlayground)
                .map(c => {
                    const cfg = c.configJson as { label?: string; phoneDisplay?: string; phoneNumberId?: string } | null;
                    return { id: c.id, type: c.type, label: cfg?.label?.trim() || cfg?.phoneDisplay || cfg?.phoneNumberId || undefined };
                })}
            hasGoogleCalendar={!!company?.googleCalendarRefreshToken}
            hasShopify={ecommerceStores.some(s => s.platform === 'shopify')}
            hasWooCommerce={ecommerceStores.some(s => s.platform === 'woocommerce')}
        />
    );
}
