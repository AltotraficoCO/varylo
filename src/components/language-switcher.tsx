'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface LanguageSwitcherProps {
    variant?: 'default' | 'dark';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
    const pathname = usePathname();
    const router = useRouter();

    const currentLocale = pathname.split('/')[1] || 'es';

    const switchTo = useCallback(
        (newLocale: string) => {
            if (newLocale === currentLocale) return;
            const segments = pathname.split('/');
            segments[1] = newLocale;
            router.push(segments.join('/'));
        },
        [currentLocale, pathname, router],
    );

    const isDark = variant === 'dark';

    return (
        <div
            className={`
                relative inline-flex items-center rounded-full p-0.5 gap-0
                transition-colors duration-200
                ${isDark
                    ? 'bg-white/[0.06] border border-white/[0.08]'
                    : 'bg-muted/80 border border-border/60'
                }
            `}
        >
            <button
                type="button"
                onClick={() => switchTo('es')}
                className={`
                    relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
                    transition-all duration-250 ease-out cursor-pointer select-none
                    ${currentLocale === 'es'
                        ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.12)]'
                            : 'bg-white text-foreground shadow-sm ring-1 ring-black/[0.04]'
                        : isDark
                            ? 'text-white/40 hover:text-white/70'
                            : 'text-muted-foreground/70 hover:text-muted-foreground'
                    }
                `}
            >
                <span className="text-sm leading-none">🇪🇸</span>
                <span>ES</span>
            </button>

            <button
                type="button"
                onClick={() => switchTo('en')}
                className={`
                    relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
                    transition-all duration-250 ease-out cursor-pointer select-none
                    ${currentLocale === 'en'
                        ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.12)]'
                            : 'bg-white text-foreground shadow-sm ring-1 ring-black/[0.04]'
                        : isDark
                            ? 'text-white/40 hover:text-white/70'
                            : 'text-muted-foreground/70 hover:text-muted-foreground'
                    }
                `}
            >
                <span className="text-sm leading-none">🇺🇸</span>
                <span>EN</span>
            </button>
        </div>
    );
}
