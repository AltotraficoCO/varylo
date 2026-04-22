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
            className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                <label htmlFor="email" className="block text-[13px] font-medium text-[#374151]">
                    {dict.emailLabel}
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nombre@empresa.com"
                    autoComplete="email"
                    required
                    className="w-full h-10 px-3.5 rounded-lg border border-[#E4E4E7] bg-white text-[#09090B] text-sm placeholder:text-[#A1A1AA] outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/10 transition-all"
                />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[13px] font-medium text-[#374151]">
                        {dict.passwordLabel}
                    </label>
                    <Link
                        href={`/${lang}/forgot-password`}
                        className="text-[13px] text-[#10B981] hover:text-[#059669] transition-colors"
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
                        className="w-full h-10 px-3.5 pr-10 rounded-lg border border-[#E4E4E7] bg-white text-[#09090B] text-sm placeholder:text-[#A1A1AA] outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/10 transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#71717A] transition-colors"
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

            {/* Error */}
            {errorMessage && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-100">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-[13px] text-red-600">{errorMessage}</span>
                </div>
            )}

            {/* Submit */}
            <div className="pt-1">
                <SubmitButton text={dict.submitButton} pendingText={dict.submitButtonPending} />
            </div>
        </form>
    );
}
