'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface LanguageSwitcherProps {
    variant?: 'default' | 'dark';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
    const pathname = usePathname();
    const router = useRouter();

    const currentLocale = pathname.split('/')[1] || 'es';

    const handleValueChange = (newLocale: string) => {
        const segments = pathname.split('/');
        segments[1] = newLocale;
        const newPath = segments.join('/');
        router.push(newPath);
    };

    const isDark = variant === 'dark';

    return (
        <Select value={currentLocale} onValueChange={handleValueChange}>
            <SelectTrigger
                className={`w-[110px] gap-1.5 text-sm ${
                    isDark
                        ? 'border-slate-700 bg-transparent text-slate-300 hover:text-white hover:border-slate-500 focus:ring-emerald-500/30'
                        : ''
                }`}
            >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-[#141A17] border-slate-700 text-white' : ''}>
                <SelectItem value="es" className={isDark ? 'text-slate-300 focus:bg-emerald-500/10 focus:text-white' : ''}>
                    Español
                </SelectItem>
                <SelectItem value="en" className={isDark ? 'text-slate-300 focus:bg-emerald-500/10 focus:text-white' : ''}>
                    English
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
