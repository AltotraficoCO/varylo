import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check, MessageSquare, Bot, Workflow, Users, BarChart3, Sparkles, ArrowRight, Star, Zap, AlertTriangle, EyeOff, Moon } from 'lucide-react';
import { ContactForm } from './contact-form';
import { getDictionary, Locale } from '@/lib/dictionary';
import { prisma } from '@/lib/prisma';

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

    return (
        <div className="flex flex-col">

            {/* ═══════════════════ HERO — clean white ═══════════════════ */}
            <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
                {/* Subtle emerald glow */}
                <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-100/60 blur-[120px]" />
                <div className="absolute bottom-[20%] left-[15%] w-[400px] h-[400px] rounded-full bg-emerald-50/80 blur-[100px]" />

                <div className="relative z-10 container mx-auto px-4 text-center max-w-4xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm text-emerald-700 font-semibold mb-10">
                        <Zap className="h-3.5 w-3.5" />
                        {d.hero.badge}
                    </div>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-8 text-gray-900">
                        {d.hero.title}
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-12">
                        {d.hero.description}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href={`/${lang}/register`}>
                            <Button size="lg" className="h-14 px-10 text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 w-full sm:w-auto gap-2 font-semibold">
                                {d.hero.ctaPrimary}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="#features">
                            <Button size="lg" variant="outline" className="h-14 px-10 text-base border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto font-medium">
                                {d.hero.ctaSecondary}
                            </Button>
                        </Link>
                    </div>
                    <div className="mt-20 flex flex-col items-center gap-4">
                        <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-medium">{d.hero.socialProof}</p>
                        <div className="flex items-center gap-8 text-gray-400">
                            <span className="text-lg font-bold tracking-tight">TechStore</span>
                            <span className="text-lg font-bold tracking-tight">FastDelivery</span>
                            <span className="hidden sm:block text-lg font-bold tracking-tight">BeautyBox</span>
                            <span className="hidden md:block text-lg font-bold tracking-tight">CloudShop</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ PROBLEMS — light gray ═══════════════════ */}
            <section className="py-24 md:py-32 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900">{d.problems.title}</h2>
                        <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto">{d.problems.subtitle}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { icon: AlertTriangle, ...d.problems.p1 },
                            { icon: EyeOff, ...d.problems.p2 },
                            { icon: Moon, ...d.problems.p3 },
                        ].map((p, i) => (
                            <div key={i} className="group relative rounded-2xl border border-gray-200 bg-white p-8 hover:border-red-300 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300">
                                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
                                    <p.icon className="h-6 w-6 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-900">{p.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{p.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ METRICS — emerald band ═══════════════════ */}
            <section className="py-20 md:py-24 bg-emerald-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="container mx-auto px-4 relative">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{d.solution.title}</h2>
                        <p className="text-emerald-100 mt-4 text-lg max-w-2xl mx-auto">{d.solution.subtitle}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                        {Object.values(d.solution.metrics).map((m: any, i: number) => (
                            <div key={i} className="text-center">
                                <div className="text-5xl sm:text-6xl font-black text-white">
                                    {m.value}
                                </div>
                                <div className="mt-2 h-1 w-8 mx-auto rounded-full bg-white/40" />
                                <p className="text-emerald-100 mt-3 text-sm font-medium">{m.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ FEATURES — white ═══════════════════ */}
            <section id="features" className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-4">Features</span>
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900">{d.features.title}</h2>
                        <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto">{d.features.subtitle}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {[
                            { icon: MessageSquare, ...d.features.omnichannel, isNew: false },
                            { icon: Bot, ...d.features.aiAgents, isNew: true },
                            { icon: Workflow, ...d.features.chatbots, isNew: true },
                            { icon: Users, ...d.features.agents, isNew: false },
                            { icon: BarChart3, ...d.features.analytics, isNew: false },
                            { icon: Sparkles, ...d.features.ai, isNew: false },
                        ].map((f, i) => (
                            <div key={i} className="group relative rounded-2xl border border-gray-200 bg-white p-8 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                {f.isNew && (
                                    <div className="absolute top-5 right-4">
                                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">New</span>
                                    </div>
                                )}
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors">
                                    <f.icon className="h-6 w-6 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-900">{f.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ HOW IT WORKS — light gray ═══════════════════ */}
            <section id="how" className="py-24 md:py-32 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-4">How it works</span>
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900">{d.how.title}</h2>
                        <p className="text-gray-500 mt-4 text-lg">{d.how.subtitle}</p>
                    </div>
                    <div className="max-w-4xl mx-auto relative">
                        {/* Connecting line */}
                        <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5 bg-emerald-200" />
                        <div className="grid md:grid-cols-3 gap-16">
                            {[d.how.step1, d.how.step2, d.how.step3].map((step: any, i: number) => (
                                <div key={i} className="text-center relative">
                                    <div className="w-24 h-24 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8 font-bold text-3xl text-white shadow-lg shadow-emerald-600/20 relative z-10">
                                        {i + 1}
                                    </div>
                                    <h3 className="font-bold text-lg mb-3 text-gray-900">{step.title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ TESTIMONIALS — white ═══════════════════ */}
            <section className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-4">Testimonials</span>
                        <h2 className="text-3xl sm:text-5xl font-bold text-center tracking-tight text-gray-900">{d.testimonials.title}</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[d.testimonials.t1, d.testimonials.t2, d.testimonials.t3].map((t: any, i: number) => (
                            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-lg hover:border-emerald-200 transition-all duration-300">
                                <div className="flex gap-1 mb-6">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                                    ))}
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed mb-8">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                        {t.author.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{t.author}</p>
                                        <p className="text-gray-400 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ PRICING — light gray ═══════════════════ */}
            <section id="pricing" className="py-24 md:py-32 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-4">Pricing</span>
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900">{d.pricing.title}</h2>
                        <p className="text-gray-500 mt-4 text-lg">{d.pricing.subtitle}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
                        {dbPlans.length > 0 ? dbPlans.map((plan) => {
                            const isFeatured = plan.isFeatured;
                            const href = plan.ctaLink || `/${lang}/register?plan=${plan.slug}`;
                            return (
                                <div key={plan.id} className={isFeatured
                                    ? 'rounded-2xl border-2 border-emerald-500 bg-white p-8 relative lg:scale-105 shadow-xl shadow-emerald-500/10'
                                    : 'rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-lg transition-shadow'
                                }>
                                    {isFeatured && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Popular</div>
                                    )}
                                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className={`text-5xl font-black ${isFeatured ? 'text-emerald-600' : 'text-gray-900'}`}>${plan.price}</span>
                                        <span className="text-gray-400">/mes</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-8">{plan.description}</p>
                                    <Link href={href} className="block">
                                        {isFeatured ? (
                                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-semibold">
                                                {plan.ctaText}
                                            </Button>
                                        ) : (
                                            <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
                                                {plan.ctaText}
                                            </Button>
                                        )}
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }) : (
                            /* Fallback: use dictionary data if no DB plans */
                            <>
                                <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-lg transition-shadow">
                                    <h3 className="text-lg font-semibold text-gray-900">{d.pricing.starter.title}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className="text-5xl font-black text-gray-900">$29</span>
                                        <span className="text-gray-400">/mes</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-8">{d.pricing.starter.description}</p>
                                    <Link href={`/${lang}/register?plan=STARTER`} className="block">
                                        <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
                                            {d.pricing.cta}
                                        </Button>
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {d.pricing.starter.features.map((f: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-2xl border-2 border-emerald-500 bg-white p-8 relative lg:scale-105 shadow-xl shadow-emerald-500/10">
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Popular</div>
                                    <h3 className="text-lg font-semibold text-gray-900">{d.pricing.pro.title}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className="text-5xl font-black text-emerald-600">$79</span>
                                        <span className="text-gray-400">/mes</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-8">{d.pricing.pro.description}</p>
                                    <Link href={`/${lang}/register?plan=PRO`} className="block">
                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-semibold">
                                            {d.pricing.cta}
                                        </Button>
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {d.pricing.pro.features.map((f: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-lg transition-shadow">
                                    <h3 className="text-lg font-semibold text-gray-900">{d.pricing.scale.title}</h3>
                                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                                        <span className="text-5xl font-black text-gray-900">$199</span>
                                        <span className="text-gray-400">/mes</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-8">{d.pricing.scale.description}</p>
                                    <Link href="#contact" className="block">
                                        <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
                                            {d.pricing.ctaCustom}
                                        </Button>
                                    </Link>
                                    <ul className="space-y-3 mt-8">
                                        {d.pricing.scale.features.map((f: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
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

            {/* ═══════════════════ FAQ — white ═══════════════════ */}
            <section id="faq" className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-bold text-center tracking-tight text-gray-900">{d.faq.title}</h2>
                    </div>
                    <div className="space-y-4">
                        {[d.faq.q1, d.faq.q2, d.faq.q3, d.faq.q4, d.faq.q5].map((q: any, i: number) => (
                            <div key={i} className="border border-gray-200 rounded-2xl p-6 bg-white hover:border-emerald-300 transition-colors">
                                <h3 className="font-semibold text-gray-900">{q.question}</h3>
                                <p className="text-gray-500 mt-3 text-sm leading-relaxed">{q.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ FINAL CTA — emerald ═══════════════════ */}
            <section className="py-24 md:py-32 bg-emerald-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="container mx-auto px-4 relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-white">
                            {d.cta.title}
                        </h2>
                        <p className="text-emerald-100 text-lg mb-10">{d.cta.subtitle}</p>
                        <Link href={`/${lang}/register`}>
                            <Button size="lg" className="h-14 px-10 text-base bg-white text-emerald-700 hover:bg-gray-100 shadow-lg gap-2 font-semibold">
                                {d.cta.button}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ CONTACT — white ═══════════════════ */}
            <section id="contact" className="py-24 md:py-32 bg-white border-t border-gray-200">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900">{d.contact.title}</h2>
                        <p className="text-gray-500 mt-4 text-lg">{d.contact.subtitle}</p>
                    </div>
                    <ContactForm dict={d.contact.form} />
                </div>
            </section>
        </div>
    );
}
