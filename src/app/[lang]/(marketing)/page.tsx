import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check, MessageSquare, Bot, Workflow, Users, BarChart3, Sparkles, ArrowRight, Star, Zap, AlertTriangle, EyeOff, Moon, Shield } from 'lucide-react';
import { ContactForm } from './contact-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { prisma } from '@/lib/prisma';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function LandingPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.landing;
    let dbPlans: Awaited<ReturnType<typeof prisma.landingPlan.findMany>> = [];
    try {
        dbPlans = await prisma.landingPlan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    } catch {
        // Table may not exist yet — fall back to dictionary
    }

    let trustedLogos: { id: string; name: string; imageUrl: string }[] = [];
    try {
        trustedLogos = await prisma.trustedLogo.findMany({
            where: { active: true },
            orderBy: { sortOrder: 'asc' }
        });
    } catch {}

    return (
        <div className="flex flex-col bg-[#0A0F0D] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Google Fonts */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet" />

            {/* ═══════════════════ HERO ═══════════════════ */}
            <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#0A0F0D]">
                {/* Emerald glow */}
                <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-[120px] pointer-events-none" />

                {/* Navbar */}
                <nav className="relative z-20 flex items-center justify-between px-12 py-4">
                    <span className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Varylo</span>
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.features}</Link>
                        <Link href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.pricing}</Link>
                        <Link href="#faq" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.faq}</Link>
                        <Link href="#contact" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{dict.nav.contact}</Link>
                    </div>
                    <div className="flex items-center gap-4">
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

                {/* Hero Content */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto py-16">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-[#0D2818] px-4 py-2 text-sm text-emerald-400 font-medium mb-10">
                        <Zap className="h-3.5 w-3.5" />
                        {d.hero.badge}
                    </div>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1] mb-8" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em' }}>
                        {d.hero.title}
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                        {d.hero.description}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href={`/${lang}/register`}>
                            <Button size="lg" className="h-14 px-8 text-base bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl w-full sm:w-auto gap-2 font-semibold">
                                {d.hero.ctaPrimary}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="#features">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-base border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded-xl w-full sm:w-auto font-semibold">
                                {d.hero.ctaSecondary}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Trust logos */}
                <div className="relative z-10 flex flex-col items-center gap-5 pb-16 px-4">
                    <p className="text-xs text-zinc-600 uppercase tracking-[0.15em] font-medium">{d.hero.socialProof}</p>
                    {trustedLogos.length > 0 ? (
                        <div className="flex items-center gap-8 flex-wrap justify-center">
                            {trustedLogos.map((logo) => (
                                <img
                                    key={logo.id}
                                    src={logo.imageUrl}
                                    alt={logo.name}
                                    title={logo.name}
                                    className="h-8 max-w-[120px] object-contain grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-12 text-zinc-700">
                            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>NovaTech</span>
                            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>RapidGo</span>
                            <span className="hidden sm:block text-lg font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>GlowUp</span>
                            <span className="hidden md:block text-lg font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>DataFlow</span>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════════ PROBLEMS ═══════════════════ */}
            <section className="py-20 md:py-24 bg-[#141A17]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.problems.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">{d.problems.subtitle}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { icon: AlertTriangle, ...d.problems.p1 },
                            { icon: EyeOff, ...d.problems.p2 },
                            { icon: Moon, ...d.problems.p3 },
                        ].map((p, i) => (
                            <div key={i} className="rounded-2xl border border-slate-800 bg-[#0A0F0D] p-6 hover:border-emerald-500/30 transition-all duration-300">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6">
                                    <p.icon className="h-6 w-6 text-red-400" />
                                </div>
                                <h3 className="text-lg font-extrabold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{p.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{p.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ METRICS ═══════════════════ */}
            <section className="py-20 md:py-24 bg-emerald-600 relative overflow-hidden">
                <div className="container mx-auto px-4 relative">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.solution.title}</h2>
                        <p className="text-emerald-100 mt-4 text-lg max-w-2xl mx-auto">{d.solution.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap justify-between max-w-5xl mx-auto">
                        {Object.values(d.solution.metrics).map((m: any, i: number) => (
                            <div key={i} className="flex items-center gap-8">
                                <div className="text-center px-4 py-2">
                                    <div className="text-5xl sm:text-7xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em' }}>
                                        {m.value}
                                    </div>
                                    <p className="text-emerald-100 mt-2 text-sm">{m.label}</p>
                                </div>
                                {i < Object.values(d.solution.metrics).length - 1 && (
                                    <div className="hidden md:block w-px h-20 bg-white/20" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ FEATURES ═══════════════════ */}
            <section id="features" className="py-20 md:py-24 bg-[#0A0F0D]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#0D2818] px-4 py-1.5 text-xs text-emerald-400 font-semibold tracking-widest uppercase mb-6">
                            <Sparkles className="h-3.5 w-3.5" />
                            FEATURES
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.features.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">{d.features.subtitle}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {[
                            { icon: MessageSquare, ...d.features.omnichannel },
                            { icon: Bot, ...d.features.aiAgents },
                            { icon: Workflow, ...d.features.chatbots },
                            { icon: Users, ...d.features.agents },
                            { icon: BarChart3, ...d.features.analytics },
                            { icon: Shield, ...d.features.ai },
                        ].map((f, i) => (
                            <div key={i} className="rounded-2xl border border-slate-800 bg-[#141A17] p-8 hover:border-emerald-500/30 transition-all duration-300">
                                <div className="w-12 h-12 rounded-xl bg-[#0D2818] flex items-center justify-center mb-6">
                                    <f.icon className="h-6 w-6 text-emerald-400" />
                                </div>
                                <h3 className="text-[22px] font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{f.title}</h3>
                                <p className="text-slate-400 text-[15px] leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
            <section id="how" className="py-20 md:py-24 bg-[#141A17]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">HOW IT WORKS</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.how.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg">{d.how.subtitle}</p>
                    </div>
                    <div className="max-w-5xl mx-auto relative">
                        <div className="grid md:grid-cols-3 gap-16">
                            {[d.how.step1, d.how.step2, d.how.step3].map((step: any, i: number) => (
                                <div key={i} className="text-center relative flex flex-col items-center">
                                    <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mb-8 font-bold text-3xl text-white shadow-lg shadow-emerald-600/20 relative z-10" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        {i + 1}
                                    </div>
                                    <h3 className="font-bold text-lg mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{step.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed max-w-[260px]">{step.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
            <section className="py-20 md:py-24 bg-[#0A0F0D]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">TESTIMONIALS</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.testimonials.title}</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[d.testimonials.t1, d.testimonials.t2, d.testimonials.t3].map((t: any, i: number) => (
                            <div key={i} className="rounded-2xl border border-slate-800 bg-[#141A17] p-8 hover:border-emerald-500/30 transition-all duration-300">
                                <div className="flex gap-1 mb-6">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                                    ))}
                                </div>
                                <p className="text-white/90 text-sm leading-relaxed mb-8">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
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

            {/* ═══════════════════ PRICING ═══════════════════ */}
            <section id="pricing" className="py-20 md:py-24 bg-[#141A17]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">PRICING</span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.pricing.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg">{d.pricing.subtitle}</p>
                    </div>
                    <div className={`grid gap-6 max-w-5xl mx-auto items-start justify-center ${dbPlans.length === 1 ? 'md:grid-cols-1 max-w-md' : dbPlans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3'}`}>
                        {dbPlans.length > 0 ? dbPlans.map((plan) => {
                            const isFeatured = plan.isFeatured;
                            const href = plan.ctaLink || `/${lang}/register?plan=${plan.slug}`;
                            return (
                                <div key={plan.id} className={`rounded-2xl p-8 ${
                                    isFeatured
                                        ? 'border-2 border-emerald-500 bg-[#0A0F0D] relative shadow-xl shadow-emerald-500/10'
                                        : 'border border-slate-800 bg-[#0A0F0D]'
                                }`}>
                                    {isFeatured && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Popular</div>
                                    )}
                                    <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className={`text-5xl font-black ${isFeatured ? 'text-emerald-400' : 'text-white'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>${plan.price}</span>
                                        <span className="text-slate-500">/mes</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-8">{plan.description}</p>
                                    <Link href={href} className="block">
                                        {isFeatured ? (
                                            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold">
                                                {plan.ctaText}
                                            </Button>
                                        ) : (
                                            <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800 rounded-lg font-medium">
                                                {plan.ctaText}
                                            </Button>
                                        )}
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }) : (
                            <>
                                <div className="rounded-2xl border border-slate-800 bg-[#0A0F0D] p-8">
                                    <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{d.pricing.starter.title}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className="text-5xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>$29</span>
                                        <span className="text-slate-500">/mes</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-8">{d.pricing.starter.description}</p>
                                    <Link href={`/${lang}/register?plan=STARTER`} className="block">
                                        <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800 rounded-lg font-medium">
                                            {d.pricing.cta}
                                        </Button>
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {d.pricing.starter.features.map((f: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-2xl border-2 border-emerald-500 bg-[#0A0F0D] p-8 relative shadow-xl shadow-emerald-500/10">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Popular</div>
                                    <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{d.pricing.pro.title}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className="text-5xl font-black text-emerald-400" style={{ fontFamily: 'Outfit, sans-serif' }}>$79</span>
                                        <span className="text-slate-500">/mes</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-8">{d.pricing.pro.description}</p>
                                    <Link href={`/${lang}/register?plan=PRO`} className="block">
                                        <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold">
                                            {d.pricing.cta}
                                        </Button>
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {d.pricing.pro.features.map((f: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-[#0A0F0D] p-8">
                                    <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{d.pricing.scale.title}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className="text-5xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>$199</span>
                                        <span className="text-slate-500">/mes</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-8">{d.pricing.scale.description}</p>
                                    <Link href="#contact" className="block">
                                        <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800 rounded-lg font-medium">
                                            {d.pricing.ctaCustom}
                                        </Button>
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {d.pricing.scale.features.map((f: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ FAQ ═══════════════════ */}
            <section id="faq" className="py-20 md:py-24 bg-[#0A0F0D]">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.faq.title}</h2>
                    </div>
                    <div className="space-y-3">
                        {[d.faq.q1, d.faq.q2, d.faq.q3, d.faq.q4, d.faq.q5].map((q: any, i: number) => (
                            <div key={i} className="border border-slate-800 rounded-xl bg-[#141A17] p-6 hover:border-emerald-500/30 transition-colors">
                                <h3 className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>{q.question}</h3>
                                <p className="text-slate-400 mt-3 text-sm leading-relaxed">{q.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ FINAL CTA ═══════════════════ */}
            <section className="py-20 md:py-24 bg-emerald-600 relative overflow-hidden">
                {/* Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-emerald-400/30 blur-[120px] pointer-events-none" />
                <div className="container mx-auto px-4 relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-white leading-[0.95]" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.04em' }}>
                            {d.cta.title}
                        </h2>
                        <p className="text-emerald-100 text-lg mb-10 leading-relaxed">{d.cta.subtitle}</p>
                        <Link href={`/${lang}/register`}>
                            <Button size="lg" className="h-14 px-10 text-base bg-white text-emerald-700 hover:bg-gray-100 shadow-lg gap-2 font-semibold rounded-lg">
                                {d.cta.button}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ CONTACT ═══════════════════ */}
            <section id="contact" className="py-20 md:py-24 bg-[#0A0F0D]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>{d.contact.title}</h2>
                        <p className="text-slate-400 mt-4 text-lg">{d.contact.subtitle}</p>
                    </div>
                    <ContactForm dict={d.contact.form} />
                </div>
            </section>

            {/* ═══════════════════ FOOTER ═══════════════════ */}
            <footer className="border-t border-slate-800 bg-[#0A0F0D]">
                <div className="container mx-auto px-4 py-12">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
                        <div className="max-w-xs">
                            <span className="text-2xl font-black tracking-tight block mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Varylo</span>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                {dict.footer.description}
                            </p>
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
                    <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-xs">&copy; 2026 {dict.footer.rights}</p>
                        <LanguageSwitcher variant="dark" />
                    </div>
                </div>
            </footer>
        </div>
    );
}
