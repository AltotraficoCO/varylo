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
    Sparkles, ArrowRight, Star, Zap, AlertTriangle, EyeOff,
    Moon, Shield, ChevronDown, ChevronRight,
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
        // ─── HERO ──────────────────────────────────────────────────────────────
        const heroTl = gsap.timeline({ delay: 0.1 });
        heroTl
            .from('.hero-badge', {
                y: -30, opacity: 0, duration: 0.7, ease: 'power3.out',
            })
            .from('.hero-line', {
                yPercent: 120, opacity: 0, duration: 0.9, ease: 'power4.out',
                stagger: 0.12,
            }, '-=0.3')
            .from('.hero-sub', {
                y: 30, opacity: 0, duration: 0.7, ease: 'power3.out',
            }, '-=0.4')
            .from('.hero-cta-wrap', {
                y: 30, opacity: 0, duration: 0.7, ease: 'power3.out',
            }, '-=0.5')
            .from('.hero-logos-wrap', {
                y: 20, opacity: 0, duration: 0.6, ease: 'power2.out',
            }, '-=0.4');

        // Floating orbs
        gsap.to('.orb-1', { x: 40, y: -30, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.orb-2', { x: -30, y: 40, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.5 });
        gsap.to('.orb-3', { x: 20, y: 20, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.8 });

        // Navbar style on scroll
        ScrollTrigger.create({
            start: 'top -60',
            end: 99999,
            toggleClass: { targets: '.main-nav', className: 'nav-solid' },
        });

        // ─── PROBLEMS ──────────────────────────────────────────────────────────
        gsap.from('.prob-card', {
            y: 60, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15,
            scrollTrigger: { trigger: '.prob-grid', start: 'top 80%', once: true },
        });

        // ─── FEATURES ──────────────────────────────────────────────────────────
        gsap.from('.feat-card', {
            y: 70, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
            scrollTrigger: { trigger: '.feat-grid', start: 'top 75%', once: true },
        });

        // ─── METRICS ───────────────────────────────────────────────────────────
        gsap.from('.metric-item', {
            scale: 0.8, opacity: 0, duration: 0.7, ease: 'back.out(1.5)', stagger: 0.12,
            scrollTrigger: { trigger: '.metrics-row', start: 'top 80%', once: true },
        });

        // ─── HOW IT WORKS – PINNED STORYTELLING ───────────────────────────────
        // Each step fades in/out as user scrolls through the pinned section
        const howSteps = gsap.utils.toArray<HTMLElement>('.how-step-panel');
        const howProgress = document.querySelector('.how-progress-track') as HTMLElement;
        const howCounter = document.querySelector('.how-counter-num') as HTMLElement;

        if (howSteps.length > 0) {
            const howTl = gsap.timeline();

            // Step 1 → Step 2
            howTl
                .to('.how-step-panel:nth-child(1)', {
                    opacity: 0, y: -60, duration: 1,
                })
                .from('.how-step-panel:nth-child(2)', {
                    opacity: 0, y: 60, duration: 1,
                }, '<0.1')
            // Step 2 → Step 3
                .to('.how-step-panel:nth-child(2)', {
                    opacity: 0, y: -60, duration: 1,
                })
                .from('.how-step-panel:nth-child(3)', {
                    opacity: 0, y: 60, duration: 1,
                }, '<0.1');

            ScrollTrigger.create({
                trigger: '.how-section',
                start: 'top top',
                end: '+=250%',
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
                animation: howTl,
                onUpdate: (self) => {
                    const step = Math.min(3, Math.floor(self.progress * 3) + 1);
                    if (howCounter) howCounter.textContent = String(step);
                    if (howProgress) {
                        gsap.to(howProgress, {
                            width: `${Math.round(self.progress * 100)}%`,
                            duration: 0.1,
                            ease: 'none',
                        });
                    }
                },
            });
        }

        // ─── TESTIMONIALS ──────────────────────────────────────────────────────
        gsap.from('.test-card', {
            y: 60, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15,
            scrollTrigger: { trigger: '.test-grid', start: 'top 80%', once: true },
        });

        // ─── PRICING ───────────────────────────────────────────────────────────
        gsap.from('.price-card', {
            y: 60, opacity: 0, scale: 0.95, duration: 0.8, ease: 'power3.out', stagger: 0.15,
            scrollTrigger: { trigger: '.price-grid', start: 'top 80%', once: true },
        });

        // ─── FAQ ───────────────────────────────────────────────────────────────
        gsap.from('.faq-item', {
            y: 30, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08,
            scrollTrigger: { trigger: '.faq-list', start: 'top 80%', once: true },
        });

        // ─── SECTION HEADINGS ──────────────────────────────────────────────────
        gsap.utils.toArray('.section-title').forEach((el: any) => {
            gsap.from(el, {
                y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            });
        });

        // ─── CTA ───────────────────────────────────────────────────────────────
        gsap.from('.cta-inner', {
            y: 60, opacity: 0, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: '.cta-section', start: 'top 75%', once: true },
        });

        // ─── CONTACT ───────────────────────────────────────────────────────────
        gsap.from('.contact-inner', {
            y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: '.contact-section', start: 'top 80%', once: true },
        });

        ScrollTrigger.refresh();
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="flex flex-col bg-[#0A0F0D] text-white overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet" />

            <style>{`
                .main-nav { transition: background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease; }
                .nav-solid { background: rgba(10,15,13,0.92) !important; backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
                .hero-clip { overflow: hidden; }
                .marquee-track { display: flex; animation: marquee 24s linear infinite; width: max-content; }
                @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                .feat-card:hover { border-color: rgba(16,185,129,0.35) !important; transform: translateY(-4px); transition: transform 0.3s ease, border-color 0.3s ease; }
                .prob-card:hover { border-color: rgba(239,68,68,0.35) !important; }
                .test-card:hover { border-color: rgba(16,185,129,0.3) !important; }
                .faq-answer { transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease; }
                .price-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
                .price-card:hover { transform: translateY(-6px); }
                .how-step-panel { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
                .how-step-panel:not(:first-child) { opacity: 0; }
            `}</style>

            {/* ═══ NAVBAR ═══════════════════════════════════════════════════════ */}
            <nav className="main-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4">
                <span className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Varylo</span>
                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.features}</Link>
                    <Link href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.pricing}</Link>
                    <Link href="#faq" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.faq}</Link>
                    <Link href="#contact" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.contact}</Link>
                </div>
                <div className="flex items-center gap-3">
                    <LanguageSwitcher variant="dark" />
                    <Link href={`/${lang}/login`} className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden sm:block">
                        {dict.nav.login}
                    </Link>
                    <Link href={`/${lang}/register`}>
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold">
                            {dict.nav.getStarted}
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* ═══ HERO ═════════════════════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col overflow-hidden pt-20">
                {/* Background orbs */}
                <div className="orb-1 absolute top-[8%] right-[12%] w-[520px] h-[520px] rounded-full bg-emerald-500/15 blur-[140px] pointer-events-none" />
                <div className="orb-2 absolute bottom-[20%] left-[5%] w-[400px] h-[400px] rounded-full bg-emerald-700/12 blur-[120px] pointer-events-none" />
                <div className="orb-3 absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-teal-500/8 blur-[100px] pointer-events-none" />

                {/* Dot grid */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                {/* Hero content */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto py-16">
                    <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-2 text-sm text-emerald-400 font-medium mb-10 backdrop-blur-sm">
                        <Zap className="h-3.5 w-3.5" />
                        {d.hero.badge}
                    </div>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-8" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em' }}>
                        {d.hero.title.split(' ').reduce((acc: string[][], word: string, i: number) => {
                            const lineSize = 3;
                            const lineIndex = Math.floor(i / lineSize);
                            if (!acc[lineIndex]) acc[lineIndex] = [];
                            acc[lineIndex].push(word);
                            return acc;
                        }, []).map((lineWords: string[], i: number) => (
                            <span key={i} className="hero-clip block">
                                <span className="hero-line inline-block">{lineWords.join(' ')}</span>
                            </span>
                        ))}
                    </h1>
                    <p className="hero-sub text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                        {d.hero.description}
                    </p>
                    <div className="hero-cta-wrap flex flex-col sm:flex-row justify-center gap-4">
                        <Link href={`/${lang}/register`}>
                            <Button size="lg" className="h-14 px-8 text-base bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl w-full sm:w-auto gap-2 font-semibold shadow-lg shadow-emerald-500/20">
                                {d.hero.ctaPrimary}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="#features">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-base border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20 rounded-xl w-full sm:w-auto font-semibold backdrop-blur-sm">
                                {d.hero.ctaSecondary}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Trust logos */}
                <div className="hero-logos-wrap relative z-10 flex flex-col items-center gap-5 pb-16 px-4">
                    <p className="text-xs text-zinc-600 uppercase tracking-[0.15em] font-medium">{d.hero.socialProof}</p>
                    {logos.length > 0 ? (
                        <div className="flex items-center gap-8 flex-wrap justify-center">
                            {logos.map((logo) => (
                                <img key={logo.id} src={logo.imageUrl} alt={logo.name}
                                    className="h-8 max-w-[120px] object-contain grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-10 text-zinc-700">
                            {['NovaTech', 'RapidGo', 'GlowUp', 'DataFlow', 'Nexus'].map((n) => (
                                <span key={n} className="text-base font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{n}</span>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ═══ PROBLEMS ════════════════════════════════════════════════════ */}
            <section className="py-24 bg-[#0D1410]">
                <div className="container mx-auto px-4">
                    <div className="section-title text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.problems.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">{d.problems.subtitle}</p>
                    </div>
                    <div className="prob-grid grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {problemList.map((p: any, i: number) => {
                            const Icon = PROBLEM_ICONS[i];
                            return (
                                <div key={i} className="prob-card rounded-2xl border border-slate-800/80 bg-[#0A0F0D] p-8 transition-all duration-300 cursor-default">
                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mb-6">
                                        <Icon className="h-5 w-5 text-red-400" />
                                    </div>
                                    <h3 className="text-lg font-extrabold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{p.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{p.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══ FEATURES ═══════════════════════════════════════════════════ */}
            <section id="features" className="py-24 bg-[#0A0F0D]">
                <div className="container mx-auto px-4">
                    <div className="section-title text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 px-4 py-1.5 text-xs text-emerald-400 font-semibold tracking-widest uppercase mb-6">
                            <Sparkles className="h-3.5 w-3.5" />
                            FEATURES
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.features.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">{d.features.subtitle}</p>
                    </div>
                    <div className="feat-grid grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
                        {featureList.map((f: any, i: number) => {
                            const Icon = FEATURE_ICONS[i];
                            return (
                                <div key={i} className="feat-card rounded-2xl border border-slate-800/80 bg-[#0D1410] p-8 cursor-default">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mb-6">
                                        <Icon className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <h3 className="text-[21px] font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{f.title}</h3>
                                    <p className="text-slate-400 text-[15px] leading-relaxed">{f.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══ METRICS ════════════════════════════════════════════════════ */}
            <section className="py-24 bg-emerald-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />
                <div className="container mx-auto px-4 relative">
                    <div className="section-title text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.solution.title}</h2>
                        <p className="text-emerald-100/80 mt-4 text-lg max-w-2xl mx-auto">{d.solution.subtitle}</p>
                    </div>
                    <div className="metrics-row flex flex-wrap justify-center gap-2 max-w-5xl mx-auto">
                        {metrics.map((m: any, i: number) => (
                            <div key={i} className="metric-item flex items-center gap-6">
                                <div className="text-center px-8 py-4">
                                    <div className="text-5xl sm:text-7xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em' }}>
                                        {m.value}
                                    </div>
                                    <p className="text-emerald-100/80 mt-2 text-sm font-medium">{m.label}</p>
                                </div>
                                {i < metrics.length - 1 && (
                                    <div className="hidden md:block w-px h-20 bg-white/15" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS – PINNED SCROLL STORY ═════════════════════════ */}
            <section id="how" className="how-section h-screen bg-[#0A0F0D] relative overflow-hidden">
                {/* Dot grid */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800 z-20">
                    <div className="how-progress-track h-full bg-emerald-500 w-0 transition-none" />
                </div>

                {/* Header */}
                <div className="absolute top-16 left-0 right-0 z-20 text-center pointer-events-none px-4">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-500 mb-3">HOW IT WORKS</span>
                    <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.how.title}</h2>
                </div>

                {/* Step counter */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                    <span className="text-slate-600 text-sm font-mono">
                        <span className="how-counter-num text-emerald-400 font-bold">1</span>
                        <span> / 3</span>
                    </span>
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        ))}
                    </div>
                </div>

                {/* Steps stacked */}
                <div className="relative h-full">
                    {steps.map((step: any, i: number) => (
                        <div key={i} className="how-step-panel px-4">
                            <div className="max-w-2xl mx-auto text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-600 text-3xl font-black text-white mb-8 shadow-2xl shadow-emerald-600/30" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {i + 1}
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-extrabold mb-6 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {step.title}
                                </h3>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-lg mx-auto">
                                    {step.description}
                                </p>
                                {i < steps.length - 1 && (
                                    <div className="mt-12 flex items-center justify-center gap-2 text-emerald-500/60 text-sm">
                                        <span>Scroll para continuar</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ TESTIMONIALS ═══════════════════════════════════════════════ */}
            <section className="py-24 bg-[#0D1410]">
                <div className="container mx-auto px-4">
                    <div className="section-title text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">TESTIMONIALS</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.testimonials.title}</h2>
                    </div>
                    <div className="test-grid grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {testimonials.map((t: any, i: number) => (
                            <div key={i} className="test-card rounded-2xl border border-slate-800/80 bg-[#0A0F0D] p-8 transition-all duration-300 cursor-default">
                                <div className="flex gap-1 mb-6">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                                    ))}
                                </div>
                                <p className="text-white/85 text-sm leading-relaxed mb-8">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {t.author.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{t.author}</p>
                                        <p className="text-slate-500 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ PRICING ════════════════════════════════════════════════════ */}
            <section id="pricing" className="py-24 bg-[#0A0F0D]">
                <div className="container mx-auto px-4">
                    <div className="section-title text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">PRICING</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.pricing.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg">{d.pricing.subtitle}</p>
                    </div>
                    <div className={`price-grid grid gap-6 max-w-5xl mx-auto items-start justify-center ${plans.length === 1 ? 'md:grid-cols-1 max-w-md' : plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3'}`}>
                        {plans.length > 0 ? plans.map((plan) => {
                            const isFeatured = plan.isFeatured;
                            const href = plan.ctaLink || `/${lang}/register?plan=${plan.slug}`;
                            return (
                                <div key={plan.id} className={`price-card rounded-2xl p-8 ${isFeatured
                                    ? 'border-2 border-emerald-500 bg-[#0D1410] relative shadow-2xl shadow-emerald-500/10'
                                    : 'border border-slate-800/80 bg-[#0D1410]'}`}>
                                    {isFeatured && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/30">Popular</div>
                                    )}
                                    <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className={`text-5xl font-black ${isFeatured ? 'text-emerald-400' : 'text-white'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>${plan.price}</span>
                                        <span className="text-slate-500">/mes</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-8">{plan.description}</p>
                                    <Link href={href} className="block">
                                        {isFeatured ? (
                                            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/20">{plan.ctaText}</Button>
                                        ) : (
                                            <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800 rounded-lg font-medium">{plan.ctaText}</Button>
                                        )}
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {plan.features.map((f: string, fi: number) => (
                                            <li key={fi} className="flex items-start gap-2.5 text-sm text-slate-300">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }) : (
                            <>
                                {[
                                    { title: d.pricing.starter.title, price: '$29', desc: d.pricing.starter.description, features: d.pricing.starter.features, featured: false, href: `/${lang}/register?plan=STARTER`, cta: d.pricing.cta },
                                    { title: d.pricing.pro.title, price: '$79', desc: d.pricing.pro.description, features: d.pricing.pro.features, featured: true, href: `/${lang}/register?plan=PRO`, cta: d.pricing.cta },
                                    { title: d.pricing.scale.title, price: '$199', desc: d.pricing.scale.description, features: d.pricing.scale.features, featured: false, href: '#contact', cta: d.pricing.ctaCustom },
                                ].map((plan, i) => (
                                    <div key={i} className={`price-card rounded-2xl p-8 ${plan.featured
                                        ? 'border-2 border-emerald-500 bg-[#0D1410] relative shadow-2xl shadow-emerald-500/10'
                                        : 'border border-slate-800/80 bg-[#0D1410]'}`}>
                                        {plan.featured && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/30">Popular</div>
                                        )}
                                        <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{plan.title}</h3>
                                        <div className="flex items-baseline gap-1 mt-4 mb-2">
                                            <span className={`text-5xl font-black ${plan.featured ? 'text-emerald-400' : 'text-white'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>{plan.price}</span>
                                            <span className="text-slate-500">/mes</span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-8">{plan.desc}</p>
                                        <Link href={plan.href} className="block">
                                            {plan.featured ? (
                                                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/20">{plan.cta}</Button>
                                            ) : (
                                                <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800 rounded-lg font-medium">{plan.cta}</Button>
                                            )}
                                        </Link>
                                        <ul className="space-y-3 mt-8">
                                            {plan.features.map((f: string, fi: number) => (
                                                <li key={fi} className="flex items-start gap-2.5 text-sm text-slate-300">
                                                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══ FAQ ════════════════════════════════════════════════════════ */}
            <section id="faq" className="py-24 bg-[#0D1410]">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="section-title text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.faq.title}</h2>
                    </div>
                    <div className="faq-list space-y-3">
                        {faqs.map((q: any, i: number) => (
                            <div key={i} className="faq-item border border-slate-800/80 rounded-xl bg-[#0A0F0D] overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="font-semibold text-sm pr-4" style={{ fontFamily: 'Outfit, sans-serif' }}>{q.question}</span>
                                    <ChevronDown className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`faq-answer overflow-hidden ${openFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-slate-400 text-sm leading-relaxed px-6 pb-6">{q.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ CTA ════════════════════════════════════════════════════════ */}
            <section className="cta-section py-28 bg-emerald-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-25"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-emerald-400/25 blur-[120px] pointer-events-none" />
                <div className="container mx-auto px-4 relative">
                    <div className="cta-inner max-w-3xl mx-auto text-center">
                        <h2 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-white leading-[0.95]"
                            style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em' }}>
                            {d.cta.title}
                        </h2>
                        <p className="text-emerald-100/80 text-lg mb-10 leading-relaxed">{d.cta.subtitle}</p>
                        <Link href={`/${lang}/register`}>
                            <Button size="lg" className="h-14 px-10 text-base bg-white text-emerald-700 hover:bg-gray-50 shadow-2xl gap-2 font-semibold rounded-xl">
                                {d.cta.button}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ CONTACT ════════════════════════════════════════════════════ */}
            <section id="contact" className="contact-section py-24 bg-[#0A0F0D]">
                <div className="container mx-auto px-4">
                    <div className="contact-inner">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.contact.title}</h2>
                            <p className="text-slate-400 mt-4 text-lg">{d.contact.subtitle}</p>
                        </div>
                        <ContactForm dict={d.contact.form} />
                    </div>
                </div>
            </section>

            {/* ═══ FOOTER ═════════════════════════════════════════════════════ */}
            <footer className="border-t border-slate-800/60 bg-[#0A0F0D]">
                <div className="container mx-auto px-4 py-12">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
                        <div className="max-w-xs">
                            <span className="text-2xl font-black tracking-tight block mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Varylo</span>
                            <p className="text-slate-500 text-sm leading-relaxed">{dict.footer.description}</p>
                        </div>
                        <div className="flex gap-16">
                            <div className="flex flex-col gap-3">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{dict.footer.product}</span>
                                <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.features}</Link>
                                <Link href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.pricing}</Link>
                                <Link href="#faq" className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.faq}</Link>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{dict.footer.company}</span>
                                <Link href="#contact" className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.contact}</Link>
                                <Link href={`/${lang}/terms`} className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.terms}</Link>
                                <Link href={`/${lang}/privacy`} className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.privacy}</Link>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{dict.footer.account}</span>
                                <Link href={`/${lang}/login`} className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.login}</Link>
                                <Link href={`/${lang}/register`} className="text-sm text-slate-400 hover:text-white transition-colors">{dict.footer.createAccount}</Link>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-slate-800/60 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-xs">&copy; 2026 {dict.footer.rights}</p>
                        <LanguageSwitcher variant="dark" />
                    </div>
                </div>
            </footer>
        </div>
    );
}
