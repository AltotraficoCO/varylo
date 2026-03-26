'use client';

interface SubscribeFormProps {
    lang: string;
    plans: { id: string; slug: string; name: string; priceInCents: number; trialDays: number }[];
    companyEmail: string;
    companyName: string;
    wompiPublicKey?: string;
    wompiIsSandbox?: boolean;
}

export function SubscribeForm({ lang, plans, companyEmail, companyName, wompiPublicKey, wompiIsSandbox }: SubscribeFormProps) {
    return (
        <div className="text-center p-8">
            <p className="text-muted-foreground">Formulario de suscripción en construcción.</p>
        </div>
    );
}
