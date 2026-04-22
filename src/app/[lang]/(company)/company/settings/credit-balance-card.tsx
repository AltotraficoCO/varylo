'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Coins, ExternalLink, Key } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useDictionary } from '@/lib/i18n-context';

interface CreditBalanceCardProps {
    balance: number;
    hasOwnKey: boolean;
    companyId: string;
    companyEmail: string;
}

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function CreditBalanceCard({ balance, hasOwnKey, companyId, companyEmail }: CreditBalanceCardProps) {
    const wompiPublicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    const isLowBalance = !hasOwnKey && balance < 1000;

    const dict = useDictionary();
    const t = dict.settingsUI?.creditBalanceCard || {};

    const handleRecharge = () => {
        if (!wompiPublicKey) {
            alert(t.gatewayNotConfigured || 'Pasarela de pagos no configurada. Contacta al administrador.');
            return;
        }

        const reference = `varylo-${companyId}-${Date.now()}`;
        const checkout = new (window as any).WidgetCheckout({
            currency: 'COP',
            amountInCents: 5000000, // $50,000 COP default
            reference,
            publicKey: wompiPublicKey,
            customerData: {
                email: companyEmail,
            },
            redirectUrl: window.location.href,
        });
        checkout.open((result: any) => {
            const transaction = result.transaction;
            if (transaction?.status === 'APPROVED') {
                window.location.reload();
            }
        });
    };

    return (
        <>
            <Script src="https://checkout.wompi.co/widget.js" strategy="lazyOnload" />
            <Card className={isLowBalance ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/10' : ''}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Coins className="h-5 w-5" />
                            <CardTitle>{t.title || 'Créditos IA'}</CardTitle>
                        </div>
                        {hasOwnKey && (
                            <Badge variant="secondary" className="gap-1">
                                <Key className="h-3 w-3" />
                                {t.usingOwnKey || 'Usando tu propia API Key'}
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        {hasOwnKey
                            ? (t.ownKeyDesc || 'Tu empresa usa su propia API Key de OpenAI. No necesitas créditos para usar IA.')
                            : (t.creditsDesc || 'Los créditos se consumen con cada uso de IA (agentes y análisis). Recarga cuando necesites.')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground">{t.currentBalance || 'Saldo actual'}</p>
                        <p className="text-3xl font-bold">{formatCOP(balance)}</p>
                    </div>

                    {isLowBalance && (
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{t.lowBalance || 'Saldo bajo. La IA se desactivará cuando llegue a $0.'}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Link href="./settings/credits">
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t.viewHistory || 'Ver historial'}
                        </Button>
                    </Link>
                    {!hasOwnKey && (
                        <Button onClick={handleRecharge}>
                            {t.recharge || 'Recargar'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </>
    );
}
