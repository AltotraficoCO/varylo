import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlegraConfigCard } from './alegra-config-card';
import { InvoicesList } from './invoices-list';
import { ContactsList } from './contacts-list';

export default function AlegraPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-[28px] font-bold text-foreground">Alegra</h1>
                <p className="text-sm text-muted-foreground">
                    Facturación de la aplicación con Alegra. Las facturas de las suscripciones se emiten automáticamente al aprobarse el pago.
                </p>
            </div>

            <Tabs defaultValue="connection" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="connection">Conexión</TabsTrigger>
                    <TabsTrigger value="invoices">Facturas</TabsTrigger>
                    <TabsTrigger value="contacts">Contactos</TabsTrigger>
                </TabsList>

                <TabsContent value="connection">
                    <AlegraConfigCard />
                </TabsContent>

                <TabsContent value="invoices">
                    <InvoicesList />
                </TabsContent>

                <TabsContent value="contacts">
                    <ContactsList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
