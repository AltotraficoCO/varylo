'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogIn, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { enterCompanyAsAdmin } from './actions';

interface EnterCompanyButtonProps {
    companyId: string;
    companyName: string;
}

export function EnterCompanyButton({ companyId, companyName }: EnterCompanyButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const params = useParams();
    const lang = (params?.lang as string) || 'es';

    async function onEnter() {
        setLoading(true);
        try {
            const res = await enterCompanyAsAdmin(companyId);
            if (res.success) {
                toast.success(`Entrando a ${companyName}…`);
                // Navigate to the company panel; refresh so the new session
                // (with the impersonated companyId) is picked up by the layout.
                router.push(`/${lang}/company`);
                router.refresh();
            } else {
                toast.error(res.error || 'No se pudo entrar a la empresa');
                setLoading(false);
            }
        } catch {
            toast.error('Ocurrió un error inesperado');
            setLoading(false);
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={onEnter} disabled={loading}>
            {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
            )}
            Entrar
        </Button>
    );
}
