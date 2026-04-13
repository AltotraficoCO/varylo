'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ContactForm } from './contact-form';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
    Check, MessageSquare, Bot, Workflow, Users, BarChart3,
    ArrowRight, Star, Zap, AlertTriangle, EyeOff, Moon, Shield,
    ChevronDown, ArrowUpRight,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Plan = {
    id: string; name: string; price: number; description: string;
    features: string[]; isFeatured: boolean; ctaText: string;
    ctaLink: string | null; slug: string;
};
type Logo = { id: string; name: string; imageUrl: string };

interface LandingClientProps {
    lang: string;
    d: any;
    dict: any;
    plans: Plan[];
    logos: Logo[];
}

const FEATURE_ICONS = [MessageSquare, Bot, Workflow, Users, BarChart3, Shield];
const PROBLEM_ICONS = [AlertTriangle, EyeOff, Moon];

export function LandingClient({ lang, d, dict, plans, logos }: LandingClientProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const featureList = [
        d.features.omnichannel, d.features.aiAgents, d.features.chatbots,
        d.features.agents, d.features.analytics, d.features.ai,
    ];
    const problemList = [d.problems.p1, d.problems.p2, d.problems.p3];
    const steps = [d.how.step1, d.how.step2, d.how.step3];
    const testimonials = [d.testimonials.t1, d.testimonials.t2, d.testimonials.t3];
    const faqs = [d.faq.q1, d.faq.q2, d.faq.q3, d.faq.q4, d.faq.q5];
    const metrics = Object.values(d.solution.metrics) as any[];

    useGSAP(() => {
        // ─── HERO ────────────────────────────────────────────────────────────
        const heroTl = gsap.timeline({ delay: 0.15 });
        heroTl
            .from('.hero-badge', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' })
            .from('.hero-word', {
                yPercent: 110, opacity: 0, duration: 1, ease: 'power4.out', stagger: 0.045,
            }, '-=0.2')
            .from('.hero-sub', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
            .from('.hero-actions', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
            .from('.hero-proof', { opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');

        // Navbar on scroll
        ScrollTrigger.create({
            start: 'top -10',
            end: 99999,
            toggleClass: { targets: '.main-nav', className: 'nav-solid' },
        });

        // Orb float
        gsap.to('.orb-a', { x: 50, y: -35, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.orb-b', { x: -40, y: 50, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });

        // ─── GENERIC STAGGER REVEALS ─────────────────────────────────────────
        gsap.utils.toArray<HTMLElement>('.reveal-section').forEach((section) => {
            const heading = section.querySelector('.s-heading');
            const items = section.querySelectorAll('.s-item');
            const tl = gsap.timeline({
                scrollTrigger: { trigger: section, start: 'top 78%', once: true },
            });
            if (heading) tl.from(heading, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out' });
            if (items.length) tl.from(items, { y: 50, opacity: 0, duration: 0.75, ease: 'power3.out', stagger: 0.1 }, '-=0.4');
        });

        // ─── METRICS ─────────────────────────────────────────────────────────
        gsap.from('.metric-num', {
            scale: 0.7, opacity: 0, duration: 0.8, ease: 'back.out(1.4)', stagger: 0.12,
            scrollTrigger: { trigger: '.metrics-section', start: 'top 80%', once: true },
        });

        // ─── HOW IT WORKS — HORIZONTAL SLIDE ────────────────────────────────
        const howPanels = gsap.utils.toArray<HTMLElement>('.how-panel');
        if (howPanels.length > 0) {
            gsap.to('.how-track', {
                x: () => -(howPanels.length - 1) * window.innerWidth,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.how-section',
                    start: 'top top',
                    end: () => `+=${(howPanels.length - 1) * window.innerWidth}`,
                    pin: true,
                    scrub: 1,
                    anticipatePin: 1,
                    onUpdate(self) {
                        const num = document.querySelector('.how-step-num');
                        const bar = document.querySelector('.how-bar') as HTMLElement;
                        if (num) num.textContent = String(Math.min(3, Math.floor(self.progress * 3) + 1));
                        if (bar) bar.style.width = `${Math.round(self.progress * 100)}%`;
                    },
                },
            });
        }

        // ─── PRICING TICKETS ─────────────────────────────────────────────────
        const ticketEls = gsap.utils.toArray<HTMLElement>('.ticket-wrapper');
        if (ticketEls.length > 0) {
            // Set alternating initial rotations
            ticketEls.forEach((el, i) => {
                gsap.set(el, { rotation: i % 2 === 0 ? -5 : 5, transformOrigin: 'top center' });
            });
            // Drop in from above like being hung on a rail
            gsap.from(ticketEls, {
                y: -160, opacity: 0, duration: 1.5, ease: 'power4.out', stagger: 0.13,
                scrollTrigger: { trigger: '.price-section', start: 'top 75%', once: true },
            });
            // Continuous tilt as section scrolls through viewport
            ticketEls.forEach((el, i) => {
                gsap.to(el, {
                    rotation: i % 2 === 0 ? 5 : -5,
                    ease: 'none',
                    transformOrigin: 'top center',
                    scrollTrigger: {
                        trigger: '.price-section',
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 2.5,
                    },
                });
            });
        }

        // ─── FAQ ─────────────────────────────────────────────────────────────
        gsap.from('.faq-row', {
            y: 20, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07,
            scrollTrigger: { trigger: '.faq-list', start: 'top 82%', once: true },
        });

        // ─── CTA ─────────────────────────────────────────────────────────────
        gsap.from('.cta-text', {
            y: 60, opacity: 0, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: '.cta-section', start: 'top 75%', once: true },
        });

        ScrollTrigger.refresh();
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="flex flex-col bg-black text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet" />

            <style>{`
                /* Noise grain overlay */
                body::after {
                    content: '';
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 9998;
                    opacity: 0.022;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
                    background-size: 200px 200px;
                }
                /* Nav */
                .main-nav { transition: background 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease; }
                .nav-solid { background: rgba(0,0,0,0.82) !important; backdrop-filter: blur(24px) !important; border-bottom-color: rgba(255,255,255,0.07) !important; }
                /* Word clip */
                .word-clip { overflow: hidden; display: inline-block; }
                /* Card hover */
                .glass-card { transition: border-color 0.25s ease, background 0.25s ease; }
                .glass-card:hover { border-color: rgba(255,255,255,0.14) !important; background: rgba(255,255,255,0.035) !important; }
                .feat-card:hover .feat-icon { color: #10b981; transition: color 0.2s ease; }
                /* Marquee */
                .marquee-inner { display: flex; animation: ticker 22s linear infinite; width: max-content; }
                @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                /* How it works */
                .how-track { display: flex; will-change: transform; height: 100%; }
                .how-panel { flex: 0 0 100vw; width: 100vw; display: flex; align-items: center; justify-content: center; }
                /* FAQ */
                .faq-body { transition: max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease, padding 0.28s ease; }
                /* Price card hover */
                /* Tickets */
                .ticket-wrapper { cursor: default; }
                .ticket-wrapper:hover { filter: drop-shadow(0 24px 48px rgba(16,185,129,0.12)); }
                .ticket-clip { position: relative; z-index: 20; }
                .ticket-body { overflow: hidden; }
            `}</style>

            {/* ═══════════ NAVBAR ═══════════════════════════════════════════════ */}
            <nav className="main-nav fixed top-0 left-0 right-0 z-50 border-b border-transparent flex items-center justify-between px-6 md:px-10 lg:px-16 py-4">
                <span className="text-xl font-black tracking-tight select-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Varylo</span>
                <div className="hidden md:flex items-center gap-7">
                    {[['#features', dict.nav.features], ['#pricing', dict.nav.pricing], ['#faq', dict.nav.faq], ['#contact', dict.nav.contact]].map(([href, label]) => (
                        <Link key={href} href={href} className="text-sm text-white/50 hover:text-white transition-colors duration-200">{label}</Link>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <LanguageSwitcher variant="dark" />
                    <Link href={`/${lang}/login`} className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors duration-200">
                        {dict.nav.login}
                    </Link>
                    <Link href={`/${lang}/register`}>
                        <button className="flex items-center gap-1.5 bg-white text-black text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/90 transition-colors duration-200">
                            {dict.nav.getStarted} <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                    </Link>
                </div>
            </nav>

            {/* ═══════════ HERO ═════════════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col overflow-hidden">
                {/* Ambient orbs */}
                <div className="orb-a absolute top-0 right-[5%] w-[650px] h-[650px] rounded-full bg-emerald-500/10 blur-[160px] pointer-events-none -translate-y-1/4" />
                <div className="orb-b absolute bottom-0 left-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-700/8 blur-[130px] pointer-events-none translate-y-1/4" />

                {/* Subtle grid */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
                {/* Fade edges */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,transparent_40%,black_100%)] pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-28 pb-8">
                    <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-2 text-xs text-white/70 font-medium mb-10 tracking-wide">
                        <Zap className="h-3 w-3 text-emerald-400" />
                        {d.hero.badge}
                    </div>

                    <h1 className="max-w-5xl mx-auto mb-8 leading-[1.0]" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.045em' }}>
                        {d.hero.title.split(' ').map((word: string, i: number) => (
                            <span key={i} className="word-clip">
                                <span className="hero-word inline-block text-5xl sm:text-6xl lg:text-8xl font-black">
                                    {word}{i < d.hero.title.split(' ').length - 1 ? '\u00A0' : ''}
                                </span>
                            </span>
                        ))}
                    </h1>

                    <p className="hero-sub text-base sm:text-lg text-white/55 max-w-xl mx-auto leading-relaxed mb-10">
                        {d.hero.description}
                    </p>

                    <div className="hero-actions flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link href={`/${lang}/register`}>
                            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-7 py-3.5 rounded-full transition-colors duration-200 shadow-lg shadow-emerald-500/25">
                                {d.hero.ctaPrimary} <ArrowRight className="h-4 w-4" />
                            </button>
                        </Link>
                        <Link href="#features">
                            <button className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/25 px-7 py-3.5 rounded-full transition-all duration-200">
                                {d.hero.ctaSecondary}
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Social proof */}
                <div className="hero-proof relative z-10 pb-14 px-6 flex flex-col items-center gap-5">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-medium">{d.hero.socialProof}</p>
                    {logos.length > 0 ? (
                        <div className="flex items-center gap-8 flex-wrap justify-center">
                            {logos.map((l) => (
                                <img key={l.id} src={l.imageUrl} alt={l.name}
                                    className="h-7 max-w-[110px] object-contain grayscale opacity-30 hover:opacity-60 hover:grayscale-0 transition-all duration-300" />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden relative w-full max-w-2xl">
                            <div className="marquee-inner gap-16">
                                {['NovaTech', 'RapidGo', 'GlowUp', 'DataFlow', 'Nexus', 'Orbix', 'NovaTech', 'RapidGo', 'GlowUp', 'DataFlow', 'Nexus', 'Orbix'].map((n, i) => (
                                    <span key={i} className="text-sm font-bold text-white/20 tracking-tight mx-8 shrink-0" style={{ fontFamily: 'Outfit, sans-serif' }}>{n}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════ DIVIDER ══════════════════════════════════════════════ */}
            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ PROBLEMS ═════════════════════════════════════════════ */}
            <section className="reveal-section py-28 lg:py-36">
                <div className="container mx-auto px-6 md:px-10 lg:px-16">
                    <div className="s-heading max-w-2xl mb-16">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-4 block">El problema</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.problems.title}</h2>
                        <p className="text-white/50 mt-4 text-base leading-relaxed">{d.problems.subtitle}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {problemList.map((p: any, i: number) => {
                            const Icon = PROBLEM_ICONS[i];
                            return (
                                <div key={i} className="s-item glass-card rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 cursor-default">
                                    <div className="w-10 h-10 rounded-xl border border-red-500/20 bg-red-500/8 flex items-center justify-center mb-6">
                                        <Icon className="h-4.5 w-4.5 text-red-400" size={18} />
                                    </div>
                                    <h3 className="text-base font-bold mb-3 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{p.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{p.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ FEATURES ═════════════════════════════════════════════ */}
            <section id="features" className="reveal-section py-28 lg:py-36">
                <div className="container mx-auto px-6 md:px-10 lg:px-16">
                    <div className="s-heading max-w-2xl mb-16">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-4 block">Plataforma</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.features.title}</h2>
                        <p className="text-white/50 mt-4 text-base leading-relaxed">{d.features.subtitle}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featureList.map((f: any, i: number) => {
                            const Icon = FEATURE_ICONS[i];
                            return (
                                <div key={i} className="s-item feat-card glass-card rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 cursor-default group">
                                    <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-6">
                                        <Icon className="feat-icon h-4.5 w-4.5 text-white/50 transition-colors" size={18} />
                                    </div>
                                    <h3 className="text-base font-bold mb-3 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{f.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ METRICS ══════════════════════════════════════════════ */}
            <section className="metrics-section py-28 lg:py-36 relative overflow-hidden bg-[#050e08]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(16,185,129,0.08),transparent)] pointer-events-none" />
                <div className="container mx-auto px-6 md:px-10 lg:px-16 relative">
                    <div className="text-center mb-16">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-4 block">Resultados</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.solution.title}</h2>
                        <p className="text-white/50 mt-4 text-base">{d.solution.subtitle}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
                        {metrics.map((m: any, i: number) => (
                            <div key={i} className="metric-num bg-[#050e08] px-8 py-10 text-center">
                                <div className="text-4xl sm:text-6xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em' }}>
                                    {m.value}
                                </div>
                                <p className="text-white/45 text-xs uppercase tracking-wider font-medium">{m.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ HOW IT WORKS — PINNED ═══════════════════════════════ */}
            <section className="how-section h-screen relative bg-black">
                {/* Top progress bar */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/[0.06] z-20">
                    <div className="how-bar h-full bg-emerald-500 w-0" style={{ transition: 'none' }} />
                </div>

                {/* Header fixed top */}
                <div className="absolute top-0 left-0 right-0 pt-8 pb-6 z-20 border-b border-white/[0.06] px-6 md:px-10 lg:px-16 flex items-center justify-between pointer-events-none">
                    <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 block mb-1">Proceso</span>
                        <h2 className="text-xl sm:text-2xl font-extrabold" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>{d.how.title}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-white how-step-num" style={{ fontFamily: 'Outfit, sans-serif' }}>1</span>
                        <span className="text-white/25 text-lg font-light">/</span>
                        <span className="text-white/25 text-lg">3</span>
                    </div>
                </div>

                {/* Horizontal track — overflow-hidden HERE (not on section) so pin spacer works */}
                <div className="absolute inset-0 overflow-hidden">
                <div className="how-track h-full">
                    {steps.map((step: any, i: number) => (
                        <div key={i} className="how-panel px-6">
                            <div className="max-w-2xl mx-auto text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm text-2xl font-black text-emerald-400 mb-8"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {String(i + 1).padStart(2, '0')}
                                </div>
                                <h3 className="text-2xl sm:text-4xl font-extrabold mb-6 text-white leading-tight"
                                    style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                                    {step.title}
                                </h3>
                                <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                </div>{/* /overflow-hidden wrapper */}

                {/* Bottom hint */}
                <div className="absolute bottom-8 left-0 right-0 text-center z-20 pointer-events-none">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-white/20">Scroll para continuar</span>
                </div>
            </section>

            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ TESTIMONIALS ═════════════════════════════════════════ */}
            <section className="reveal-section py-28 lg:py-36">
                <div className="container mx-auto px-6 md:px-10 lg:px-16">
                    <div className="s-heading max-w-xl mb-16">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-4 block">Testimonios</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.testimonials.title}</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {testimonials.map((t: any, i: number) => (
                            <div key={i} className="s-item glass-card rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 cursor-default">
                                <div className="flex gap-0.5 mb-5">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                                    ))}
                                </div>
                                <p className="text-white/75 text-sm leading-relaxed mb-7">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex items-center gap-3 pt-5 border-t border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
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

            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ PRICING — TICKETS ════════════════════════════════ */}
            <section id="pricing" className="price-section py-28 lg:py-36 overflow-hidden">
                <div className="container mx-auto px-6 md:px-10 lg:px-16">
                    <div className="max-w-xl mb-20">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-4 block">Precios</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.pricing.title}</h2>
                        <p className="text-white/50 mt-4 text-base">{d.pricing.subtitle}</p>
                    </div>

                    {/* Rail + tickets */}
                    <div className="relative max-w-5xl mx-auto">
                        {/* Rail bar — clips hang from here */}
                        <div className="hidden md:block absolute left-0 right-0 top-[15px] h-[7px] bg-[#111] border border-white/[0.08] rounded-full z-10 shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />

                        <div className="price-grid flex flex-col md:flex-row gap-6 md:gap-5 items-start justify-center">
                            {(plans.length > 0 ? plans.map((plan) => ({
                                key: plan.id,
                                title: plan.name,
                                price: `$${plan.price}`,
                                desc: plan.description,
                                features: plan.features,
                                featured: plan.isFeatured,
                                href: plan.ctaLink || `/${lang}/register?plan=${plan.slug}`,
                                cta: plan.ctaText,
                            })) : [
                                { key: 'starter', title: d.pricing.starter.title, price: '$29', desc: d.pricing.starter.description, features: d.pricing.starter.features, featured: false, href: `/${lang}/register?plan=STARTER`, cta: d.pricing.cta },
                                { key: 'pro', title: d.pricing.pro.title, price: '$79', desc: d.pricing.pro.description, features: d.pricing.pro.features, featured: true, href: `/${lang}/register?plan=PRO`, cta: d.pricing.cta },
                                { key: 'scale', title: d.pricing.scale.title, price: '$199', desc: d.pricing.scale.description, features: d.pricing.scale.features, featured: false, href: '#contact', cta: d.pricing.ctaCustom },
                            ]).map((plan, idx) => (
                                <div key={plan.key} className="ticket-wrapper w-full md:flex-1" style={{ transformOrigin: 'top center' }}>

                                    {/* Clip — sits on the rail */}
                                    <div className="ticket-clip mx-auto w-9 h-9 bg-[#111] border border-white/[0.1] rounded-b-xl flex items-center justify-center shadow-md">
                                        <div className="w-3 h-3 rounded-full border-[1.5px] border-white/25 bg-transparent" />
                                    </div>

                                    {/* Ticket body */}
                                    <div className={`ticket-body rounded-b-2xl border border-t-0 ${plan.featured ? 'border-emerald-500/30' : 'border-white/[0.08]'}`}>

                                        {/* ── TOP: plan name + price ────── */}
                                        <div className={`px-6 pt-8 pb-7 ${plan.featured ? 'bg-emerald-500' : 'bg-[#111]'}`}>
                                            <p className={`text-[10px] font-semibold uppercase tracking-[0.25em] mb-4 ${plan.featured ? 'text-black/50' : 'text-white/30'}`}>
                                                Plan
                                            </p>
                                            <h3 className={`font-black uppercase leading-none mb-6 ${plan.featured ? 'text-black' : 'text-white'}`}
                                                style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em', fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
                                                {plan.title}
                                            </h3>
                                            <div className={`flex items-baseline gap-1.5 ${plan.featured ? 'text-black' : 'text-white'}`}>
                                                <span className="font-black" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                                                    {plan.price}
                                                </span>
                                                <span className={`text-sm ${plan.featured ? 'text-black/45' : 'text-white/35'}`}>/mes</span>
                                            </div>
                                        </div>

                                        {/* ── PERFORATED TEAR LINE ─────── */}
                                        <div className={`border-t-2 border-dashed ${plan.featured ? 'border-black/[0.12]' : 'border-white/[0.06]'}`} />

                                        {/* ── BOTTOM: features + CTA ───── */}
                                        <div className={`px-6 pt-6 pb-8 ${plan.featured ? 'bg-[#059669]' : 'bg-[#0a0a0a]'}`}>
                                            <p className={`text-xs leading-relaxed mb-5 ${plan.featured ? 'text-black/60' : 'text-white/40'}`}>
                                                {plan.desc}
                                            </p>
                                            <ul className="space-y-2.5 mb-7">
                                                {plan.features.map((f: string, fi: number) => (
                                                    <li key={fi} className={`flex items-start gap-2.5 text-sm ${plan.featured ? 'text-black/80' : 'text-white/55'}`}>
                                                        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${plan.featured ? 'text-black/50' : 'text-emerald-500'}`} />
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                            <Link href={plan.href} className="block">
                                                {plan.featured ? (
                                                    <button className="w-full py-3 rounded-xl bg-black text-white font-bold text-sm hover:bg-black/80 transition-colors duration-200">
                                                        {plan.cta}
                                                    </button>
                                                ) : (
                                                    <button className="w-full py-3 rounded-xl border border-white/10 hover:border-white/25 text-white/65 hover:text-white font-medium text-sm transition-all duration-200">
                                                        {plan.cta}
                                                    </button>
                                                )}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ FAQ ══════════════════════════════════════════════════ */}
            <section id="faq" className="py-28 lg:py-36">
                <div className="container mx-auto px-6 md:px-10 lg:px-16">
                    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-16 max-w-6xl">
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-4 block">FAQ</span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight sticky top-24" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.faq.title}</h2>
                        </div>
                        <div className="faq-list">
                            {[d.faq.q1, d.faq.q2, d.faq.q3, d.faq.q4, d.faq.q5].map((q: any, i: number) => (
                                <div key={i} className="faq-row border-b border-white/[0.07]">
                                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex items-center justify-between py-5 text-left group">
                                        <span className="text-sm font-semibold text-white/85 group-hover:text-white pr-6 transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>{q.question}</span>
                                        <ChevronDown className={`h-4 w-4 text-white/30 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-emerald-400' : ''}`} />
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

            <div className="border-t border-white/[0.06]" />

            {/* ═══════════ CTA ══════════════════════════════════════════════════ */}
            <section className="cta-section py-28 lg:py-40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(16,185,129,0.09),transparent)] pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]" />
                <div className="container mx-auto px-6 md:px-10 lg:px-16 relative">
                    <div className="cta-text max-w-3xl">
                        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] mb-8"
                            style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.045em' }}>
                            {d.cta.title}
                        </h2>
                        <p className="text-white/50 text-lg mb-10 leading-relaxed max-w-xl">{d.cta.subtitle}</p>
                        <Link href={`/${lang}/register`}>
                            <button className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-full text-base transition-colors duration-200 shadow-xl shadow-emerald-500/20">
                                {d.cta.button} <ArrowRight className="h-4 w-4" />
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══════════ CONTACT ══════════════════════════════════════════════ */}
            <section id="contact" className="py-28 lg:py-36 bg-[#030603]">
                <div className="container mx-auto px-6 md:px-10 lg:px-16">
                    <div className="max-w-xl mx-auto text-center mb-12">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-4 block">Contacto</span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.contact.title}</h2>
                        <p className="text-white/50 mt-4 text-base">{d.contact.subtitle}</p>
                    </div>
                    <ContactForm dict={d.contact.form} />
                </div>
            </section>

            {/* ═══════════ FOOTER ═══════════════════════════════════════════════ */}
            <footer className="border-t border-white/[0.06]">
                <div className="container mx-auto px-6 md:px-10 lg:px-16 py-12">
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
                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 mb-1">{label}</span>
                                    {links.map(([href, text]) => (
                                        <Link key={href} href={href} className="text-sm text-white/40 hover:text-white transition-colors duration-200">{text}</Link>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-white/25 text-xs">&copy; 2026 {dict.footer.rights}</p>
                        <LanguageSwitcher variant="dark" />
                    </div>
                </div>
            </footer>
        </div>
    );
}
