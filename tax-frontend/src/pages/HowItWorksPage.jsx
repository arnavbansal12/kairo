
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    Building2, Zap, Rocket, ArrowRight,
    CheckCircle2, Sparkles, Brain, FileCheck,
    Upload, Clock, Shield, BarChart3,
    ChevronRight, Play, Eye,
} from "lucide-react";

function useReveal(threshold = 0.15) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, visible };
}

const steps = [
    {
        step: "01", icon: Building2, color: "#8B5CF6",
        title: "Add Your GSTIN",
        subtitle: "30 seconds to connect",
        desc: "Enter your GSTIN and we auto-fetch everything — company name, registration type, filing frequency, state, and compliance status. No manual data entry.",
        details: [
            { icon: Shield, text: "Auto-verified with GST portal" },
            { icon: CheckCircle2, text: "Business details pre-populated" },
            { icon: Clock, text: "30-second setup" },
        ],
        visual: {
            title: "GSTIN Connected",
            gstin: "27AADCS0543H1ZN",
            company: "TechVista Solutions Pvt. Ltd.",
            status: "Active",
        },
    },
    {
        step: "02", icon: Upload, color: "#06B6D4",
        title: "Import Your Data",
        subtitle: "Multiple import options",
        desc: "Upload invoices via CSV/Excel, connect TallyPrime for automatic sync, or let our AI extract data from PDF invoices and email attachments. Zero manual effort.",
        details: [
            { icon: FileCheck, text: "CSV, Excel, PDF support" },
            { icon: Brain, text: "AI-powered PDF extraction" },
            { icon: Zap, text: "TallyPrime live sync" },
        ],
        visual: {
            title: "Data Imported",
            invoices: "2,847",
            source: "TallyPrime Sync",
            status: "Synced",
        },
    },
    {
        step: "03", icon: Rocket, color: "#10B981",
        title: "Automate Everything",
        subtitle: "AI takes over from here",
        desc: "ComplianceAI handles reconciliation, filing, risk monitoring, and reports automatically. Get alerts for deadlines, anomalies, and optimization opportunities. Focus on your business.",
        details: [
            { icon: Brain, text: "AI reconciliation & matching" },
            { icon: BarChart3, text: "Auto-generated reports" },
            { icon: Shield, text: "24/7 compliance monitoring" },
        ],
        visual: {
            title: "Compliance Score",
            score: "92%",
            saved: "₹4.5L",
            status: "Automated",
        },
    },
];

export default function HowItWorksPage() {
    const hero = useReveal(0.1);
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setActiveStep(s => (s + 1) % 3), 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-[#0b0b0f] text-white min-h-screen font-sans selection:bg-purple-500/30 selection:text-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org", "@type": "HowTo",
                    name: "How to use ComplianceAI for GST Compliance",
                    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.desc })),
                })
            }} />

            {/* Hero */}
            <section className="relative pt-32 pb-12 overflow-hidden">
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(16,185,129,0.06), transparent 60%)" }} />
                <div ref={hero.ref} className={`max-w-5xl mx-auto px-6 text-center relative z-10 ${hero.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">How It Works</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tight mb-6 text-white">
                        Three steps to <span className="landing-gradient-text">zero stress</span>
                    </h1>
                    <p className="text-sm sm:text-lg text-white/40 max-w-2xl mx-auto">Get started in under 2 minutes. No complex setup. No credit card. No learning curve.</p>
                </div>
            </section>

            {/* Interactive Step Selector */}
            <section className="py-8">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4">
                        {steps.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveStep(i)}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-500 cursor-pointer ${activeStep === i ? "text-white" : "text-white/30 hover:text-white/60"}`}
                                style={{
                                    background: activeStep === i ? `${s.color}12` : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${activeStep === i ? `${s.color}30` : "rgba(255,255,255,0.05)"}`,
                                    boxShadow: activeStep === i ? `0 0 20px ${s.color}10` : "none",
                                }}
                            >
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: activeStep === i ? s.color : "rgba(255,255,255,0.1)" }}>{s.step}</span>
                                <span className="hidden md:inline">{s.title}</span>
                            </button>
                        ))}
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full overflow-hidden mx-auto max-w-md" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((activeStep + 1) / 3) * 100}%`, background: `linear-gradient(90deg, #8B5CF6, ${steps[activeStep].color})` }} />
                    </div>
                </div>
            </section>

            {/* Step Details */}
            {steps.map((step, i) => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1);
                return (
                    <section
                        key={i}
                        ref={reveal.ref}
                        className={`py-20 relative ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}
                        id={`step-${i + 1}`}
                    >
                        <div className="max-w-6xl mx-auto px-6">
                            <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${i % 2 !== 0 ? "lg:[direction:rtl]" : ""}`}>
                                <div className={i % 2 !== 0 ? "lg:[direction:ltr]" : ""}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative landing-glow-ring" style={{ background: `${step.color}12`, border: `1px solid ${step.color}20` }}>
                                            <step.icon className="w-7 h-7" style={{ color: step.color }} />
                                            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: step.color, boxShadow: `0 0 15px ${step.color}40` }}>{step.step}</div>
                                        </div>
                                        <div>
                                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white">{step.title}</h2>
                                            <p className="text-xs text-white/30">{step.subtitle}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm sm:text-base text-white/40 leading-relaxed mb-8">{step.desc}</p>
                                    <div className="space-y-3">
                                        {step.details.map((d, j) => (
                                            <div key={j} className="flex items-center gap-3 landing-stagger-item" style={{ animationDelay: `${j * 0.15}s` }}>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${step.color}12` }}>
                                                    <d.icon className="w-4 h-4" style={{ color: step.color }} />
                                                </div>
                                                <span className="text-sm text-white/50">{d.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Visual Card */}
                                <div className={i % 2 !== 0 ? "lg:[direction:ltr]" : ""}>
                                    <div className="rounded-2xl p-8 landing-card-3d relative overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: `radial-gradient(circle, ${step.color}08, transparent)` }} />
                                        <div className="landing-card-3d-inner">
                                            <div className="flex items-center gap-2 mb-6">
                                                <CheckCircle2 className="w-5 h-5" style={{ color: step.color }} />
                                                <span className="text-sm font-bold" style={{ color: step.color }}>{step.visual.title}</span>
                                            </div>
                                            {step.visual.gstin && (
                                                <div className="space-y-4">
                                                    <div className="p-4 rounded-xl" style={{ background: `${step.color}05`, border: `1px solid ${step.color}10` }}>
                                                        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">GSTIN</p>
                                                        <p className="text-sm font-mono font-bold text-white/80">{step.visual.gstin}</p>
                                                    </div>
                                                    <div className="p-4 rounded-xl" style={{ background: `${step.color}05`, border: `1px solid ${step.color}10` }}>
                                                        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Company</p>
                                                        <p className="text-sm font-bold text-white/80">{step.visual.company}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: step.color }} /><span className="text-xs font-semibold" style={{ color: step.color }}>{step.visual.status}</span></div>
                                                </div>
                                            )}
                                            {step.visual.invoices && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: `${step.color}05`, border: `1px solid ${step.color}10` }}>
                                                        <div><p className="text-[10px] text-white/25 uppercase tracking-wider">Invoices</p><p className="text-2xl font-black text-white/80">{step.visual.invoices}</p></div>
                                                        <div className="text-right"><p className="text-[10px] text-white/25 uppercase tracking-wider">Source</p><p className="text-sm font-bold text-white/80">{step.visual.source}</p></div>
                                                    </div>
                                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: `${step.color}10` }}><div className="h-full rounded-full landing-progress-fill" style={{ background: step.color }} /></div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: step.color }} /><span className="text-xs font-semibold" style={{ color: step.color }}>{step.visual.status}</span></div>
                                                </div>
                                            )}
                                            {step.visual.score && (
                                                <div className="space-y-4 text-center">
                                                    <div className="text-4xl sm:text-6xl font-black" style={{ color: step.color }}>{step.visual.score}</div>
                                                    <div className="flex justify-center gap-4">
                                                        <div className="p-3 rounded-xl" style={{ background: `${step.color}05`, border: `1px solid ${step.color}10` }}>
                                                            <p className="text-[10px] text-white/25 uppercase tracking-wider">Saved</p>
                                                            <p className="text-lg font-black text-white/80">{step.visual.saved}</p>
                                                        </div>
                                                        <div className="p-3 rounded-xl" style={{ background: `${step.color}05`, border: `1px solid ${step.color}10` }}>
                                                            <p className="text-[10px] text-white/25 uppercase tracking-wider">Status</p>
                                                            <p className="text-lg font-black" style={{ color: step.color }}>{step.visual.status}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Connecting arrow */}
                        {i < 2 && (
                            <div className="flex justify-center py-8">
                                <div className="w-px h-16 relative" style={{ background: `linear-gradient(180deg, ${step.color}30, ${steps[i + 1].color}30)` }}>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                                        <ChevronRight className="w-4 h-4 rotate-90 text-white/20" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                );
            })}

            {/* CTA */}
            {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1);
                return (
                    <section ref={reveal.ref} className={`py-24 relative overflow-hidden ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))" }} />
                        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-6 text-white">Ready to get started in <span className="landing-gradient-text">2 minutes</span>?</h2>
                            <p className="text-lg text-white/35 mb-10">Join 2,800+ businesses already on autopilot.</p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link to="/dashboard" className="landing-cta-btn-hero px-10 py-4 rounded-2xl text-base font-bold text-white relative overflow-hidden group">
                                    <span className="relative z-10 flex items-center gap-2">Start Free Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                                </Link>
                                <Link to="/pricing" className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-medium text-white/50 hover:text-white transition-all hover:bg-white/5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                                    View Pricing <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    </section>
                );
            })()}
        </div>
    );
}
