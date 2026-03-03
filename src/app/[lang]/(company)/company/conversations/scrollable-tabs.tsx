'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScrollableTabs({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const check = () => {
            setCanScroll(el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
        };

        check();
        el.addEventListener('scroll', check);
        window.addEventListener('resize', check);
        return () => {
            el.removeEventListener('scroll', check);
            window.removeEventListener('resize', check);
        };
    }, []);

    const scrollRight = () => {
        ref.current?.scrollBy({ left: 120, behavior: 'smooth' });
    };

    return (
        <div className="relative">
            <div
                ref={ref}
                className="flex px-4 gap-4 text-sm font-medium text-muted-foreground overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>
            {canScroll && (
                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gradient-to-l from-card via-card/90 to-transparent"
                >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
            )}
        </div>
    );
}
