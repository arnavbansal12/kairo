
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    Shield, FileCheck, Brain, Zap, BarChart3, Clock, ArrowRight,
    CheckCircle2, ChevronRight, Sparkles, Star, Globe, Lock,
    TrendingUp, Users, Building2, AlertTriangle, Eye, FileText,
    IndianRupee, Scale, Rocket, ChevronDown,
} from "lucide-react";

/* ─── HOOKS ─── */
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

function Counter({ end, suffix = "", prefix = "", duration = 2000 }) {
    const [count, setCount] = useState(0);
    const { ref, visible } = useReveal(0.3);
    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => { start += step; if (start >= end) { setCount(end); clearInterval(timer); } else setCount(Math.floor(start)); }, 16);
        return () => clearInterval(timer);
    }, [visible, end, duration]);
    return <span ref={ref}>{prefix}{count.toLocaleString("en-IN")}{suffix}</span>;
}

/* ─── PARTICLES ─── */
function Particles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {[...Array(25)].map((_, i) => (
                <div key={i} className="landing-particle" style={{
                    left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                    width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px`,
                    animationDelay: `${Math.random() * 6}s`, animationDuration: `${4 + Math.random() * 8}s`,
                    background: [`rgba(139,92,246,0.5)`, `rgba(6,182,212,0.5)`, `rgba(16,185,129,0.4)`, `rgba(245,158,11,0.4)`, `rgba(239,68,68,0.3)`][i % 5],
                }} />
            ))}
        </div>
    );
}

/* ─── GRID BG ─── */
function GridBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="landing-grid" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)" }} />
        </div>
    );
}

/* ─── MARQUEE ─── */
function Marquee({ children }) {
    return (
        <div className="overflow-hidden relative">
            <div className="flex gap-12 items-center landing-marquee">{children}{children}</div>
        </div>
    );
}

/* ─── TYPEWRITER ─── */
function TypeWriter({ words }) {
    const [index, setIndex] = useState(0);
    const [text, setText] = useState("");
    const [deleting, setDeleting] = useState(false);
    useEffect(() => {
        const word = words[index];
        const timer = setTimeout(() => {
            if (!deleting) {
                setText(word.slice(0, text.length + 1));
                if (text.length + 1 === word.length) setTimeout(() => setDeleting(true), 1500);
            } else {
                setText(word.slice(0, text.length - 1));
                if (text.length === 0) { setDeleting(false); setIndex((index + 1) % words.length); }
            }
        }, deleting ? 50 : 100);
        return () => clearTimeout(timer);
    }, [text, deleting, index, words]);
    return <span className="landing-gradient-text-hero">{text}<span className="landing-cursor-blink">|</span></span>;
}

/* ══════════════════════ MAIN LANDING PAGE ══════════════════════ */
export default function LandingPage() {
    const hero = useReveal(0.1);
    const features = useReveal(0.1);
    const showcase = useReveal(0.1);
    const stats = useReveal(0.1);
    const cta = useReveal(0.1);

    const featureCards = [
        { icon: Shield, color: "#8B5CF6", title: "GSTIN Validation", desc: "Real-time government database integration" },
        { icon: FileCheck, color: "#10B981", title: "Smart Filing", desc: "AI-powered auto-fill and submission" },
        { icon: Brain, color: "#06B6D4", title: "AI Reconciliation", desc: "99.7% accuracy fuzzy matching" },
        { icon: BarChart3, color: "#F59E0B", title: "Compliance Reports", desc: "Auditor-grade one-click reports" },
        { icon: AlertTriangle, color: "#EF4444", title: "Risk Monitoring", desc: "Real-time alerts and scoring" },
        { icon: IndianRupee, color: "#22C55E", title: "ITC Optimization", desc: "Maximize input tax credits" },
    ];

    return (
        <div className="bg-[#0b0b0f] text-white min-h-screen font-sans selection:bg-purple-500/30 selection:text-white">
            {/* ══════ HERO ══════ */}
            <header className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden">
                <GridBackground />
                <Particles />
                <div className="landing-blob landing-blob-1" aria-hidden="true" />
                <div className="landing-blob landing-blob-2" aria-hidden="true" />
                <div className="landing-blob landing-blob-3" aria-hidden="true" />

                <div ref={hero.ref} className={`relative z-10 max-w-6xl mx-auto px-6 text-center ${hero.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 landing-badge-shimmer" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 landing-sparkle-spin" />
                        <span className="text-xs font-medium text-purple-300">AI-Powered GST Compliance — Now in Beta</span>
                        <ChevronRight className="w-3 h-3 text-purple-400" />
                    </div>

                    <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tight mb-6">
                        <span className="block landing-text-reveal text-white" style={{ animationDelay: "0.1s" }}>GST Compliance</span>
                        <TypeWriter words={["on Autopilot", "Made Simple", "Zero Penalties", "AI-Powered"]} />
                    </h1>

                    <p className="text-sm sm:text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed landing-fade-delayed px-2" style={{ animationDelay: "0.6s" }}>
                        The only platform that combines <strong className="text-white/70">AI intelligence</strong>, <strong className="text-white/70">auditor-grade accuracy</strong>, and <strong className="text-white/70">zero-cost accessibility</strong>.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 landing-fade-delayed" style={{ animationDelay: "0.8s" }}>
                        <Link to="/dashboard" className="landing-cta-btn-hero px-8 py-4 rounded-2xl text-base font-bold text-white relative overflow-hidden group">
                            <span className="relative z-10 flex items-center gap-2">Start Free — No Card Required <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                        </Link>
                        <Link to="/how-it-works" className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-medium text-white/50 hover:text-white transition-all hover:bg-white/5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Eye className="w-4 h-4" /> See How It Works
                        </Link>
                    </div>

                    {/* Hero Image */}
                    <div className="relative max-w-4xl mx-auto landing-fade-delayed" style={{ animationDelay: "1s" }}>
                        <div className="landing-hero-image-wrapper">
                            <div className="absolute -inset-4 rounded-3xl opacity-50 landing-glow-pulse" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1), rgba(16,185,129,0.1))", filter: "blur(40px)" }} />
                            <div className="relative rounded-2xl overflow-hidden landing-perspective-tilt" style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1)" }}>
                                {/* Placeholder Image using CSS or real image if exists */}
                                <div className="w-full h-[400px] bg-black/50 flex items-center justify-center border border-white/10 rounded-2xl">
                                    <span className="text-white/20">Dashboard Preview Image</span>
                                </div>
                                {/*
                <img src="/images/hero-dashboard.png" alt="ComplianceAI Dashboard" className="w-full h-auto" />
                */}
                                <div className="absolute top-[12%] right-[5%] landing-float-badge"><div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-emerald-400" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)", backdropFilter: "blur(10px)" }}><CheckCircle2 className="w-3.5 h-3.5" /> 92% Score</div></div>
                                <div className="absolute bottom-[20%] left-[3%] landing-float-badge" style={{ animationDelay: "1.5s" }}><div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-purple-400" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.2)", backdropFilter: "blur(10px)" }}><Brain className="w-3.5 h-3.5" /> AI Insights</div></div>
                                <div className="absolute top-[45%] right-[2%] landing-float-badge" style={{ animationDelay: "3s" }}><div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-cyan-400" style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.2)", backdropFilter: "blur(10px)" }}><Zap className="w-3.5 h-3.5" /> Live Sync</div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 landing-scroll-indicator"><ChevronDown className="w-5 h-5 text-white/20" /></div>
            </header>

            {/* ══════ SOCIAL PROOF MARQUEE ══════ */}
            <section className="py-16 border-y border-white/[0.04]" aria-label="Trusted by">
                <div className="max-w-7xl mx-auto px-6 mb-8">
                    <p className="text-center text-xs uppercase tracking-[0.2em] text-white/20">Trusted by 2,800+ businesses across India</p>
                </div>
                <Marquee>
                    {["TechVista", "GreenLeaf Exports", "Mehta & Associates", "InnoVate Labs", "PrimeFinance", "CloudStack", "DataBridge", "NexGen Solutions", "Tata SME", "Reliance Retail"].map(name => (
                        <div key={name} className="flex items-center gap-2 text-white/15 hover:text-white/30 transition-colors duration-500 whitespace-nowrap px-4">
                            <Building2 className="w-5 h-5" />
                            <span className="text-lg font-semibold tracking-tight">{name}</span>
                        </div>
                    ))}
                </Marquee>
            </section>

            {/* ══════ STATS ══════ */}
            <section ref={stats.ref} className={`py-20 relative ${stats.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                        {[
                            { value: 2847, suffix: "+", label: "Businesses", icon: Users, color: "#8B5CF6" },
                            { value: 99, suffix: ".7%", label: "Accuracy", icon: Brain, color: "#06B6D4" },
                            { value: 40, suffix: " hrs", label: "Saved / Month", icon: Clock, color: "#10B981" },
                            { value: 0, suffix: " penalties", label: "With ComplianceAI", icon: Shield, color: "#F59E0B", prefix: "₹" },
                        ].map((stat, i) => (
                            <div key={i} className="text-center p-4 sm:p-6 rounded-2xl landing-stat-card group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3" style={{ background: `${stat.color}15`, boxShadow: `0 0 20px ${stat.color}10` }}>
                                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                                </div>
                                <div className="text-xl sm:text-3xl font-black text-white mb-1"><Counter end={stat.value} suffix={stat.suffix} prefix={stat.prefix || ""} /></div>
                                <p className="text-xs text-white/30">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ FEATURES PREVIEW ══════ */}
            <section ref={features.ref} className={`py-24 relative ${features.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.15)" }}>
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-cyan-400">Features</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">Everything for <span className="landing-gradient-text">GST compliance</span></h2>
                        <p className="text-base text-white/35 max-w-xl mx-auto">Six powerful modules working together.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                        {featureCards.map((f, i) => (
                            <div key={i} className="landing-feature-card group relative rounded-2xl p-6 cursor-default" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 0%, ${f.color}08, transparent 60%)` }} />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-5deg]" style={{ background: `${f.color}12`, border: `1px solid ${f.color}20` }}>
                                            <f.icon className="w-5 h-5" style={{ color: f.color }} />
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-1">{f.title}</h3>
                                    <p className="text-sm text-white/35 group-hover:text-white/50 transition-colors">{f.desc}</p>
                                </div>
                                <div className="absolute bottom-0 left-[10%] right-[10%] h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500" style={{ background: `linear-gradient(90deg, transparent, ${f.color}, transparent)` }} />
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <Link to="/features" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-purple-400 hover:text-white transition-all landing-magnetic-btn" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                            Explore All Features <ArrowRight className="w-4 h-4 landing-arrow-bounce" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══════ SHOWCASE ══════ */}
            <section ref={showcase.ref} className={`py-24 relative overflow-hidden ${showcase.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, rgba(139,92,246,0.03), transparent)" }} />
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}>
                                <Rocket className="w-3 h-3 text-purple-400" />
                                <span className="text-[10px] uppercase tracking-widest font-semibold text-purple-400">Platform</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-6 text-white">Built for <span className="landing-gradient-text">Indian business</span></h2>
                            <p className="text-base text-white/35 mb-8 leading-relaxed">Every feature is designed around Indian GST law — CGST, SGST, IGST, ITC natively.</p>
                            <div className="space-y-4">
                                {[
                                    { icon: FileText, text: "GSTR-1, 3B, 9 — auto-populated, validated", color: "#10B981" },
                                    { icon: Brain, text: "AI reconciliation with 99.7% accuracy", color: "#8B5CF6" },
                                    { icon: Scale, text: "GST law references on every alert", color: "#F59E0B" },
                                    { icon: Lock, text: "Bank-grade encryption · Indian data centers", color: "#06B6D4" },
                                    { icon: Globe, text: "Multi-GSTIN · Multi-company support", color: "#EF4444" },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 landing-stagger-item" style={{ animationDelay: `${i * 0.12}s` }}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}12` }}><item.icon className="w-4 h-4" style={{ color: item.color }} /></div>
                                        <span className="text-sm text-white/60">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] hidden sm:block">
                            <div className="absolute top-0 right-0 w-72 landing-float-card"><div className="rounded-2xl p-5" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)", backdropFilter: "blur(10px)" }}><div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-xs font-bold text-emerald-400">GSTR-3B Filed</span></div><p className="text-[11px] text-white/30">Monthly return filed for GSTIN 27AADCS0543H1ZN</p><div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(16,185,129,0.1)" }}><div className="h-full rounded-full bg-emerald-400/60 landing-progress-fill" /></div></div></div>
                            <div className="absolute top-[30%] left-0 w-64 landing-float-card" style={{ animationDelay: "1s" }}><div className="rounded-2xl p-5" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)", backdropFilter: "blur(10px)" }}><div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-purple-400">AI Insight</span></div><p className="text-[11px] text-white/30">₹47,320 unclaimed ITC from Q3. Review recommended.</p></div></div>
                            <div className="absolute bottom-[10%] right-[10%] w-60 landing-float-card" style={{ animationDelay: "2s" }}><div className="rounded-2xl p-5" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", backdropFilter: "blur(10px)" }}><div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-xs font-bold text-amber-400">Deadline Alert</span></div><p className="text-[11px] text-white/30">GSTR-1 due in 3 days. Auto-filing ready.</p></div></div>
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" aria-hidden="true">
                                <line x1="50%" y1="15%" x2="30%" y2="45%" stroke="url(#lgrd)" strokeWidth="1" strokeDasharray="4 4" className="landing-dash-animate" />
                                <line x1="30%" y1="50%" x2="65%" y2="80%" stroke="url(#lgrd)" strokeWidth="1" strokeDasharray="4 4" className="landing-dash-animate" />
                                <defs><linearGradient id="lgrd"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#06B6D4" /></linearGradient></defs>
                            </svg>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════ QUICK LINKS TO PAGES ══════ */}
            <section className="py-20 relative">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-5">
                        {[
                            { title: "How It Works", desc: "3 steps to zero-stress compliance", href: "/how-it-works", icon: Zap, color: "#10B981" },
                            { title: "View Pricing", desc: "Free forever, scale when ready", href: "/pricing", icon: IndianRupee, color: "#F59E0B" },
                            { title: "Customer Stories", desc: "Hear from 2,800+ businesses", href: "/testimonials", icon: Star, color: "#8B5CF6" },
                        ].map((item, i) => (
                            <Link key={i} to={item.href} className="group rounded-2xl p-6 transition-all duration-500 hover:translate-y-[-4px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110" style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}>
                                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-1 group-hover:text-white">{item.title}</h3>
                                <p className="text-sm text-white/30 mb-3">{item.desc}</p>
                                <span className="text-xs font-semibold flex items-center gap-1 transition-colors" style={{ color: item.color }}>
                                    Learn More <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ FINAL CTA ══════ */}
            <section ref={cta.ref} className={`py-24 relative overflow-hidden ${cta.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.04), rgba(16,185,129,0.04))" }} />
                <div className="landing-blob landing-blob-cta-1" aria-hidden="true" />
                <div className="landing-blob landing-blob-cta-2" aria-hidden="true" />
                <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">Stop losing money to <br className="hidden sm:block" /><span className="landing-gradient-text">compliance penalties</span></h2>
                    <p className="text-lg text-white/35 mb-10 max-w-xl mx-auto">Join 2,800+ Indian businesses. Free forever for small businesses.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/dashboard" className="landing-cta-btn-hero px-10 py-4 rounded-2xl text-base font-bold text-white relative overflow-hidden group">
                            <span className="relative z-10 flex items-center gap-2">Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                        </Link>
                        <p className="text-xs text-white/20">No credit card · 2 minutes · Free forever</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
