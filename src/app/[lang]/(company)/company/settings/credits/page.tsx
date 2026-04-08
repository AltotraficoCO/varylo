import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getDictionary, Locale } from '@/lib/dictionary';

function formatCOP(amount: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default async function CreditsHistoryPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const t = dict.dashboard.credits;
    const tc = dict.dashboard.common;
    const locale = tc.locale || 'es-CO';

    const session = await auth();
    const companyId = session?.user?.companyId;

    if (!companyId) {
        return <p>{tc.notAuthorized}</p>;
    }

    const TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        RECHARGE: { label: t.typeLabels.RECHARGE, variant: 'default' },
        AI_USAGE: { label: t.typeLabels.AI_USAGE, variant: 'secondary' },
        MANUAL_ADJUST: { label: t.typeLabels.MANUAL_ADJUSTMENT, variant: 'outline' },
        REFUND: { label: t.typeLabels.REFUND, variant: 'default' },
    };

    const [transactions, company] = await Promise.all([
        prisma.creditTransaction.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma.company.findUnique({
            where: { id: companyId },
            select: { creditBalance: true },
        }),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="../settings">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">{t.title}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t.currentBalance} <span className="font-semibold">{formatCOP(company?.creditBalance || 0, locale)}</span>
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t.transactions}</CardTitle>
                    <CardDescription>{t.transactionsDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.date}</TableHead>
                                <TableHead>{t.type}</TableHead>
                                <TableHead>{t.description}</TableHead>
                                <TableHead className="text-right">{t.amount}</TableHead>
                                <TableHead className="text-right">{t.balanceAfter}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        {t.noTransactions}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => {
                                    const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type, variant: 'outline' as const };
                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(tx.createdAt).toLocaleDateString(locale, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {tx.description || '-'}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount >= 0 ? '+' : ''}{formatCOP(tx.amount, locale)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {formatCOP(tx.balanceAfter, locale)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
