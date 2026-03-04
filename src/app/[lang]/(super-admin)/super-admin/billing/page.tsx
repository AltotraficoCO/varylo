import { getLandingPlansWithPricing } from "./actions"
import { PlanManager } from "./plan-manager"
import { WompiConfigCard } from "./wompi-config-card"

export default async function BillingPage() {
    const plans = await getLandingPlansWithPricing();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Planes y Facturación</h3>
                <p className="text-sm text-muted-foreground">
                    Gestiona los planes, precios de suscripción y configuración de Wompi.
                </p>
            </div>

            <WompiConfigCard />
            <PlanManager initialPlans={plans} />
        </div>
    );
}
