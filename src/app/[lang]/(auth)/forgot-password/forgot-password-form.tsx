'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { requestPasswordReset } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SubmitButton({ text, pendingText }: { text: string; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all"
      disabled={pending}
    >
      {pending ? pendingText : text}
    </Button>
  );
}

export default function ForgotPasswordForm({ dict, lang }: { dict: any; lang: string }) {
  const [state, dispatch] = useActionState(requestPasswordReset, undefined);

  return (
    <>
      {state?.success ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-300">{dict.success}</p>
        </div>
      ) : (
        <form action={dispatch} className="space-y-5">
          <input type="hidden" name="lang" value={lang} />
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300 text-sm">{dict.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
          <SubmitButton text={dict.submitButton} pendingText={dict.submitButtonPending} />
        </form>
      )}
    </>
  );
}
