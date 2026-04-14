'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from './actions';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

function SubmitButton({ text, pendingText }: { text: string; pendingText: string }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? pendingText : text}
        </button>
    );
}

export default function LoginForm({ dict, lang }: { dict: any; lang: string }) {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form action={dispatch} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[13px] font-medium text-white/50">
                    {dict.emailLabel}
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    className="w-full h-11 px-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 outline-none focus:border-emerald-500/60 focus:bg-white/[0.07] transition-all"
                />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[13px] font-medium text-white/50">
                        {dict.passwordLabel}
                    </label>
                    <Link
                        href={`/${lang}/forgot-password`}
                        className="text-[13px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
                    >
                        {dict.forgotPassword}
                    </Link>
                </div>
                <div className="relative">
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="w-full h-11 px-4 pr-11 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 outline-none focus:border-emerald-500/60 focus:bg-white/[0.07] transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-white/60 transition-colors rounded"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Error message */}
            {errorMessage && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <span className="text-sm text-red-400">{errorMessage}</span>
                </div>
            )}

            {/* Submit */}
            <SubmitButton text={dict.submitButton} pendingText={dict.submitButtonPending} />
        </form>
    );
}
