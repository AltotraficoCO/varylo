'use client';

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ContactForm } from './contact-form';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
    Check, MessageSquare, Bot, Workflow, Users, BarChart3,
    ArrowRight, Star, Zap, AlertTriangle, EyeOff, Moon, Shield,
    ChevronDown, ArrowUpRight, Plug2, TrendingUp, Settings2,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Plan = {
    id: string; name: string; price: number; description: string;
    features: string[]; isFeatured: boolean; ctaText: string;
    ctaLink: string | null; slug: string;
};
type Logo = { id: string; name: string; imageUrl: string };

interface LandingClientProps {
    lang: string; d: any; dict: any; plans: Plan[]; logos: Logo[];
    otherLang: string; otherDict: any;
}

const FEATURE_ICONS = [MessageSquare, Bot, Workflow, Users, BarChart3, Shield];
const PROBLEM_ICONS = [AlertTriangle, EyeOff, Moon];
const STEP_ICONS = [Plug2, Settings2, TrendingUp];
const BAR_WIDTHS = [2,1,3,1,2,1,1,3,2,1,2,3,1,1,2,1,3,1,2,1,1,2,3,1,2,1,1,3,2,1];

export function LandingClient({ lang, d: initialD, dict: initialDict, plans, logos, otherLang, otherDict }: LandingClientProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const priceRailRef = useRef<HTMLDivElement>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // ── Active language (no reload) ─────────────────────────────────────────
    const [displayLang, setDisplayLang] = useState(lang);
    const d = displayLang === lang ? initialD : otherDict.landing;
    const dict = displayLang === lang ? initialDict : otherDict;

    // ── Price rail physics drag ──────────────────────────────────────────────
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragScrollLeft = useRef(0);
    const dragVelocity = useRef(0);
    const lastDragX = useRef(0);
    const lastDragTime = useRef(0);
    const momentumAnim = useRef<number | null>(null);

    // ── Swipe-to-unlock language toggle ─────────────────────────────────────
    const pathname = usePathname();
    const currentLocale = displayLang;
    const targetLocale = displayLang === lang ? otherLang : lang;
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    // Wave phases: 'idle' | 'in' (expanding) | 'out' (contracting)
    const [wavePhase, setWavePhase] = useState<'idle' | 'in' | 'out'>('idle');
    const swipeStartClientX = useRef(0);
    const TRACK_W = 200;
    const UNLOCK_THRESHOLD = 0.88;

    const doUnlock = useCallback(() => {
        if (wavePhase !== 'idle') return;
        setIsSwiping(false);
        setWavePhase('in');
        // At peak of wave, switch language silently
        setTimeout(() => {
            setDisplayLang(prev => prev === lang ? otherLang : lang);
            window.history.pushState({}, '', `/${targetLocale}${pathname.slice(lang.length + 1)}`);
            setWavePhase('out');
        }, 750);
        setTimeout(() => {
            setWavePhase('idle');
            setSwipeX(0);
        }, 1550);
    }, [wavePhase, lang, otherLang, targetLocale, pathname]);

    const onSwipePointerDown = (e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsSwiping(true);
        swipeStartClientX.current = e.clientX - swipeX;
    };
    const onSwipePointerMove = (e: React.PointerEvent) => {
        if (!isSwiping) return;
        const newX = Math.max(0, Math.min(TRACK_W, e.clientX - swipeStartClientX.current));
        setSwipeX(newX);
        if (newX / TRACK_W >= UNLOCK_THRESHOLD) doUnlock();
    };
    const onSwipePointerUp = () => {
        if (!isSwiping) return;
        setIsSwiping(false);
        if (swipeX / TRACK_W < UNLOCK_THRESHOLD) setSwipeX(0);
    };

    // Center price rail on mount — use effect after paint
    useEffect(() => {
        const rail = priceRailRef.current;
        if (!rail) return;
        // Small rAF delay to ensure layout is complete
        requestAnimationFrame(() => {
            rail.scrollLeft = (rail.scrollWidth - rail.clientWidth) / 2;
        });
    }, []);

    // Document-level drag listeners to avoid losing drag when cursor leaves rail
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDragging.current || !priceRailRef.current) return;
            e.preventDefault();
            priceRailRef.current.scrollLeft = dragScrollLeft.current - (e.pageX - dragStartX.current);
            const now = Date.now();
            const dt = now - lastDragTime.current;
            if (dt > 0) dragVelocity.current = (lastDragX.current - e.pageX) / dt * 14;
            lastDragX.current = e.pageX;
            lastDragTime.current = now;
        };
        const onUp = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            if (priceRailRef.current) priceRailRef.current.style.cursor = 'grab';
            let vel = dragVelocity.current;
            const tick = () => {
                if (!priceRailRef.current || Math.abs(vel) < 0.4) return;
                priceRailRef.current.scrollLeft += vel;
                vel *= 0.91;
                momentumAnim.current = requestAnimationFrame(tick);
            };
            momentumAnim.current = requestAnimationFrame(tick);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, []);

    const featureList = [
        d.features.omnichannel, d.features.aiAgents, d.features.chatbots,
        d.features.agents, d.features.analytics, d.features.ai,
    ];
    const problemList = [d.problems.p1, d.problems.p2, d.problems.p3];
    const steps = [d.how.step1, d.how.step2, d.how.step3];
    const testimonials = [d.testimonials.t1, d.testimonials.t2, d.testimonials.t3];
    const faqs = [d.faq.q1, d.faq.q2, d.faq.q3, d.faq.q4, d.faq.q5];
    const metrics = Object.values(d.solution.metrics) as any[];

    // Price drag — mousedown only (move/up handled by document listeners)
    const onPriceDragStart = (e: React.MouseEvent) => {
        if (!priceRailRef.current) return;
        if (momentumAnim.current) cancelAnimationFrame(momentumAnim.current);
        isDragging.current = true;
        dragStartX.current = e.pageX;
        dragScrollLeft.current = priceRailRef.current.scrollLeft;
        lastDragX.current = e.pageX;
        lastDragTime.current = Date.now();
        dragVelocity.current = 0;
        priceRailRef.current.style.cursor = 'grabbing';
    };

    useGSAP(() => {
        // ── HERO ──────────────────────────────────────────────────────────────
        gsap.timeline({ delay: 0.1 })
            .from('.hero-badge', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' })
            .from('.hero-word', { yPercent: 110, opacity: 0, duration: 1, ease: 'power4.out', stagger: 0.045 }, '-=0.2')
            .from('.hero-sub', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
            .from('.hero-actions', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
            .from('.hero-proof', { opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');

        gsap.to('.orb-a', { x: 50, y: -35, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.orb-b', { x: -40, y: 50, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });

        // Hero title explodes apart on scroll
        gsap.to('.hero-title-wrap', {
            letterSpacing: '1.6em',
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero-title-wrap',
                start: 'top 60%',
                end: 'top -10%',
                scrub: 0.8,
            },
        });

        ScrollTrigger.create({
            start: 'top -10', end: 99999,
            toggleClass: { targets: '.main-nav', className: 'nav-solid' },
        });

        // ── SECTION REVEALS ───────────────────────────────────────────────────
        gsap.utils.toArray<HTMLElement>('.reveal-section').forEach((section) => {
            const heading = section.querySelector('.s-heading');
            const items = section.querySelectorAll('.s-item');
            const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 78%', once: true } });
            if (heading) tl.from(heading, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out' });
            if (items.length) tl.from(items, { y: 50, opacity: 0, duration: 0.75, ease: 'power3.out', stagger: 0.1 }, '-=0.4');
        });

        gsap.from('.metric-num', {
            scale: 0.7, opacity: 0, duration: 0.8, ease: 'back.out(1.4)', stagger: 0.12,
            scrollTrigger: { trigger: '.metrics-section', start: 'top 80%', once: true },
        });

        // ── HOW IT WORKS — CSS sticky (no GSAP pin, no spacer bugs) ──────────
        const howPanels = gsap.utils.toArray<HTMLElement>('.how-panel');
        if (howPanels.length > 0) {
            gsap.to('.how-track', {
                x: () => -(howPanels.length - 1) * window.innerWidth,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.how-sticky',
                    start: 'top top',
                    end: () => `+=${(howPanels.length - 1) * window.innerWidth}`,
                    scrub: 1,
                    onUpdate(self) {
                        const num = document.querySelector('.how-step-num');
                        const bar = document.querySelector('.how-bar') as HTMLElement;
                        if (num) num.textContent = String(Math.min(howPanels.length, Math.floor(self.progress * howPanels.length) + 1));
                        if (bar) bar.style.width = `${Math.round(self.progress * 100)}%`;
                    },
                },
            });
        }

        // ── TESTIMONIALS (marquee, no GSAP needed) ────────────────────────────
        gsap.from('.test-heading', {
            y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: '.test-section', start: 'top 80%', once: true },
        });

        // ── PRICING TICKETS ───────────────────────────────────────────────────
        const ticketEls = gsap.utils.toArray<HTMLElement>('.ticket-wrapper');
        if (ticketEls.length > 0) {
            ticketEls.forEach((el, i) => gsap.set(el, { rotation: i % 2 === 0 ? -4 : 4, transformOrigin: 'top center' }));
            gsap.from(ticketEls, {
                y: -140, opacity: 0, duration: 1.4, ease: 'power4.out', stagger: 0.12,
                scrollTrigger: { trigger: '.price-section', start: 'top 78%', once: true },
            });
            ticketEls.forEach((el, i) => {
                gsap.to(el, {
                    rotation: i % 2 === 0 ? 4 : -4, ease: 'none', transformOrigin: 'top center',
                    scrollTrigger: { trigger: '.price-section', start: 'top bottom', end: 'bottom top', scrub: 2.5 },
                });
            });
        }

        // ── FAQ / CTA ─────────────────────────────────────────────────────────
        gsap.from('.faq-row', {
            y: 20, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07,
            scrollTrigger: { trigger: '.faq-list', start: 'top 82%', once: true },
        });
        gsap.from('.cta-text', {
            y: 60, opacity: 0, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: '.cta-section', start: 'top 75%', once: true },
        });

        ScrollTrigger.refresh();
    }, { scope: containerRef });

    // ── Normalized plan data ────────────────────────────────────────────────
    const planItems = plans.length > 0 ? plans.map((p, idx) => ({
        key: p.id, title: p.name, price: `$${p.price}`, desc: p.description,
        features: p.features, featured: p.isFeatured,
        href: p.ctaLink || `/${lang}/register?plan=${p.slug}`, cta: p.ctaText,
        serial: `VAR-00${idx + 1}`,
    })) : [
        { key: 's', title: d.pricing.starter.title, price: '$29', desc: d.pricing.starter.description, features: d.pricing.starter.features, featured: false, href: `/${lang}/register?plan=STARTER`, cta: d.pricing.cta, serial: 'VAR-001' },
        { key: 'p', title: d.pricing.pro.title, price: '$79', desc: d.pricing.pro.description, features: d.pricing.pro.features, featured: true, href: `/${lang}/register?plan=PRO`, cta: d.pricing.cta, serial: 'VAR-002' },
        { key: 'sc', title: d.pricing.scale.title, price: '$199', desc: d.pricing.scale.description, features: d.pricing.scale.features, featured: false, href: '#contact', cta: d.pricing.ctaCustom, serial: 'VAR-003' },
    ];

    // Duplicate testimonials for marquee
    const mq1 = [...testimonials, ...testimonials, ...testimonials, ...testimonials];
    const mq2 = [...testimonials, ...testimonials, ...testimonials, ...testimonials].reverse();

    return (
        <div ref={containerRef} className="flex flex-col bg-black text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet" />

            <style>{`
                body::after { content:''; position:fixed; inset:0; pointer-events:none; z-index:9998; opacity:0.022;
                    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
                    background-size:200px 200px; }
                .main-nav { transition: background .35s ease, border-color .35s ease, backdrop-filter .35s ease; }
                .nav-solid { background: rgba(0,0,0,.85) !important; backdrop-filter: blur(24px) !important; border-bottom-color: rgba(255,255,255,.07) !important; }
                .word-clip { overflow:hidden; display:inline-block; }
                .glass-card { transition: border-color .25s ease, background .25s ease; }
                .glass-card:hover { border-color: rgba(255,255,255,.14) !important; background: rgba(255,255,255,.035) !important; }
                .feat-card:hover .feat-icon { color: #10b981; }
                /* How it works */
                .how-track { display:flex; height:100%; will-change:transform; }
                .how-panel { flex:0 0 100vw; width:100vw; display:flex; align-items:center; justify-content:center; }
                /* Testimonials marquee */
                .mq-left  { display:flex; animation: mq-l 30s linear infinite; width:max-content; }
                .mq-right { display:flex; animation: mq-r 35s linear infinite; width:max-content; }
                @keyframes mq-l { from{transform:translateX(0)} to{transform:translateX(-50%)} }
                @keyframes mq-r { from{transform:translateX(-50%)} to{transform:translateX(0)} }
                .mq-left:hover, .mq-right:hover { animation-play-state: paused; }
                .test-card { transition: border-color .25s ease, transform .3s ease, background .25s ease; }
                .test-card:hover { border-color: rgba(16,185,129,.3) !important; transform: translateY(-4px) !important; background: rgba(255,255,255,.035) !important; }
                /* Tickets */
                .ticket-wrapper { cursor:default; }
                .ticket-wrapper:hover { filter: drop-shadow(0 20px 50px rgba(16,185,129,.14)); }
                .ticket-body { overflow:hidden; }
                .price-rail-scroll { overflow-x:auto; cursor:grab; scroll-behavior:smooth; -ms-overflow-style:none; scrollbar-width:none; }
                .price-rail-scroll::-webkit-scrollbar { display:none; }
                /* FAQ */
                .faq-body { transition: max-height .38s cubic-bezier(.4,0,.2,1), opacity .28s ease, padding .28s ease; }
                /* Swipe lang toggle */
                .lang-toggle { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); z-index:9990; }
                .lang-track { position:relative; width:280px; height:52px; background:rgba(10,10,10,.8); border:1px solid rgba(255,255,255,.1); border-radius:999px; backdrop-filter:blur(24px); display:flex; align-items:center; padding:4px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.04); }
                .lang-track-fill { position:absolute; left:4px; top:4px; bottom:4px; border-radius:999px; background:linear-gradient(90deg, rgba(16,185,129,.12), rgba(16,185,129,.04)); pointer-events:none; transition:width .05s linear; }
                .lang-thumb { position:relative; z-index:2; width:72px; height:44px; border-radius:999px; background:rgba(16,185,129,.18); border:1px solid rgba(16,185,129,.5); display:flex; align-items:center; justify-content:center; gap:5px; cursor:grab; user-select:none; touch-action:none; transition:background .15s,border-color .15s,box-shadow .15s; will-change:transform; }
                .lang-thumb.dragging { cursor:grabbing; background:rgba(16,185,129,.3); box-shadow:0 0 28px rgba(16,185,129,.35); }
                .lang-hint { position:absolute; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.22); pointer-events:none; }
                .lang-hint-left { left:14px; }
                .lang-hint-right { right:14px; }
                /* Lang wave overlay — 2 phase */
                .lang-wave { position:fixed; bottom:28px; left:50%; width:80px; height:80px; border-radius:50%; background:#10b981; pointer-events:none; z-index:9992; transform-origin:center center; }
                @keyframes wave-in  { from{transform:translateX(-50%) scale(1)}  to{transform:translateX(-50%) scale(60)} }
                @keyframes wave-out { from{transform:translateX(-50%) scale(60)} to{transform:translateX(-50%) scale(0)} }
                .lang-wave.wave-in  { animation:wave-in  .75s cubic-bezier(.4,0,.2,1) forwards; }
                .lang-wave.wave-out { animation:wave-out .8s  cubic-bezier(.4,0,.2,1) forwards; }
                /* Varylo logo in wave */
                .lang-wave-logo { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:9993; pointer-events:none; }
                @keyframes logo-pop { 0%{opacity:0;transform:translate(-50%,-50%) scale(.4)} 40%{opacity:1;transform:translate(-50%,-50%) scale(1.08)} 60%{transform:translate(-50%,-50%) scale(.96)} 80%{transform:translate(-50%,-50%) scale(1.02)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
                @keyframes logo-out { 0%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) scale(.6)} }
                .lang-wave-logo.logo-in  { animation:logo-pop .5s cubic-bezier(.34,1.56,.64,1) .25s both; }
                .lang-wave-logo.logo-out { animation:logo-out .3s ease-in forwards; }
                /* Hero letter-spacing split on scroll */
                .hero-title-wrap { will-change:letter-spacing; overflow:hidden; }
            `}</style>

            {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
            <nav className="main-nav fixed top-0 left-0 right-0 z-50 border-b border-transparent">
                <div className="max-w-[1280px] mx-auto w-full flex items-center justify-between px-6 md:px-10 lg:px-16 py-4">
                    <span className="text-xl font-black tracking-tight select-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Varylo</span>
                    <div className="hidden md:flex items-center gap-7">
                        {[['#features', dict.nav.features], ['#pricing', dict.nav.pricing], ['#faq', dict.nav.faq], ['#contact', dict.nav.contact]].map(([href, label]) => (
                            <Link key={href} href={href} className="text-sm text-white/50 hover:text-white transition-colors duration-200">{label}</Link>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={`/${displayLang}/login`} className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors">{dict.nav.login}</Link>
                        <Link href={`/${displayLang}/register`}>
                            <button className="flex items-center gap-1.5 bg-white text-black text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/90 transition-colors">
                                {dict.nav.getStarted} <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ══ HERO ════════════════════════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col overflow-hidden">
                <div className="orb-a absolute top-0 right-[5%] w-[650px] h-[650px] rounded-full bg-emerald-500/10 blur-[160px] pointer-events-none -translate-y-1/4" />
                <div className="orb-b absolute bottom-0 left-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-700/8 blur-[130px] pointer-events-none translate-y-1/4" />
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,transparent_40%,black_100%)] pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-28 pb-8">
                    <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] backdrop-blur-sm px-4 py-2 text-xs text-white/70 font-medium mb-10 tracking-wide">
                        <Zap className="h-3 w-3 text-emerald-400" />{d.hero.badge}
                    </div>
                    <div className="hero-title-wrap max-w-5xl mx-auto mb-8 leading-[1.0]" style={{ letterSpacing: '-0.045em' }}>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {d.hero.title.split(' ').map((word: string, i: number) => (
                                <span key={i} className="word-clip">
                                    <span className="hero-word inline-block text-5xl sm:text-6xl lg:text-8xl font-black">
                                        {word}{i < d.hero.title.split(' ').length - 1 ? '\u00A0' : ''}
                                    </span>
                                </span>
                            ))}
                        </h1>
                    </div>
                    <p className="hero-sub text-base sm:text-lg text-white/55 max-w-xl mx-auto leading-relaxed mb-10">{d.hero.description}</p>
                    <div className="hero-actions flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link href={`/${displayLang}/register`}>
                            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-7 py-3.5 rounded-full transition-colors shadow-lg shadow-emerald-500/25">
                                {d.hero.ctaPrimary} <ArrowRight className="h-4 w-4" />
                            </button>
                        </Link>
                        <Link href="#features">
                            <button className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/25 px-7 py-3.5 rounded-full transition-all">
                                {d.hero.ctaSecondary}
                            </button>
                        </Link>
                    </div>
                </div>
                <div className="hero-proof relative z-10 pb-14 px-6 flex flex-col items-center gap-5">
                    <p className="text-[11px] uppercase tracking-[.2em] text-white/25 font-medium">{d.hero.socialProof}</p>
                    {logos.length > 0 ? (
                        <div className="flex items-center gap-8 flex-wrap justify-center">
                            {logos.map((l) => <img key={l.id} src={l.imageUrl} alt={l.name} className="h-7 max-w-[110px] object-contain grayscale opacity-30 hover:opacity-60 hover:grayscale-0 transition-all duration-300" />)}
                        </div>
                    ) : (
                        <div className="overflow-hidden w-full max-w-2xl">
                            <div className="mq-left gap-0">
                                {['NovaTech','RapidGo','GlowUp','DataFlow','Nexus','Orbix','NovaTech','RapidGo','GlowUp','DataFlow','Nexus','Orbix'].map((n,i) => (
                                    <span key={i} className="text-sm font-bold text-white/20 tracking-tight mx-8 shrink-0" style={{ fontFamily: 'Outfit, sans-serif' }}>{n}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ PROBLEMS ════════════════════════════════════════════════════════ */}
            <section className="reveal-section py-28 lg:py-36 relative overflow-hidden">
                {/* Ghost title background */}
                <div className="absolute inset-0 flex items-center justify-start pointer-events-none select-none overflow-hidden">
                    <span className="text-[clamp(80px,14vw,200px)] font-black leading-none text-white/[.025] whitespace-nowrap pl-8"
                        style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.06em' }}>PROBLEMA</span>
                </div>
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 relative">
                    <div className="s-heading mb-20">
                        <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 mb-5 block">El problema</span>
                        <h2 className="text-4xl sm:text-6xl font-black leading-[.9] max-w-xl" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.04em' }}>
                            {d.problems.title}
                        </h2>
                    </div>
                    {/* Numbered editorial rows */}
                    <div>
                        {problemList.map((p: any, i: number) => { const Icon = PROBLEM_ICONS[i]; return (
                            <div key={i} className="s-item group flex gap-6 lg:gap-12 items-start py-9 border-t border-white/[.05] last:border-b cursor-default
                                hover:bg-white/[.015] transition-colors duration-300 rounded-xl px-4 -mx-4">
                                {/* Ghost number */}
                                <span className="text-[56px] lg:text-[72px] font-black leading-none shrink-0 w-16 lg:w-20 text-right select-none"
                                    style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,.06)' }}>
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {/* Content */}
                                <div className="flex-1 pt-2">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-7 h-7 rounded-lg border border-red-500/25 bg-red-500/10 flex items-center justify-center shrink-0">
                                            <Icon size={14} className="text-red-400" />
                                        </div>
                                        <h3 className="text-lg lg:text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{p.title}</h3>
                                    </div>
                                    <p className="text-white/45 text-sm lg:text-base leading-relaxed max-w-2xl">{p.description}</p>
                                </div>
                                {/* Arrow indicator */}
                                <div className="pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">
                                    <ArrowUpRight size={18} className="text-white/20" />
                                </div>
                            </div>
                        ); })}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
            <section id="features" className="reveal-section py-28 lg:py-36">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16">
                    <div className="s-heading max-w-2xl mb-16">
                        <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 mb-5 block">Plataforma</span>
                        <h2 className="text-4xl sm:text-6xl font-black leading-[.9] max-w-xl" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.04em' }}>{d.features.title}</h2>
                        <p className="text-white/40 mt-5 text-base leading-relaxed max-w-lg">{d.features.subtitle}</p>
                    </div>
                    {/* Feature grid — 3×2, no orphans */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {featureList.map((f: any, i: number) => { const Icon = FEATURE_ICONS[i]; return (
                            <div key={i} className="s-item feat-card group relative rounded-2xl border border-white/[.07] bg-white/[.025] cursor-default overflow-hidden transition-all duration-300 hover:border-white/[.13] hover:bg-white/[.04]">
                                {/* Ghost icon */}
                                <div className="absolute -right-3 -bottom-3 opacity-[.04] pointer-events-none select-none">
                                    <Icon size={110} className="text-white" />
                                </div>
                                <div className="relative p-7 flex flex-col h-full min-h-[200px]">
                                    {/* Top row: icon + index */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="w-11 h-11 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center
                                            group-hover:border-emerald-500/40 group-hover:bg-emerald-500/18 transition-all duration-300">
                                            <Icon size={20} className="text-emerald-400" />
                                        </div>
                                        <span className="text-[11px] font-mono text-white/[.12] mt-1">{String(i + 1).padStart(2, '0')}</span>
                                    </div>
                                    {/* Text */}
                                    <h3 className="text-base lg:text-[17px] font-bold mb-2.5 leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>{f.title}</h3>
                                    <p className="text-white/42 text-sm leading-relaxed flex-1">{f.description}</p>
                                    {/* Bottom accent line */}
                                    <div className="mt-5 h-px bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                            </div>
                        ); })}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ METRICS ═════════════════════════════════════════════════════════ */}
            <section className="metrics-section py-28 lg:py-36 relative overflow-hidden bg-[#050e08]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(16,185,129,.08),transparent)] pointer-events-none" />
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 relative">
                    <div className="text-center mb-16">
                        <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 mb-4 block">Resultados</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.03em' }}>{d.solution.title}</h2>
                        <p className="text-white/50 mt-4 text-base">{d.solution.subtitle}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[.06] rounded-2xl overflow-hidden border border-white/[.06]">
                        {metrics.map((m: any, i: number) => (
                            <div key={i} className="metric-num bg-[#050e08] px-8 py-10 text-center">
                                <div className="text-4xl sm:text-6xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.04em' }}>{m.value}</div>
                                <p className="text-white/45 text-xs uppercase tracking-wider font-medium">{m.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ HOW IT WORKS — CSS STICKY (no GSAP pin = no spacer bugs) ════════ */}
            {/* Outer section is tall enough to contain the full horizontal scroll distance */}
            <section className="how-section relative" style={{ height: `calc(100vh + ${(steps.length - 1) * 100}vw)` }}>
                {/* Sticky inner — CSS handles the pin, not GSAP */}
                <div className="how-sticky sticky top-0 h-screen overflow-hidden bg-black">
                    {/* Progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/[.06] z-20">
                        <div className="how-bar h-full bg-emerald-500 w-0" style={{ transition: 'none' }} />
                    </div>

                    {/* Section header — pt-16 clears the fixed navbar */}
                    <div className="absolute top-0 left-0 right-0 pt-16 pb-4 z-20 border-b border-white/[.06] pointer-events-none">
                        <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 flex items-end justify-between">
                            <div>
                                <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 block mb-1">Proceso</span>
                                <h2 className="text-xl sm:text-2xl font-extrabold" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.02em' }}>{d.how.title}</h2>
                            </div>
                            <div className="flex items-center gap-2 pb-1">
                                <span className="text-2xl font-black text-white how-step-num" style={{ fontFamily: 'Outfit, sans-serif' }}>1</span>
                                <span className="text-white/25">/</span>
                                <span className="text-white/25">{steps.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Horizontal track */}
                    <div className="how-track">
                        {steps.map((step: any, i: number) => {
                            const StepIcon = STEP_ICONS[i];
                            return (
                                <div key={i} className="how-panel">
                                    {/* Two-column layout with visual body */}
                                    <div className="w-full max-w-5xl mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center" style={{ paddingTop: '120px' }}>

                                        {/* Left — visual card */}
                                        <div className="order-2 lg:order-1">
                                            <div className="rounded-3xl border border-white/[.08] bg-white/[.03] p-8 relative overflow-hidden">
                                                {/* Background step number */}
                                                <div className="absolute -bottom-4 -right-4 text-[120px] font-black leading-none select-none pointer-events-none"
                                                    style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.03)' }}>
                                                    {String(i + 1).padStart(2, '0')}
                                                </div>
                                                {/* Icon */}
                                                <div className="w-16 h-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center mb-6 relative">
                                                    <StepIcon size={28} className="text-emerald-400" />
                                                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 blur-xl" />
                                                </div>
                                                {/* Status line */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Activo</span>
                                                </div>
                                                {/* Mini stats */}
                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                    {[
                                                        ['Canales', i === 0 ? '3' : i === 1 ? '∞' : '+47%'],
                                                        ['Estado', i === 0 ? 'Listo' : i === 1 ? 'Auto' : '↑ Creciendo'],
                                                    ].map(([label, val]) => (
                                                        <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                                                            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
                                                            <p className="text-base font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{val}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right — text */}
                                        <div className="order-1 lg:order-2">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-xs text-white/40 font-medium tracking-wider mb-6">
                                                <span className="text-emerald-400 font-bold">PASO {i + 1}</span>
                                                <span>DE {steps.length}</span>
                                            </div>
                                            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight text-white"
                                                style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.03em' }}>
                                                {step.title}
                                            </h3>
                                            <p className="text-white/55 text-base sm:text-lg leading-relaxed mb-8">{step.description}</p>
                                            {/* Progress dots */}
                                            <div className="flex items-center gap-2">
                                                {steps.map((_: any, j: number) => (
                                                    <div key={j} className="rounded-full transition-all duration-300"
                                                        style={{ width: j === i ? '32px' : '8px', height: '8px', background: j === i ? '#10b981' : 'rgba(255,255,255,0.15)' }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Scroll hint */}
                    <div className="absolute bottom-6 left-0 right-0 text-center z-20 pointer-events-none">
                        <span className="text-[10px] uppercase tracking-[.25em] text-white/20">Scroll para continuar</span>
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ TESTIMONIALS — DUAL MARQUEE ═════════════════════════════════════ */}
            <section className="test-section py-24 lg:py-32 overflow-hidden">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 mb-14">
                    <div className="test-heading max-w-xl">
                        <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 mb-4 block">Testimonios</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.03em' }}>{d.testimonials.title}</h2>
                    </div>
                </div>
                {/* Row 1 → left */}
                <div className="mb-4">
                    <div className="mq-left">
                        {mq1.map((t: any, i: number) => (
                            <div key={i} className="test-card mx-2 w-[380px] shrink-0 rounded-2xl border border-white/[.07] bg-white/[.02] p-6 cursor-default">
                                <div className="flex gap-0.5 mb-4">
                                    {[...Array(5)].map((_,j) => <Star key={j} size={14} className="fill-emerald-400 text-emerald-400" />)}
                                </div>
                                <p className="text-white/80 text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex items-center gap-3 pt-4 border-t border-white/[.06]">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                                        {t.author.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-white">{t.author}</p>
                                        <p className="text-white/35 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Row 2 → right */}
                <div>
                    <div className="mq-right">
                        {mq2.map((t: any, i: number) => (
                            <div key={i} className="test-card mx-2 w-[380px] shrink-0 rounded-2xl border border-white/[.07] bg-white/[.02] p-6 cursor-default">
                                <div className="flex gap-0.5 mb-4">
                                    {[...Array(5)].map((_,j) => <Star key={j} size={14} className="fill-emerald-400 text-emerald-400" />)}
                                </div>
                                <p className="text-white/80 text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex items-center gap-3 pt-4 border-t border-white/[.06]">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                                        {t.author.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-white">{t.author}</p>
                                        <p className="text-white/35 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ PRICING — TRAIN TICKETS ══════════════════════════════════════════ */}
            <section id="pricing" className="price-section py-28 lg:py-36">
                {/* Header */}
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 mb-20">
                    <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 mb-4 block">Precios</span>
                    <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight max-w-xl" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.03em' }}>{d.pricing.title}</h2>
                    <p className="text-white/50 mt-4 text-base">{d.pricing.subtitle}</p>
                    <p className="text-white/25 text-xs mt-3 flex items-center gap-1.5">
                        <span>←</span> Arrastra para explorar <span>→</span>
                    </p>
                </div>

                {/* Rail bar — full viewport width */}
                <div className="w-full h-[8px] bg-[#111] border-y border-white/[.06] shadow-[0_2px_20px_rgba(0,0,0,0.8)]" />

                {/* Drag-to-scroll rail */}
                <div
                    ref={priceRailRef}
                    className="price-rail-scroll w-full"
                    onMouseDown={onPriceDragStart}
                >
                    <div className="flex gap-5 pt-2 pb-16 min-w-max" style={{ paddingLeft: 'max(10vw, calc(50vw - 420px))', paddingRight: 'max(10vw, calc(50vw - 420px))' }}>
                        {planItems.map((plan, idx) => (
                            <div key={plan.key} className="ticket-wrapper" style={{ transformOrigin: 'top center' }}>
                                {/* Clip */}
                                <div className="mx-auto w-9 h-10 bg-[#111] border border-white/[.1] rounded-b-xl flex flex-col items-center justify-center gap-1 relative z-20 shadow-md">
                                    <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 bg-transparent" />
                                </div>

                                {/* Ticket body — narrower, train ticket proportions */}
                                <div className={`ticket-body w-[260px] border border-t-0 ${plan.featured ? 'border-emerald-500/30' : 'border-white/[.08]'}`}>

                                    {/* Colored accent stripe */}
                                    <div className={`h-[3px] w-full ${plan.featured ? 'bg-emerald-500' : 'bg-white/10'}`} />

                                    {/* Stub header — serial + type */}
                                    <div className={`px-5 pt-3 pb-3 border-b border-dashed ${plan.featured ? 'bg-[#111] border-emerald-500/15' : 'bg-[#0d0d0d] border-white/[.06]'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-mono text-white/25 tracking-widest">{plan.serial}</span>
                                            <span className={`text-[9px] font-mono tracking-widest ${plan.featured ? 'text-emerald-500/60' : 'text-white/20'}`}>PLAN</span>
                                        </div>
                                    </div>

                                    {/* Main area — plan name + price */}
                                    <div className={`px-5 pt-6 pb-6 ${plan.featured ? 'bg-emerald-500' : 'bg-[#111]'}`}>
                                        <h3 className={`font-black uppercase leading-none mb-5 ${plan.featured ? 'text-black' : 'text-white'}`}
                                            style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.02em', fontSize: 'clamp(2.2rem,4vw,3rem)' }}>
                                            {plan.title}
                                        </h3>
                                        <div className={`flex items-baseline gap-1 ${plan.featured ? 'text-black' : 'text-white'}`}>
                                            <span className="font-black" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.04em', fontSize: '2rem' }}>{plan.price}</span>
                                            <span className={`text-xs ${plan.featured ? 'text-black/45' : 'text-white/35'}`}>/mes</span>
                                        </div>
                                    </div>

                                    {/* Tear line with side notches */}
                                    <div className={`border-t-2 border-dashed relative ${plan.featured ? 'border-black/[.12]' : 'border-white/[.07]'}`}>
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-white/[.08]" />
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-black border border-white/[.08]" />
                                    </div>

                                    {/* Features + CTA */}
                                    <div className={`px-5 pt-5 pb-5 ${plan.featured ? 'bg-[#047857]' : 'bg-[#0a0a0a]'}`}>
                                        <p className={`text-[11px] leading-relaxed mb-4 ${plan.featured ? 'text-black/55' : 'text-white/35'}`}>{plan.desc}</p>
                                        <ul className="space-y-2 mb-6">
                                            {plan.features.map((f: string, fi: number) => (
                                                <li key={fi} className={`flex items-start gap-2 text-xs ${plan.featured ? 'text-black/75' : 'text-white/55'}`}>
                                                    <Check size={12} className={`mt-0.5 shrink-0 ${plan.featured ? 'text-black/50' : 'text-emerald-500'}`} />{f}
                                                </li>
                                            ))}
                                        </ul>
                                        <Link href={plan.href} className="block" onClick={(e) => e.stopPropagation()}>
                                            {plan.featured ? (
                                                <button className="w-full py-2.5 rounded-lg bg-black text-white font-bold text-xs hover:bg-black/80 transition-colors">{plan.cta}</button>
                                            ) : (
                                                <button className="w-full py-2.5 rounded-lg border border-white/10 hover:border-white/25 text-white/65 hover:text-white font-medium text-xs transition-all">{plan.cta}</button>
                                            )}
                                        </Link>
                                    </div>

                                    {/* Barcode decoration */}
                                    <div className={`px-5 py-3 flex items-end gap-[2px] ${plan.featured ? 'bg-[#047857]' : 'bg-[#0a0a0a]'} border-t ${plan.featured ? 'border-black/[.1]' : 'border-white/[.04]'}`}>
                                        {BAR_WIDTHS.map((w, bi) => (
                                            <div key={bi} className={`shrink-0 ${plan.featured ? 'bg-black/20' : 'bg-white/[.1]'}`}
                                                style={{ width: `${w}px`, height: `${8 + (bi % 3) * 5}px` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ FAQ ══════════════════════════════════════════════════════════════ */}
            <section id="faq" className="py-28 lg:py-36">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16">
                    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-16 max-w-6xl">
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 mb-4 block">FAQ</span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight sticky top-24" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.03em' }}>{d.faq.title}</h2>
                        </div>
                        <div className="faq-list">
                            {faqs.map((q: any, i: number) => (
                                <div key={i} className="faq-row border-b border-white/[.07]">
                                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex items-center justify-between py-5 text-left group">
                                        <span className="text-sm font-semibold text-white/85 group-hover:text-white pr-6 transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>{q.question}</span>
                                        <ChevronDown size={16} className={`text-white/30 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-emerald-400' : ''}`} />
                                    </button>
                                    <div className={`faq-body overflow-hidden ${openFaq === i ? 'max-h-72 opacity-100 pb-5' : 'max-h-0 opacity-0 pb-0'}`}>
                                        <p className="text-white/50 text-sm leading-relaxed">{q.answer}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[.06]" />

            {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
            <section className="cta-section py-28 lg:py-40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(16,185,129,.09),transparent)] pointer-events-none" />
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 relative">
                    <div className="cta-text max-w-3xl">
                        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[.95] mb-8"
                            style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.045em' }}>{d.cta.title}</h2>
                        <p className="text-white/50 text-lg mb-10 leading-relaxed max-w-xl">{d.cta.subtitle}</p>
                        <Link href={`/${displayLang}/register`}>
                            <button className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-full text-base transition-colors shadow-xl shadow-emerald-500/20">
                                {d.cta.button} <ArrowRight className="h-4 w-4" />
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══ CONTACT ══════════════════════════════════════════════════════════ */}
            <section id="contact" className="relative overflow-hidden bg-black">
                {/* Big background text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="text-[clamp(120px,20vw,280px)] font-black leading-none text-white/[.02] whitespace-nowrap"
                        style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.06em' }}>HABLEMOS</span>
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(16,185,129,.06),transparent)] pointer-events-none" />

                <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 py-32 lg:py-44">
                    <div className="grid lg:grid-cols-2 gap-20 items-start">
                        {/* Left — large text */}
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-500 mb-6 block">Contacto</span>
                            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[.92] mb-8"
                                style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-.045em' }}>
                                {d.contact.title}
                            </h2>
                            <p className="text-white/40 text-lg leading-relaxed max-w-sm">{d.contact.subtitle}</p>
                            {/* Decorative line */}
                            <div className="mt-12 flex items-center gap-4">
                                <div className="h-px w-16 bg-emerald-500/40" />
                                <span className="text-xs text-white/25 uppercase tracking-[.15em]">Respuesta en &lt; 24h</span>
                            </div>
                        </div>
                        {/* Right — form */}
                        <div>
                            <ContactForm dict={d.contact.form} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ SWIPE LANGUAGE TOGGLE — sticky bottom ════════════════════════════ */}
            {wavePhase !== 'idle' && (
                <>
                    <div className={`lang-wave ${wavePhase === 'in' ? 'wave-in' : 'wave-out'}`} />
                    {/* Varylo logo pops in the center of the wave */}
                    <div className={`lang-wave-logo ${wavePhase === 'in' ? 'logo-in' : 'logo-out'}`}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '2.8rem', letterSpacing: '-.04em', color: '#000', lineHeight: 1 }}>
                            Varylo
                        </span>
                    </div>
                </>
            )}
            <div className="lang-toggle">
                <div className="lang-track">
                    {/* Progress fill behind thumb */}
                    <div className="lang-track-fill" style={{ width: `${4 + swipeX * 0.98}px` }} />
                    {/* Left hint */}
                    <span className="lang-hint lang-hint-left" style={{ opacity: swipeX > 40 ? 0 : Math.max(0, 1 - swipeX / 40) }}>
                        {currentLocale === 'es' ? '🇺🇸' : '🇪🇸'}
                    </span>
                    {/* Right hint */}
                    <span className="lang-hint lang-hint-right" style={{ opacity: swipeX < 160 ? 0 : (swipeX - 160) / 40 }}>
                        ✓
                    </span>
                    {/* Thumb */}
                    <div
                        className={`lang-thumb${isSwiping ? ' dragging' : ''}`}
                        style={{ transform: `translateX(${swipeX}px)`, transition: isSwiping ? 'none' : 'transform .35s cubic-bezier(.34,1.56,.64,1), background .15s, box-shadow .15s' }}
                        onPointerDown={onSwipePointerDown}
                        onPointerMove={onSwipePointerMove}
                        onPointerUp={onSwipePointerUp}
                        onPointerLeave={onSwipePointerUp}
                    >
                        <span className="text-lg leading-none select-none">{currentLocale === 'es' ? '🇪🇸' : '🇺🇸'}</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(16,185,129,.8)', flexShrink: 0 }}>
                            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>

            {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
            <footer className="border-t border-white/[.06]">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 py-12">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
                        <div className="max-w-xs">
                            <span className="text-xl font-black tracking-tight block mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Varylo</span>
                            <p className="text-white/35 text-sm leading-relaxed">{dict.footer.description}</p>
                        </div>
                        <div className="flex gap-12 sm:gap-16">
                            {[
                                { label: dict.footer.product, links: [['#features', dict.footer.features], ['#pricing', dict.footer.pricing], ['#faq', dict.footer.faq]] },
                                { label: dict.footer.company, links: [['#contact', dict.footer.contact], [`/${lang}/terms`, dict.footer.terms], [`/${lang}/privacy`, dict.footer.privacy]] },
                                { label: dict.footer.account, links: [[`/${lang}/login`, dict.footer.login], [`/${lang}/register`, dict.footer.createAccount]] },
                            ].map(({ label, links }) => (
                                <div key={label} className="flex flex-col gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25 mb-1">{label}</span>
                                    {links.map(([href, text]) => (
                                        <Link key={href} href={href} className="text-sm text-white/40 hover:text-white transition-colors">{text}</Link>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-white/[.06] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-white/25 text-xs">&copy; 2026 {dict.footer.rights}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
