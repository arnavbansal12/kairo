
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight, CheckCircle2, Sparkles, IndianRupee,
    Shield, X, Crown, Zap, Users, Brain, FileCheck,
    BarChart3, AlertTriangle, Download, Globe, Lock,
    Headphones, Star,
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

function Counter({ end, duration = 1500 }) {
    const [count, setCount] = useState(0);
    const { ref, visible } = useReveal(0.3);
    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => { start += step; if (start >= end) { setCount(end); clearInterval(timer); } else setCount(Math.floor(start)); }, 16);
        return () => clearInterval(timer);
    }, [visible, end, duration]);
    return <span ref={ref}>{count.toLocaleString("en-IN")}</span>;
}

const allFeatures = [
    { name: "GSTINs", free: "1", pro: "Unlimited" },
    { name: "Invoices per month", free: "100", pro: "Unlimited" },
    { name: "GSTIN Validation", free: true, pro: true },
    { name: "GSTR-1, 3B Filing", free: true, pro: true },
    { name: "GSTR-9 Annual Return", free: false, pro: true },
    { name: "AI Reconciliation", free: "Basic", pro: "Advanced" },
    { name: "Compliance Reports", free: "3 types", pro: "12+ types" },
    { name: "Risk Monitoring", free: "Basic", pro: "Real-time" },
    { name: "ITC Optimization", free: false, pro: true },
    { name: "TallyPrime Integration", free: false, pro: true },
    { name: "Bulk Filing", free: false, pro: true },
    { name: "Export (CSV, Excel, PDF)", free: "CSV only", pro: "All formats" },
    { name: "Multi-Company", free: false, pro: true },
    { name: "Priority Support", free: false, pro: true },
    { name: "Dedicated Account Manager", free: false, pro: true },
    { name: "API Access", free: false, pro: true },
];

export default function PricingPage() {
    const hero = useReveal(0.1);
    const comparison = useReveal(0.1);
    const [annual, setAnnual] = useState(false);

    const monthlyPrice = 999;
    const annualPrice = 799;
    const currentPrice = annual ? annualPrice : monthlyPrice;
    const savings = (monthlyPrice - annualPrice) * 12;

    return (
        <div className="bg-[#0b0b0f] text-white min-h-screen font-sans selection:bg-purple-500/30 selection:text-white">
            {/* JSON-LD */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org", "@type": "Product", name: "ComplianceAI",
                    offers: [
                        { "@type": "Offer", price: "0", priceCurrency: "INR", name: "Free Plan", description: "For small businesses & freelancers" },
                        { "@type": "Offer", price: String(currentPrice), priceCurrency: "INR", name: "Pro Plan", description: "For growing businesses & CA firms", billingIncrement: annual ? "P1Y" : "P1M" },
                    ],
                })
            }} />

            {/* Hero */}
            <section className="relative pt-32 pb-16 overflow-hidden">
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(245,158,11,0.06), transparent 60%)" }} />
                <div ref={hero.ref} className={`max-w-5xl mx-auto px-6 text-center relative z-10 ${hero.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}>
                        <IndianRupee className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-400">Pricing</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tight mb-6 text-white">
                        Start free. <span className="landing-gradient-text">Scale when ready.</span>
                    </h1>
                    <p className="text-sm sm:text-lg text-white/40 max-w-2xl mx-auto mb-10">No hidden fees. No credit card required. Cancel anytime.</p>

                    {/* Billing Toggle */}
                    <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <button onClick={() => setAnnual(false)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${!annual ? "text-white" : "text-white/40"}`} style={{ background: !annual ? "rgba(139,92,246,0.15)" : "transparent" }}>Monthly</button>
                        <button onClick={() => setAnnual(true)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer relative ${annual ? "text-white" : "text-white/40"}`} style={{ background: annual ? "rgba(139,92,246,0.15)" : "transparent" }}>
                            Annual
                            {!annual && <span className="absolute -top-3 -right-3 px-2 py-0.5 text-[9px] font-bold rounded-full text-emerald-400" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)" }}>−20%</span>}
                        </button>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="py-12">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Free Plan */}
                        <div className="rounded-2xl p-6 sm:p-8 landing-pricing-card transition-all duration-500 hover:translate-y-[-4px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-5 h-5 text-white/40" />
                                <h3 className="text-lg font-bold text-white">Free</h3>
                            </div>
                            <p className="text-xs text-white/30 mb-6">For small businesses & freelancers</p>
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-3xl sm:text-5xl font-black text-white">₹0</span>
                                <span className="text-sm text-white/25">/forever</span>
                            </div>
                            <p className="text-xs text-white/20 mb-8">No credit card required</p>

                            <ul className="space-y-3 mb-8">
                                {["1 GSTIN", "100 invoices/month", "GSTIN validation", "GSTR-1, 3B filing", "Basic reconciliation", "3 report types", "Basic risk alerts", "CSV export", "Email support"].map(f => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-white/50"><CheckCircle2 className="w-4 h-4 text-emerald-400/60 shrink-0" /> {f}</li>
                                ))}
                            </ul>

                            <Link to="/dashboard" className="block w-full py-3.5 rounded-xl text-center text-sm font-semibold text-white/70 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                Get Started Free
                            </Link>
                        </div>

                        {/* Pro Plan */}
                        <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden landing-pricing-card-pro transition-all duration-500 hover:translate-y-[-4px]" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
                            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}>
                                <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> Most Popular</span>
                            </div>
                            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent)" }} />

                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-bold text-white">Pro</h3>
                            </div>
                            <p className="text-xs text-white/30 mb-6">For growing businesses & CA firms</p>
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-3xl sm:text-5xl font-black text-white">₹<Counter end={currentPrice} /></span>
                                <span className="text-sm text-white/25">/{annual ? "mo (billed annually)" : "month"}</span>
                            </div>
                            {annual && <p className="text-xs text-emerald-400 mb-8">Save ₹{savings.toLocaleString("en-IN")}/year</p>}
                            {!annual && <p className="text-xs text-white/20 mb-8">or ₹799/mo billed annually</p>}

                            <ul className="space-y-3 mb-8">
                                {["Unlimited GSTINs", "Unlimited invoices", "Advanced AI reconciliation", "GSTR-9 annual return", "12+ report types", "Real-time risk monitoring", "ITC optimization", "TallyPrime integration", "Bulk filing", "All export formats", "Multi-company", "Priority support", "Dedicated account manager", "API access"].map(f => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-white/50"><CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> {f}</li>
                                ))}
                            </ul>

                            <Link to="/dashboard" className="landing-cta-btn block w-full py-3.5 rounded-xl text-center text-sm font-bold text-white relative overflow-hidden">
                                <span className="relative z-10">Start 14-Day Free Trial</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Comparison Table */}
            <section ref={comparison.ref} className={`py-24 ${comparison.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                <div className="max-w-3xl mx-auto px-6">
                    <h2 className="text-2xl font-black text-white text-center mb-10">Feature <span className="landing-gradient-text">Comparison</span></h2>
                    <div className="rounded-2xl overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="min-w-[400px]">
                            <div className="grid grid-cols-3 p-3 sm:p-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.03)" }}>
                                <span className="text-white/40">Feature</span>
                                <span className="text-center text-white/40">Free</span>
                                <span className="text-center text-purple-400">Pro</span>
                            </div>
                            {allFeatures.map((f, i) => (
                                <div key={i} className="grid grid-cols-3 p-3 sm:p-4 items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                                    <span className="text-xs sm:text-sm text-white/50">{f.name}</span>
                                    <span className="text-center text-sm">
                                        {typeof f.free === "boolean" ? (f.free ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-white/15 mx-auto" />) : <span className="text-white/40">{f.free}</span>}
                                    </span>
                                    <span className="text-center text-sm">
                                        {typeof f.pro === "boolean" ? (f.pro ? <CheckCircle2 className="w-4 h-4 text-purple-400 mx-auto" /> : <X className="w-4 h-4 text-white/15 mx-auto" />) : <span className="text-purple-400 font-semibold">{f.pro}</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Money-Back Guarantee */}
            {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1);
                return (
                    <section ref={reveal.ref} className={`py-16 ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                        <div className="max-w-3xl mx-auto px-6 text-center">
                            <div className="rounded-2xl p-8" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
                                <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">30-Day Money-Back Guarantee</h3>
                                <p className="text-sm text-white/40 max-w-lg mx-auto">Try Pro risk-free. If you&apos;re not satisfied within 30 days, we&apos;ll refund every rupee. No questions asked.</p>
                            </div>
                        </div>
                    </section>
                );
            })()}

            {/* CTA */}
            {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1);
                return (
                    <section ref={reveal.ref} className={`py-24 relative overflow-hidden ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.04))" }} />
                        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-6 text-white">Questions about <span className="landing-gradient-text">pricing</span>?</h2>
                            <p className="text-lg text-white/35 mb-10">Check our FAQ or talk to our team.</p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link to="/faq" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                    View FAQ <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                                <Link to="/dashboard" className="landing-cta-btn-hero px-8 py-3 rounded-xl text-sm font-bold text-white relative overflow-hidden group">
                                    <span className="relative z-10 flex items-center gap-2">Start Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                                </Link>
                            </div>
                        </div>
                    </section>
                );
            })()}
        </div>
    );
}
