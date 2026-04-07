import { auth } from '@/auth';
import { hasActiveSubscription } from '@/lib/subscriptions';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

/**
 * Server component that blocks access when subscription is expired.
 * Wrap page content with this component to enforce subscription checks.
 */
export async function SubscriptionGate({
    children,
    featureName,
}: {
    children: React.ReactNode;
    featureName: string;
}) {
    const session = await auth();
    const companyId = session?.user?.companyId;

    if (!companyId) return null;

    const isActive = await hasActiveSubscription(companyId);

    if (!isActive) {
        // Extract lang from the URL or default to 'es'
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-md text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-semibold">Suscripcion vencida</h2>
                    <p className="text-muted-foreground">
                        Para usar <strong>{featureName}</strong> necesitas una suscripcion activa.
                        Renueva tu plan para continuar.
                    </p>
                    <Link
                        href="/es/company/settings?tab=billing"
                        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Renovar plan
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
