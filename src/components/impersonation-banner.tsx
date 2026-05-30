'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LogOut, Loader2 } from 'lucide-react';

import { exitCompanyImpersonation } from '@/app/[lang]/(super-admin)/super-admin/companies/actions';

interface ImpersonationBannerProps {
    companyName: string;
    lang: string;
}

export function ImpersonationBanner({ companyName, lang }: ImpersonationBannerProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function onExit() {
        setLoading(true);
        try {
            await exitCompanyImpersonation();
            router.push(`/${lang}/super-admin/companies`);
            router.refresh();
        } catch {
            setLoading(false);
        }
    }

    return (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
                <Eye className="h-4 w-4 shrink-0" />
                <span className="truncate">
                    Modo super admin · viendo como empresa: <strong>{companyName}</strong>
                </span>
            </div>
            <button
                onClick={onExit}
                disabled={loading}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white/20 px-2.5 py-1 font-medium transition-colors hover:bg-white/30 disabled:opacity-60"
            >
                {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <LogOut className="h-3.5 w-3.5" />
                )}
                Salir
            </button>
        </div>
    );
}
