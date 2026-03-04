'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { register } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

function SubmitButton({ text, pendingText }: { text: string, pendingText: string }) {
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

export default function RegisterForm({ dict }: { dict: any }) {
    const [errorMessage, dispatch] = useActionState(register, undefined);

    return (
        <form action={dispatch} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="companyName" className="text-zinc-300 text-sm">{dict.companyNameLabel}</Label>
                <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder={dict.companyNamePlaceholder}
                    required
                    className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300 text-sm">{dict.nameLabel}</Label>
                <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder={dict.namePlaceholder}
                    required
                    className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50"
                />
            </div>
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
            <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300 text-sm">{dict.passwordLabel}</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="plan" className="text-zinc-300 text-sm">{dict.planLabel}</Label>
                <Select name="plan" defaultValue="STARTER">
                    <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white focus:ring-emerald-500/50 [&>span]:text-zinc-300">
                        <SelectValue placeholder={dict.planPlaceholder} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/[0.1]">
                        <SelectItem value="STARTER" className="text-zinc-200 focus:bg-white/[0.08] focus:text-white">Starter</SelectItem>
                        <SelectItem value="PRO" className="text-zinc-200 focus:bg-white/[0.08] focus:text-white">Pro</SelectItem>
                        <SelectItem value="SCALE" className="text-zinc-200 focus:bg-white/[0.08] focus:text-white">Scale</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                {errorMessage && (
                    <p className="text-sm text-red-400 mb-2">{errorMessage}</p>
                )}
                <SubmitButton text={dict.submitButton} pendingText={dict.submitButtonPending} />
            </div>
        </form>
    );
}
