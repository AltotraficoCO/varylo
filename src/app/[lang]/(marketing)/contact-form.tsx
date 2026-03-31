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
            className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Outfit, sans-serif' }}
        >
            {pending ? pendingText : text}
        </button>
    );
}

export function ContactForm({ dict }: { dict: any }) {
    const [state, formAction] = useActionState(submitContact, null);

    if (state?.success) {
        return <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-medium">{dict.success}</div>;
    }

    return (
        <form action={formAction} className="space-y-4 max-w-[560px] mx-auto">
            <input
                name="name"
                placeholder={dict.name}
                required
                className="w-full h-[52px] bg-[#141A17] border border-slate-800 rounded-lg px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
            <input
                name="email"
                type="email"
                placeholder={dict.email}
                required
                className="w-full h-[52px] bg-[#141A17] border border-slate-800 rounded-lg px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
            <textarea
                name="message"
                placeholder={dict.message}
                required
                rows={4}
                className="w-full bg-[#141A17] border border-slate-800 rounded-lg p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
            />
            <SubmitButton text={dict.submit} pendingText={dict.submit} />
            {state?.message && <p className="text-sm text-red-400 text-center">{state.message}</p>}
        </form>
    );
}
