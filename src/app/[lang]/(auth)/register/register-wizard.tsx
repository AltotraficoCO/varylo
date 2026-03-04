'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { register } from './actions';
import { addPaymentSourceAction, subscribeToPlan } from '@/app/[lang]/(company)/company/settings/billing-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, CreditCard, Loader2, Shield } from 'lucide-react';

type AvailablePlan = {
    id: string;
    slug: string;
    name: string;
    priceInCents: number;
};

type Props = {
    dict: any;
    lang: string;
    wompiPublicKey?: string;
    wompiIsSandbox?: boolean;
    availablePlans: AvailablePlan[];
    defaultPlanId?: string;
};

export function RegisterWizard({
    dict,
    lang,
    wompiPublicKey,
    wompiIsSandbox,
    availablePlans,
    defaultPlanId,
}: Props) {
    const hasPaymentStep = !!(wompiPublicKey && availablePlans.length > 0);
    const totalSteps = hasPaymentStep ? 3 : 2;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1 state
    const [email, setEmail] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState(defaultPlanId || availablePlans[0]?.id || '');

    // Step 2 state
    const [cardHolder, setCardHolder] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpMonth, setCardExpMonth] = useState('');
    const [cardExpYear, setCardExpYear] = useState('');
    const [cardCvc, setCardCvc] = useState('');

    const selectedPlan = availablePlans.find((p) => p.id === selectedPlanId);

    const stepLabels = [
        dict.steps.account,
        ...(hasPaymentStep ? [dict.steps.payment] : []),
        dict.steps.ready,
    ];

    // ─── Step 1: Create account ──────────────────
    async function handleStep1(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        formData.set('plan', selectedPlan?.slug || 'STARTER');

        const result = await register(undefined, formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        // Account created — sign in client-side
        const emailVal = formData.get('email') as string;
        const passwordVal = formData.get('password') as string;
        setEmail(emailVal);

        const signInResult = await signIn('credentials', {
            email: emailVal,
            password: passwordVal,
            redirect: false,
        });

        if (signInResult?.error) {
            setError(dict.errors.signInFailed);
            setLoading(false);
            return;
        }

        setStep(hasPaymentStep ? 2 : totalSteps);
        setLoading(false);
    }

    // ─── Step 2: Card tokenization + subscription ──────────
    async function handleStep2(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Tokenize card via Wompi
            const wompiBaseUrl = wompiIsSandbox
                ? 'https://sandbox.wompi.co'
                : 'https://production.wompi.co';

            const tokenRes = await fetch(`${wompiBaseUrl}/v1/tokens/cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${wompiPublicKey}`,
                },
                body: JSON.stringify({
                    number: cardNumber.replace(/\s/g, ''),
                    cvc: cardCvc,
                    exp_month: cardExpMonth.padStart(2, '0'),
                    exp_year: cardExpYear.padStart(2, '0'),
                    card_holder: cardHolder,
                }),
            });

            const tokenJson = await tokenRes.json();

            if (!tokenRes.ok || !tokenJson.data?.id) {
                throw new Error(tokenJson.error?.reason || 'Error al tokenizar tarjeta');
            }

            // Add payment source
            const sourceResult = await addPaymentSourceAction({
                token: tokenJson.data.id,
                email,
                brand: tokenJson.data.brand,
                lastFour: tokenJson.data.last_four,
                expMonth: cardExpMonth,
                expYear: cardExpYear,
            });

            if (!sourceResult.success) {
                throw new Error(sourceResult.error || 'Error al agregar tarjeta');
            }

            // Subscribe to plan (trial)
            const subResult = await subscribeToPlan(selectedPlanId);

            if (!subResult.success) {
                throw new Error(subResult.error || 'Error al activar suscripción');
            }

            setStep(totalSteps);
        } catch (err: any) {
            setError(err.message || 'Error al procesar pago');
        }

        setLoading(false);
    }

    // ─── Progress bar ─────────────────────────────
    function ProgressBar() {
        return (
            <div className="flex items-center gap-2 mb-8">
                {stepLabels.map((label, i) => {
                    const stepNum = i + 1;
                    const isActive = step === stepNum;
                    const isCompleted = step > stepNum;
                    return (
                        <div key={i} className="flex items-center gap-2 flex-1">
                            <div className="flex items-center gap-2 flex-1">
                                <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                                        isCompleted
                                            ? 'bg-emerald-600 text-white'
                                            : isActive
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-gray-100 text-gray-400'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        stepNum
                                    )}
                                </div>
                                <span
                                    className={`text-sm hidden sm:inline ${
                                        isActive || isCompleted ? 'text-gray-900 font-medium' : 'text-gray-400'
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {i < stepLabels.length - 1 && (
                                <div
                                    className={`h-px flex-1 ${
                                        step > stepNum ? 'bg-emerald-600' : 'bg-gray-200'
                                    }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // ─── Step 1 UI ────────────────────────────────
    if (step === 1) {
        return (
            <div>
                <ProgressBar />
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">{dict.step1.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">{dict.step1.subtitle}</p>
                </div>

                <form onSubmit={handleStep1} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-gray-700 text-sm">{dict.companyNameLabel}</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                placeholder={dict.companyNamePlaceholder}
                                required
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-gray-700 text-sm">{dict.nameLabel}</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder={dict.namePlaceholder}
                                required
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 text-sm">{dict.emailLabel}</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="name@example.com"
                            required
                            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-700 text-sm">{dict.passwordLabel}</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-gray-700 text-sm">{dict.confirmPasswordLabel}</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                    </div>

                    {/* Plan selector */}
                    {availablePlans.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">{dict.planLabel}</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {availablePlans.map((p) => (
                                    <label
                                        key={p.id}
                                        className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                                            selectedPlanId === p.id
                                                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="planRadio"
                                                value={p.id}
                                                checked={selectedPlanId === p.id}
                                                onChange={() => setSelectedPlanId(p.id)}
                                                className="accent-emerald-600"
                                            />
                                            <span className="text-sm font-medium text-gray-900">{p.name}</span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            ${(p.priceInCents / 100).toLocaleString('es-CO')} <span className="text-gray-400">COP/mes</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {dict.submitButtonPending}
                            </>
                        ) : (
                            dict.submitButton
                        )}
                    </Button>

                    <p className="text-center text-sm text-gray-500">
                        {dict.hasAccount}{' '}
                        <Link href={`/${lang}/login`} className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                            {dict.login}
                        </Link>
                    </p>
                </form>
            </div>
        );
    }

    // ─── Step 2 UI (Payment) ──────────────────────
    if (step === 2 && hasPaymentStep) {
        return (
            <div>
                <ProgressBar />
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">{dict.step2.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">{dict.step2.subtitle}</p>
                </div>

                {/* Trial info banner */}
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-emerald-800">{dict.step2.trialInfo}</p>
                        <p className="text-xs text-emerald-600 mt-0.5">{dict.step2.trialDescription}</p>
                        {selectedPlan && (
                            <p className="text-xs text-emerald-600 mt-1">
                                Plan {selectedPlan.name} — ${(selectedPlan.priceInCents / 100).toLocaleString('es-CO')} COP/mes
                            </p>
                        )}
                    </div>
                </div>

                <form onSubmit={handleStep2} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">{dict.step2.cardHolder}</Label>
                        <Input
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="Juan Pérez"
                            required
                            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">{dict.step2.cardNumber}</Label>
                        <div className="relative">
                            <Input
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                placeholder="4242 4242 4242 4242"
                                maxLength={19}
                                required
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50 pr-10"
                            />
                            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">{dict.step2.expMonth}</Label>
                            <Input
                                value={cardExpMonth}
                                onChange={(e) => setCardExpMonth(e.target.value)}
                                placeholder="12"
                                maxLength={2}
                                required
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">{dict.step2.expYear}</Label>
                            <Input
                                value={cardExpYear}
                                onChange={(e) => setCardExpYear(e.target.value)}
                                placeholder="28"
                                maxLength={2}
                                required
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">{dict.step2.cvc}</Label>
                            <Input
                                value={cardCvc}
                                onChange={(e) => setCardCvc(e.target.value)}
                                placeholder="123"
                                maxLength={4}
                                type="password"
                                required
                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {dict.step2.submitButtonPending}
                            </>
                        ) : (
                            dict.step2.submitButton
                        )}
                    </Button>
                </form>
            </div>
        );
    }

    // ─── Final Step UI (Ready!) ───────────────────
    return (
        <div>
            <ProgressBar />
            <div className="text-center space-y-6 py-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{dict.step3.title}</h2>
                    <p className="mt-2 text-gray-500">{dict.step3.subtitle}</p>
                    <p className="mt-1 text-sm text-gray-400">{dict.step3.description}</p>
                </div>
                <Button
                    asChild
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8"
                >
                    <Link href={`/${lang}/dashboard`}>{dict.step3.goToDashboard}</Link>
                </Button>
            </div>
        </div>
    );
}
