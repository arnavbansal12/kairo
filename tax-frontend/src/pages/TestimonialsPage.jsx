
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight, Star, Sparkles, Quote,
    Building2, Users, TrendingUp, Heart,
    CheckCircle2, Shield,
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

function Counter({ end, suffix = "", duration = 2000 }) {
    const [count, setCount] = useState(0);
    const { ref, visible } = useReveal(0.3);
    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => { start += step; if (start >= end) { setCount(end); clearInterval(timer); } else setCount(Math.floor(start)); }, 16);
        return () => clearInterval(timer);
    }, [visible, end, duration]);
    return <span ref={ref}>{count.toLocaleString("en-IN")}{suffix}</span>;
}

const testimonials = [
    {
        name: "Rajesh Mehta", role: "Founder", company: "TechVista Solutions", initials: "RM",
        rating: 5, color: "#8B5CF6",
        text: "ComplianceAI saved us from a ₹2.4 lakh penalty. The AI reconciliation caught mismatches we never would have found manually. It's like having a CA working 24/7.",
        stat: "₹2.4L", statLabel: "Penalty avoided",
    },
    {
        name: "Priya Sharma", role: "CA Partner", company: "Sharma & Associates", initials: "PS",
        rating: 5, color: "#06B6D4",
        text: "Managing GST for 50+ clients was a nightmare. ComplianceAI reduced our filing time by 80%. The multi-GSTIN feature is a game-changer for CA firms.",
        stat: "80%", statLabel: "Time saved",
    },
    {
        name: "Ankit Gupta", role: "CFO", company: "GreenLeaf Exports", initials: "AG",
        rating: 5, color: "#10B981",
        text: "The ITC optimization engine found ₹4.7 lakhs in unclaimed credits from last year. Paid for itself 100x over. Best investment we made for compliance.",
        stat: "₹4.7L", statLabel: "ITC recovered",
    },
    {
        name: "Meera Kapoor", role: "Director", company: "InnoVate Labs", initials: "MK",
        rating: 5, color: "#F59E0B",
        text: "We switched from manual filing to ComplianceAI and haven't looked back. Zero penalties in 18 months. The deadline alerts are incredibly helpful.",
        stat: "0", statLabel: "Penalties in 18 months",
    },
    {
        name: "Suresh Patel", role: "Proprietor", company: "Patel Textiles", initials: "SP",
        rating: 5, color: "#EF4444",
        text: "As a small business owner, I can't afford a full-time accountant. ComplianceAI's free plan gives me everything I need. The GSTIN validation is instant.",
        stat: "₹0", statLabel: "Cost for small business",
    },
    {
        name: "Deepika Singh", role: "Tax Consultant", company: "PrimeFinance", initials: "DS",
        rating: 5, color: "#22C55E",
        text: "The auditor-grade reports save me hours every month-end. My clients are impressed by the professionalism and accuracy. Strongly recommended for all CAs.",
        stat: "25hrs", statLabel: "Saved monthly",
    },
    {
        name: "Vikram Joshi", role: "CEO", company: "CloudStack India", initials: "VJ",
        rating: 5, color: "#8B5CF6",
        text: "ComplianceAI integrated perfectly with our TallyPrime setup. Auto-sync means no manual data entry. Filing is now a one-click affair.",
        stat: "1-click", statLabel: "Filing process",
    },
    {
        name: "Neha Reddy", role: "Finance Head", company: "NexGen Solutions", initials: "NR",
        rating: 5, color: "#06B6D4",
        text: "The risk monitoring feature alerted us about a supplier whose registration was cancelled. We stopped ITC claims immediately and avoided a huge penalty.",
        stat: "₹8.2L", statLabel: "Risk averted",
    },
    {
        name: "Arun Kumar", role: "Founder", company: "DataBridge", initials: "AK",
        rating: 5, color: "#10B981",
        text: "From a 3-day filing nightmare to a 30-minute process. ComplianceAI is the best thing that happened to our finance team. The AI insights are genuinely useful.",
        stat: "94%", statLabel: "Faster filing",
    },
];

export default function TestimonialsPage() {
    const hero = useReveal(0.1);
    const statsRef = useReveal(0.1);
    const [hoveredId, setHoveredId] = useState(null);

    return (
        <div className="bg-[#0b0b0f] text-white min-h-screen font-sans selection:bg-purple-500/30 selection:text-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org", "@type": "Product", name: "ComplianceAI",
                    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "2847", bestRating: "5" },
                    review: testimonials.slice(0, 5).map(t => ({
                        "@type": "Review", author: { "@type": "Person", name: t.name },
                        reviewRating: { "@type": "Rating", ratingValue: String(t.rating), bestRating: "5" },
                        reviewBody: t.text,
                    })),
                })
            }} />

            {/* Hero */}
            <section className="relative pt-32 pb-16 overflow-hidden">
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(139,92,246,0.06), transparent 60%)" }} />
                <div ref={hero.ref} className={`max-w-5xl mx-auto px-6 text-center relative z-10 ${hero.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}>
                        <Heart className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-purple-400">Testimonials</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tight mb-6 text-white">
                        Loved by <span className="landing-gradient-text">2,800+ businesses</span>
                    </h1>
                    <p className="text-sm sm:text-lg text-white/40 max-w-2xl mx-auto">Real results from real businesses across India.</p>
                </div>
            </section>

            {/* Stats */}
            <section ref={statsRef.ref} className={`py-12 ${statsRef.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                <div className="max-w-4xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { value: 4.9, label: "Rating", suffix: "/5", icon: Star, color: "#F59E0B" },
                            { value: 2847, label: "Happy Users", suffix: "+", icon: Users, color: "#8B5CF6" },
                            { value: 98, label: "Satisfaction", suffix: "%", icon: Heart, color: "#EF4444" },
                            { value: 40, label: "Avg. Hours Saved", suffix: "/mo", icon: TrendingUp, color: "#10B981" },
                        ].map((s, i) => (
                            <div key={i} className="text-center p-3 sm:p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
                                <div className="text-lg sm:text-2xl font-black text-white"><Counter end={s.value} suffix={s.suffix} /></div>
                                <p className="text-[10px] text-white/25 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonial Grid */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
                        {testimonials.map((t, i) => {
                            // eslint-disable-next-line react-hooks/rules-of-hooks
                            const reveal = useReveal(0.1);
                            return (
                                <div
                                    key={i}
                                    ref={reveal.ref}
                                    className={`break-inside-avoid ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}
                                    style={{ animationDelay: `${(i % 3) * 0.1}s` }}
                                    onMouseEnter={() => setHoveredId(i)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <div
                                        className="rounded-2xl p-6 transition-all duration-500"
                                        style={{
                                            background: hoveredId === i ? `${t.color}08` : "rgba(255,255,255,0.02)",
                                            border: `1px solid ${hoveredId === i ? `${t.color}20` : "rgba(255,255,255,0.05)"}`,
                                            transform: hoveredId === i ? "translateY(-4px)" : "none",
                                            boxShadow: hoveredId === i ? `0 20px 60px ${t.color}10` : "none",
                                        }}
                                    >
                                        {/* Stars */}
                                        <div className="flex items-center gap-0.5 mb-4">
                                            {[...Array(t.rating)].map((_, j) => (
                                                <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            ))}
                                        </div>

                                        {/* Quote */}
                                        <div className="relative mb-6">
                                            <Quote className="absolute -top-1 -left-1 w-6 h-6 opacity-10" style={{ color: t.color }} />
                                            <p className="text-sm text-white/50 leading-relaxed pl-4">{t.text}</p>
                                        </div>

                                        {/* Stat */}
                                        <div className="p-3 rounded-xl mb-5" style={{ background: `${t.color}06`, border: `1px solid ${t.color}10` }}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-2xl font-black" style={{ color: t.color }}>{t.stat}</span>
                                                <span className="text-[10px] text-white/25">{t.statLabel}</span>
                                            </div>
                                        </div>

                                        {/* Author */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: `${t.color}20` }}>{t.initials}</div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{t.name}</p>
                                                <p className="text-[11px] text-white/30">{t.role}, {t.company}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1);
                return (
                    <section ref={reveal.ref} className={`py-24 relative overflow-hidden ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.04))" }} />
                        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-6 text-white">Join the <span className="landing-gradient-text">2,800+ businesses</span></h2>
                            <p className="text-lg text-white/35 mb-10">Start free today. No credit card required.</p>
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
