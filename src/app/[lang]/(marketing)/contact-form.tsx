'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitContact } from './actions';
import { Button } from '@/components/ui/button';

function SubmitButton({ text, pendingText }: { text: string, pendingText: string }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="relative w-full h-[58px] bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base rounded-xl transition-all disabled:opacity-50 overflow-hidden group"
            style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.01em' }}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {pending ? pendingText : text}
                {!pending && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </span>
            <div className="absolute inset-0 bg-white/10 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 ease-out" />
        </button>
    );
}

export function ContactForm({ dict }: { dict: any }) {
    const [state, formAction] = useActionState(submitContact, null);

    if (state?.success) {
        return (
            <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-medium text-center">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-lg font-bold">{dict.success}</p>
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-3">
            {/* Large label inputs */}
            <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-[.18em] text-white/30 mb-2 group-focus-within:text-emerald-500 transition-colors">
                    {dict.name}
                </label>
                <input
                    name="name"
                    placeholder="Tu nombre completo"
                    required
                    className="w-full h-[58px] bg-white/[.03] border border-white/[.08] rounded-xl px-5 text-base text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/40 transition-all"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                />
            </div>
            <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-[.18em] text-white/30 mb-2 group-focus-within:text-emerald-500 transition-colors">
                    {dict.email}
                </label>
                <input
                    name="email"
                    type="email"
                    placeholder="hola@empresa.com"
                    required
                    className="w-full h-[58px] bg-white/[.03] border border-white/[.08] rounded-xl px-5 text-base text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/40 transition-all"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                />
            </div>
            <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-[.18em] text-white/30 mb-2 group-focus-within:text-emerald-500 transition-colors">
                    {dict.message}
                </label>
                <textarea
                    name="message"
                    placeholder="Cuéntanos sobre tu proyecto..."
                    required
                    rows={5}
                    className="w-full bg-white/[.03] border border-white/[.08] rounded-xl p-5 text-base text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/40 transition-all resize-none"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                />
            </div>
            <div className="pt-2">
                <SubmitButton text={dict.submit} pendingText={dict.submit} />
            </div>
            {state?.message && <p className="text-sm text-red-400">{state.message}</p>}
        </form>
    );
}
