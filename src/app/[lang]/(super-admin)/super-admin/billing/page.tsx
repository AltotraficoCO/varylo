import { getLandingPlansWithPricing } from "./actions"
import { PlanManager } from "./plan-manager"
import { PaymentGateways } from "./payment-gateways"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function BillingPage() {
    const plans = await getLandingPlansWithPricing();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Planes & Facturación</h2>
                <p className="text-muted-foreground">
                    Gestiona los planes de la landing y las pasarelas de pago.
                </p>
            </div>

            <Tabs defaultValue="plans" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="plans">Planes</TabsTrigger>
                    <TabsTrigger value="gateways">Pasarelas de Pago</TabsTrigger>
                </TabsList>

                <TabsContent value="plans">
                    <PlanManager initialPlans={plans} />
                </TabsContent>

                <TabsContent value="gateways">
                    <PaymentGateways />
                </TabsContent>
            </Tabs>
        </div>
    );
}
