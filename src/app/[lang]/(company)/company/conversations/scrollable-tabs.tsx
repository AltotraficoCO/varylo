'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ScrollableTabs({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const check = () => {
            setCanScrollLeft(el.scrollLeft > 4);
            setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
        };

        check();
        el.addEventListener('scroll', check);
        window.addEventListener('resize', check);
        return () => {
            el.removeEventListener('scroll', check);
            window.removeEventListener('resize', check);
        };
    }, []);

    const scroll = (dir: number) => {
        ref.current?.scrollBy({ left: dir * 120, behavior: 'smooth' });
    };

    return (
        <div className="flex items-stretch mx-4 mb-3 rounded-xl bg-[#F4F4F5] p-1">
            {canScrollLeft && (
                <button
                    onClick={() => scroll(-1)}
                    className="flex items-center px-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
            )}
            <div
                ref={ref}
                className="flex-1 flex gap-1 font-medium text-muted-foreground overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>
            {canScrollRight && (
                <button
                    onClick={() => scroll(1)}
                    className="flex items-center px-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
