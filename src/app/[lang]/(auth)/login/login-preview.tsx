'use client';

import { useState, useEffect, useRef } from 'react';

type Msg = { id: number; role: 'bot' | 'user'; text: string };
type Opt = { label: string; next: string };
type Step = { text: string; opts: Opt[] };

const FLOW: Record<string, Step> = {
    start: {
        text: '¡Hola! Soy Aria 👋 la asistente IA de Varylo. ¿En qué puedo ayudarte hoy?',
        opts: [
            { label: 'Quiero conocer los planes',       next: 'plans'    },
            { label: '¿Cómo funciona el chatbot?',      next: 'chatbot'  },
            { label: 'Necesito integrar WhatsApp',      next: 'whatsapp' },
        ],
    },
    plans: {
        text: 'Varylo tiene un plan todo incluido: agentes ilimitados, chatbot con IA, WhatsApp + Instagram + Web Chat y reportes avanzados. ¿Te cuento más?',
        opts: [
            { label: 'Sí, ¿qué incluye exactamente?',   next: 'pro'    },
            { label: '¿Hay período de prueba gratis?',  next: 'trial'  },
        ],
    },
    chatbot: {
        text: 'Nuestro chatbot usa flujos drag & drop, ¡sin código! Crea menús, recolecta datos y escala a un agente humano cuando sea necesario.',
        opts: [
            { label: '¿También tiene IA generativa?',   next: 'ai'       },
            { label: '¿Funciona en WhatsApp?',          next: 'whatsapp' },
        ],
    },
    whatsapp: {
        text: '¡Sí! La integración con WhatsApp Business API toma menos de 10 minutos. Conectas tu número y empiezas a recibir mensajes desde Varylo al instante.',
        opts: [
            { label: '¿Y también con Instagram?',       next: 'instagram' },
            { label: '¡Quiero empezar ahora!',          next: 'cta'       },
        ],
    },
    pro: {
        text: 'Incluye agentes ilimitados, chatbot drag & drop, agente IA generativa, WhatsApp + Instagram + Web Chat, reportes avanzados y soporte prioritario 24/7.',
        opts: [
            { label: '¿Cuánto cuesta?',                 next: 'pricing' },
            { label: '¡Quiero empezar ahora!',          next: 'cta'     },
        ],
    },
    pricing: {
        text: 'Tenemos un plan mensual con precio accesible. Con la prueba gratuita de 14 días puedes ver todo el valor antes de decidir. Sin tarjeta de crédito. 🎉',
        opts: [
            { label: '¡Perfecto, quiero probarlo!',     next: 'cta' },
        ],
    },
    trial: {
        text: '¡Claro! 14 días gratis para que explores todo. Sin tarjeta de crédito, sin compromisos. Cancelas cuando quieras.',
        opts: [
            { label: '¡Genial, quiero empezar!',        next: 'cta' },
        ],
    },
    ai: {
        text: 'El agente IA de Varylo usa modelos LLM para responder preguntas complejas, agendar citas en Google Calendar y ejecutar acciones automáticas.',
        opts: [
            { label: '¡Eso es exactamente lo que necesito!', next: 'cta'   },
            { label: 'Ver los planes disponibles',           next: 'plans' },
        ],
    },
    instagram: {
        text: '¡Exacto! Varylo centraliza WhatsApp, Instagram DMs y Web Chat en un solo inbox. Tus agentes responden todo desde un lugar, sin cambiar de app. 🚀',
        opts: [
            { label: '¡Quiero probarlo gratis!',        next: 'cta' },
        ],
    },
    cta: {
        text: '¡Perfecto! Crea tu cuenta gratis y empieza en minutos. Nuestro equipo está listo para ayudarte a configurar todo. 🎉',
        opts: [
            { label: 'Reiniciar conversación',          next: 'reset' },
        ],
    },
};

const BotIcon = ({ size = 11 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" fill="#10B981" fillOpacity=".9" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".7" />
    </svg>
);

export function LoginPreview() {
    const [msgs, setMsgs]     = useState<Msg[]>([]);
    const [opts, setOpts]     = useState<Opt[]>([]);
    const [typing, setTyping] = useState(true);   // show dots immediately on mount
    const uid    = useRef(0);
    const endRef = useRef<HTMLDivElement>(null);

    function addMsg(role: Msg['role'], text: string) {
        uid.current += 1;
        setMsgs(prev => [...prev, { id: uid.current, role, text }]);
    }

    function runStep(key: string) {
        if (key === 'reset') {
            setMsgs([]);
            setOpts([]);
            setTimeout(() => runStep('start'), 700);
            return;
        }
        const step = FLOW[key];
        if (!step) return;
        setOpts([]);
        setTyping(true);
        const delay = Math.min(900 + step.text.length * 10, 2000);
        setTimeout(() => {
            setTyping(false);
            addMsg('bot', step.text);
            setTimeout(() => setOpts(step.opts), 380);
        }, delay);
    }

    function pick(opt: Opt) {
        setOpts([]);
        addMsg('user', opt.label);
        setTimeout(() => runStep(opt.next), 500);
    }

    useEffect(() => {
        // typing=true is set as default so dots are visible immediately;
        // runStep will overwrite it after the delay
        const t = setTimeout(() => runStep('start'), 300);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs, typing, opts]);

    return (
        <>
            <style>{`
                @keyframes msgIn  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes optsIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes blink  { 0%,100% { opacity: .15; } 50% { opacity: .8; } }
                .msg-in  { animation: msgIn  .28s ease forwards; }
                .opts-in { animation: optsIn .22s ease forwards; }
                .dot-1   { animation: blink 1.2s infinite 0s;   }
                .dot-2   { animation: blink 1.2s infinite .2s;  }
                .dot-3   { animation: blink 1.2s infinite .4s;  }
                .chat-scroll::-webkit-scrollbar { display: none; }
                .chat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="flex flex-col h-full">

                {/* ── Header ── */}
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.07]">
                    <div className="relative shrink-0">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-700/15 flex items-center justify-center border border-emerald-500/25">
                            <BotIcon size={16} />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0C0F0E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/85">Aria</p>
                        <p className="text-[11px] text-white/30">Asistente IA · Varylo</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        <span className="text-[11px] text-emerald-500/60 font-medium">en línea</span>
                    </div>
                </div>

                {/* Intro chips — always visible, give context before first message */}
                {msgs.length === 0 && (
                    <div className="mb-5 flex flex-wrap gap-2">
                        {['Planes y precios', 'Chatbot IA', 'WhatsApp', 'Instagram'].map((tag) => (
                            <span
                                key={tag}
                                className="text-[11px] px-2.5 py-1 rounded-full border border-white/[0.08] text-white/25"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Messages ── */}
                <div className="flex-1 overflow-y-auto chat-scroll space-y-3 min-h-0">
                    {msgs.map((m) => (
                        <div key={m.id} className={`msg-in flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {m.role === 'bot' && (
                                <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                                    <BotIcon size={11} />
                                </div>
                            )}
                            <div
                                className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                                    m.role === 'bot'
                                        ? 'bg-white/[0.06] text-white/65 rounded-2xl rounded-tl-sm border border-white/[0.06]'
                                        : 'bg-emerald-500/[0.13] text-emerald-300/85 rounded-2xl rounded-tr-sm border border-emerald-500/20'
                                }`}
                            >
                                {m.text}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {typing && (
                        <div className="msg-in flex gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                <BotIcon size={11} />
                            </div>
                            <div className="bg-white/[0.06] border border-white/[0.06] px-4 py-3.5 rounded-2xl rounded-tl-sm">
                                <div className="flex items-center gap-1.5">
                                    <span className="dot-1 w-1.5 h-1.5 rounded-full bg-white/30 inline-block" />
                                    <span className="dot-2 w-1.5 h-1.5 rounded-full bg-white/30 inline-block" />
                                    <span className="dot-3 w-1.5 h-1.5 rounded-full bg-white/30 inline-block" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={endRef} />
                </div>

                {/* ── Option buttons ── */}
                {opts.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-[11px] text-white/20 mb-2">Selecciona una opción</p>
                        {opts.map((o, i) => (
                            <button
                                key={i}
                                onClick={() => pick(o)}
                                className="opts-in w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] hover:border-emerald-500/35 text-[13px] text-white/50 hover:text-white/80 transition-all duration-150"
                                style={{ animationDelay: `${i * 70}ms`, opacity: 0 }}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
