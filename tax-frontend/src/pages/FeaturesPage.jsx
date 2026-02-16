
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    Shield, FileCheck, Brain, Zap, BarChart3, ArrowRight,
    CheckCircle2, Sparkles, AlertTriangle, IndianRupee,
    FileText, RefreshCw, TrendingUp, Eye, Lock, Globe,
    Layers, Database, Download, Bell, Scale, LineChart,
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

const features = [
    {
        icon: Shield, color: "#8B5CF6", tag: "Core",
        title: "GSTIN Validation & Enrichment",
        desc: "Instantly validate any GSTIN against the official GST portal. Get comprehensive business details including trade name, registration status, filing frequency, and compliance rating.",
        capabilities: ["Real-time API validation", "Bulk GSTIN verification", "Status change alerts", "Compliance score tracking"],
        stat: "50K+", statLabel: "Validations / month",
    },
    {
        icon: FileCheck, color: "#10B981", tag: "Filing",
        title: "Intelligent GST Filing",
        desc: "AI auto-fills GSTR-1, 3B, and 9 with data from your invoices. Built-in validation catches errors before submission. One-click filing with OTP verification.",
        capabilities: ["Auto-populated forms", "Pre-submission validation", "Deadline reminders", "Filing history & audit trail"],
        stat: "99.9%", statLabel: "Filing accuracy",
    },
    {
        icon: Brain, color: "#06B6D4", tag: "AI",
        title: "AI-Powered Reconciliation",
        desc: "Our proprietary AI engine matches your purchase records with GSTR-2B data using intelligent fuzzy matching. Identifies mismatches, missing invoices, and ITC opportunities automatically.",
        capabilities: ["Fuzzy invoice matching", "Mismatch categorization", "Auto-correction suggestions", "ITC impact analysis"],
        stat: "99.7%", statLabel: "Matching accuracy",
    },
    {
        icon: BarChart3, color: "#F59E0B", tag: "Reports",
        title: "Auditor-Grade Reports",
        desc: "Generate comprehensive compliance reports with one click. ITC computation sheets, liability summaries, filing status reports, and reconciliation statements — all export-ready.",
        capabilities: ["PDF / Excel export", "Custom date ranges", "Comparative analysis", "Auditor-ready formatting"],
        stat: "12+", statLabel: "Report templates",
    },
    {
        icon: AlertTriangle, color: "#EF4444", tag: "Alerts",
        title: "Real-Time Risk Monitoring",
        desc: "24/7 compliance risk scoring with automated alerts. Get notified about upcoming deadlines, penalty risks, supplier compliance changes, and regulatory updates.",
        capabilities: ["Real-time risk score", "Multi-channel alerts", "Penalty calculator", "Regulatory updates"],
        stat: "₹0", statLabel: "Penalties for users",
    },
    {
        icon: IndianRupee, color: "#22C55E", tag: "ITC",
        title: "ITC Optimization Engine",
        desc: "Maximize your Input Tax Credit automatically. Our engine identifies unclaimed ITC, tracks reversals, monitors eligibility criteria, and suggests optimization strategies.",
        capabilities: ["Unclaimed ITC detection", "Reversal tracking", "Eligibility monitoring", "Savings recommendations"],
        stat: "₹4.5L", statLabel: "Avg. savings / year",
    },
];

export default function FeaturesPage() {
    const hero = useReveal(0.1);

    return (
        <div className="bg-[#0b0b0f] text-white min-h-screen font-sans selection:bg-purple-500/30 selection:text-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org", "@type": "SoftwareApplication",
                    name: "ComplianceAI", applicationCategory: "FinanceApplication",
                    featureList: features.map(f => f.title).join(", "),
                })
            }} />

            {/* Hero */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(6,182,212,0.06), transparent 60%)" }} />
                <div ref={hero.ref} className={`max-w-5xl mx-auto px-6 text-center relative z-10 ${hero.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.15)" }}>
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-cyan-400">Features</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tight mb-6 text-white">
                        Six modules. <span className="landing-gradient-text">One platform.</span>
                    </h1>
                    <p className="text-sm sm:text-lg text-white/40 max-w-2xl mx-auto mb-10">Every feature is purpose-built for Indian GST law. Not retrofitted, not generic — designed from the ground up for CGST, SGST, IGST, and ITC.</p>
                </div>
            </section>

            {/* Feature Deep Dives */}
            {features.map((feature, i) => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1);
                const isEven = i % 2 === 0;
                return (
                    <section
                        key={i}
                        ref={reveal.ref}
                        className={`py-20 relative ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}
                        style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                    >
                        {i % 2 === 0 && <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at ${isEven ? "left" : "right"}, ${feature.color}06, transparent 50%)` }} />}
                        <div className="max-w-6xl mx-auto px-6">
                            <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${!isEven ? "lg:[direction:rtl]" : ""}`}>
                                <div className={!isEven ? "lg:[direction:ltr]" : ""}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center landing-card-3d" style={{ background: `${feature.color}12`, border: `1px solid ${feature.color}20` }}>
                                            <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                                        </div>
                                        <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest" style={{ background: `${feature.color}10`, color: feature.color, border: `1px solid ${feature.color}20` }}>{feature.tag}</span>
                                    </div>
                                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight mb-4 text-white">{feature.title}</h2>
                                    <p className="text-sm sm:text-base text-white/40 leading-relaxed mb-8">{feature.desc}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                        {feature.capabilities.map((cap, j) => (
                                            <div key={j} className="flex items-center gap-2 landing-stagger-item" style={{ animationDelay: `${j * 0.1}s` }}>
                                                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: feature.color }} />
                                                <span className="text-sm text-white/50">{cap}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: feature.color }}>
                                        Get started with {feature.tag} <ArrowRight className="w-4 h-4 landing-arrow-bounce" />
                                    </Link>
                                </div>

                                {/* Stat Card + Visual */}
                                <div className={`relative ${!isEven ? "lg:[direction:ltr]" : ""}`}>
                                    <div className="rounded-2xl p-8 landing-card-3d" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                        <div className="landing-card-3d-inner">
                                            <div className="text-center mb-6">
                                                <div className="text-3xl sm:text-5xl font-black mb-1" style={{ color: feature.color }}>{feature.stat}</div>
                                                <p className="text-xs text-white/30">{feature.statLabel}</p>
                                            </div>
                                            <div className="h-px mb-6" style={{ background: `linear-gradient(90deg, transparent, ${feature.color}30, transparent)` }} />
                                            <div className="grid grid-cols-2 gap-4">
                                                {feature.capabilities.map((cap, j) => (
                                                    <div key={j} className="p-3 rounded-xl text-center" style={{ background: `${feature.color}05`, border: `1px solid ${feature.color}10` }}>
                                                        <p className="text-xs text-white/40">{cap}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Floating accent */}
                                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full landing-glow-pulse" style={{ background: `${feature.color}08`, filter: "blur(30px)" }} />
                                </div>
                            </div>
                        </div>
                    </section>
                );
            })}

            {/* Integration Section */}
            {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1); return (
                    <section ref={reveal.ref} className={`py-24 relative ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                        <div className="max-w-5xl mx-auto px-6 text-center">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-4 text-white">Works with your <span className="landing-gradient-text">existing tools</span></h2>
                            <p className="text-base text-white/35 max-w-xl mx-auto mb-12">Seamless integrations with the tools you already use.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { name: "TallyPrime", icon: Database, color: "#22C55E" },
                                    { name: "Excel / CSV", icon: Download, color: "#10B981" },
                                    { name: "GST Portal", icon: Globe, color: "#8B5CF6" },
                                    { name: "Email Alerts", icon: Bell, color: "#F59E0B" },
                                ].map((tool, i) => (
                                    <div key={i} className="p-4 sm:p-6 rounded-2xl text-center landing-feature-card group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-all duration-500 group-hover:scale-110" style={{ background: `${tool.color}12` }}>
                                            <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                                        </div>
                                        <p className="text-sm font-semibold text-white/60">{tool.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })()}

            {/* CTA */}
            {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1); return (
                    <section ref={reveal.ref} className={`py-24 relative overflow-hidden ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.04))" }} />
                        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-6 text-white">Ready to automate your <span className="landing-gradient-text">GST compliance</span>?</h2>
                            <p className="text-lg text-white/35 mb-10">Start free. No credit card required.</p>
                            <Link to="/dashboard" className="landing-cta-btn-hero px-10 py-4 rounded-2xl text-base font-bold text-white relative overflow-hidden group inline-flex items-center gap-2">
                                <span className="relative z-10 flex items-center gap-2">Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                            </Link>
                        </div>
                    </section>
                );
            })()}
        </div>
    );
}
