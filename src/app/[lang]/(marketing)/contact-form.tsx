'use client';

import { useActionState } from 'react'; // Adjusted for React 19
import { useFormStatus } from 'react-dom';
import { submitContact } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function SubmitButton({ text, pendingText }: { text: string, pendingText: string }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? pendingText : text}
        </Button>
    );
}

export function ContactForm({ dict }: { dict: any }) {
    const [state, formAction] = useActionState(submitContact, null);

    if (state?.success) {
        return <div className="text-center p-6 bg-green-50 text-green-800 rounded-lg font-medium">{dict.success}</div>;
    }

    return (
        <form action={formAction} className="space-y-4 max-w-md mx-auto">
            <div className="grid gap-2">
                <Input name="name" placeholder={dict.name} required />
            </div>
            <div className="grid gap-2">
                <Input name="email" type="email" placeholder={dict.email} required />
            </div>
            <div className="grid gap-2">
                <Textarea name="message" placeholder={dict.message} required />
            </div>
            <SubmitButton text={dict.submit} pendingText={dict.submit} />
            {state?.message && <p className="text-sm text-red-500 text-center">{state.message}</p>}
        </form>
    );
}
