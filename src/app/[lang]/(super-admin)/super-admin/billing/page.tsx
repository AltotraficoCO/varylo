import { getLandingPlansWithPricing } from "./actions"
import { PlanManager } from "./plan-manager"
import { PaymentGateways } from "./payment-gateways"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDictionary, Locale } from '@/lib/dictionary';

export default async function BillingPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const t = dict.dashboard.billingAdmin;
    const plans = await getLandingPlansWithPricing();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t.title}</h2>
                <p className="text-muted-foreground">
                    {t.subtitle}
                </p>
            </div>

            <Tabs defaultValue="plans" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="plans">{t.plansTab}</TabsTrigger>
                    <TabsTrigger value="gateways">{t.gatewaysTab}</TabsTrigger>
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
