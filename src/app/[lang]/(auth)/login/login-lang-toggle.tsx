'use client';

import { useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function LoginLangToggle() {
    const pathname        = usePathname();
    const currentLocale   = pathname.split('/')[1] || 'es';
    const targetLocale    = currentLocale === 'es' ? 'en' : 'es';
    const btnRef          = useRef<HTMLButtonElement>(null);
    const [wave, setWave] = useState<{ x: number; y: number } | null>(null);

    const handleClick = useCallback(() => {
        if (wave) return;                        // already animating

        const rect = btnRef.current?.getBoundingClientRect();
        const x = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
        const y = rect ? rect.top  + rect.height / 2 : window.innerHeight / 2;
        setWave({ x, y });

        // Switch language at peak of wave (750 ms)
        setTimeout(() => {
            const segments = pathname.split('/');
            segments[1] = targetLocale;
            window.location.href = segments.join('/');
        }, 750);
    }, [wave, pathname, targetLocale]);

    return (
        <>
            <style>{`
                @keyframes lang-wave-in {
                    from { transform: translate(-50%, -50%) scale(1);  opacity: 1; }
                    to   { transform: translate(-50%, -50%) scale(80); opacity: 1; }
                }
                @keyframes lang-logo-pop {
                    0%   { opacity: 0; transform: translate(-50%, -50%) scale(.4);  }
                    40%  { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
                    60%  {             transform: translate(-50%, -50%) scale(.96);  }
                    80%  {             transform: translate(-50%, -50%) scale(1.02); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1);   }
                }
                @keyframes lang-btn-pulse {
                    0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
                    50%      { box-shadow: 0 0 0 6px rgba(16,185,129,.15); }
                }
                .lang-btn-idle:hover { background: rgba(16,185,129,.12) !important; border-color: rgba(16,185,129,.4) !important; }
            `}</style>

            {/* Full-screen wave overlay */}
            {wave && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            left:     wave.x,
                            top:      wave.y,
                            width:    60,
                            height:   60,
                            borderRadius: '50%',
                            background:   '#10b981',
                            pointerEvents: 'none',
                            zIndex:   9992,
                            animation: 'lang-wave-in .75s cubic-bezier(.4,0,.2,1) forwards',
                        }}
                    />
                    {/* Varylo wordmark pops in center */}
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%', left: '50%',
                            pointerEvents: 'none',
                            zIndex: 9993,
                            animation: 'lang-logo-pop .5s cubic-bezier(.34,1.56,.64,1) .25s both',
                        }}
                    >
                        <span style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontWeight: 900,
                            fontSize: '2.8rem',
                            letterSpacing: '-.04em',
                            color: '#000',
                            lineHeight: 1,
                            display: 'block',
                            transform: 'translate(-50%, -50%)',
                        }}>
                            Varylo
                        </span>
                    </div>
                </>
            )}

            {/* Circle button */}
            <button
                ref={btnRef}
                onClick={handleClick}
                aria-label={`Cambiar a ${targetLocale === 'en' ? 'inglés' : 'español'}`}
                className="lang-btn-idle relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200 select-none"
                style={{
                    background:   'rgba(255,255,255,0.05)',
                    borderColor:  'rgba(255,255,255,0.10)',
                    cursor: wave ? 'default' : 'pointer',
                }}
            >
                <span className="text-xl leading-none" style={{ userSelect: 'none' }}>
                    {currentLocale === 'es' ? '🇪🇸' : '🇺🇸'}
                </span>
            </button>
        </>
    );
}
