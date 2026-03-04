import { getLandingPlansWithPricing } from "./actions"
import { PlanManager } from "./plan-manager"
import { WompiConfigCard } from "./wompi-config-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function BillingPage() {
    const plans = await getLandingPlansWithPricing();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Planes & Facturación</h2>
                <p className="text-muted-foreground">
                    Gestiona los planes de la landing y la pasarela de pagos.
                </p>
            </div>

            <Tabs defaultValue="plans" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="plans">Planes</TabsTrigger>
                    <TabsTrigger value="wompi">Pasarela de Pagos</TabsTrigger>
                </TabsList>

                <TabsContent value="plans">
                    <PlanManager initialPlans={plans} />
                </TabsContent>

                <TabsContent value="wompi">
                    <WompiConfigCard />
                </TabsContent>
            </Tabs>
        </div>
    );
}
