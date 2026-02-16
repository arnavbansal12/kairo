
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight, ChevronDown, Sparkles, HelpCircle,
    Search, Shield, FileCheck, Brain, IndianRupee,
    Lock, Zap, Building2,
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

const faqCategories = [
    {
        name: "General", icon: HelpCircle, color: "#8B5CF6",
        items: [
            { q: "What is ComplianceAI?", a: "ComplianceAI is an AI-powered GST compliance platform for Indian businesses. It automates GSTIN validation, GST return filing (GSTR-1, 3B, 9), AI reconciliation, ITC optimization, and real-time risk monitoring." },
            { q: "Who is ComplianceAI for?", a: "It's for any Indian business — freelancers, SMEs, CA firms, enterprises. Whether you manage 1 GSTIN or 500, ComplianceAI scales with you. Our free plan is perfect for small businesses, and the Pro plan serves growing organizations." },
            { q: "Do I need accounting knowledge to use it?", a: "No. ComplianceAI is designed for business owners, not just accountants. Our AI handles the complexity — you just review and approve. The interface is intuitive with guided workflows and real-time help." },
            { q: "Is ComplianceAI government-approved?", a: "ComplianceAI works with the official GST portal and follows all GSTN guidelines. Your filings go through the official government channels with OTP verification. We don't bypass any government process." },
        ],
    },
    {
        name: "Pricing & Plans", icon: IndianRupee, color: "#F59E0B",
        items: [
            { q: "Is the Free plan really free forever?", a: "Yes. The Free plan includes 1 GSTIN, 100 invoices/month, GSTR-1 & 3B filing, basic reconciliation, and 3 report types. No credit card required. No time limit. Free forever." },
            { q: "How much does the Pro plan cost?", a: "Pro costs ₹999/month (monthly) or ₹799/month (billed annually at ₹9,588/year). You save ₹2,400/year with annual billing. Includes unlimited GSTINs, invoices, advanced AI features, and priority support." },
            { q: "Can I upgrade or downgrade anytime?", a: "Yes. You can switch between Free and Pro at any time. Upgrades are instant. Downgrades take effect at the end of your billing cycle. No lock-in period." },
            { q: "What payment methods do you accept?", a: "We accept UPI (GPay, PhonePe, Paytm), credit/debit cards, net banking via Razorpay, and PayPal for international payments. UPI QR codes are available for instant payment." },
            { q: "Is there a refund policy?", a: "Yes. We offer a 30-day money-back guarantee. If you're not satisfied with Pro within 30 days of purchase, we'll refund 100% — no questions asked." },
        ],
    },
    {
        name: "Features", icon: Zap, color: "#06B6D4",
        items: [
            { q: "How does AI reconciliation work?", a: "Our AI compares your purchase records (from invoices/Tally) with GSTR-2B data from the portal. It uses intelligent fuzzy matching to handle minor discrepancies in invoice numbers, amounts, and dates. Mismatches are auto-categorized with suggested actions." },
            { q: "Which GST returns can I file?", a: "GSTR-1 (outward supplies), GSTR-3B (monthly summary), and GSTR-9 (annual return, Pro plan). All returns are auto-populated from your invoice data and validated before submission." },
            { q: "What is ITC optimization?", a: "Our engine analyzes your purchase data to identify unclaimed Input Tax Credits, track reversals, and suggest strategies to maximize your ITC. On average, our Pro users discover ₹4.5 lakhs in additional ITC annually." },
            { q: "Does it integrate with TallyPrime?", a: "Yes (Pro plan). ComplianceAI syncs with TallyPrime automatically. Just install our connector and set it up once — after that, your data stays in sync in real-time. No manual export/import." },
        ],
    },
    {
        name: "Security & Privacy", icon: Lock, color: "#10B981",
        items: [
            { q: "Is my data secure?", a: "Absolutely. We use AES-256 encryption at rest and TLS 1.3 in transit. Data is stored in SOC 2 Type II certified Indian data centers. We never share your data with third parties." },
            { q: "Where is my data stored?", a: "All data is stored in Indian data centers (Mumbai & Chennai) to comply with data localization requirements. We use Supabase with row-level security for database access control." },
            { q: "Can I export and delete my data?", a: "Yes. You can export all your data at any time in CSV, Excel, or PDF format. You can also request complete data deletion from your settings — we'll remove everything within 48 hours." },
        ],
    },
];

export default function FAQPage() {
    const hero = useReveal(0.1);
    const [activeCat, setActiveCat] = useState(0);
    const [openItems, setOpenItems] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    const toggleItem = (key) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const filteredCategories = searchQuery
        ? faqCategories.map(cat => ({
            ...cat,
            items: cat.items.filter(item =>
                item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.a.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        })).filter(cat => cat.items.length > 0)
        : [faqCategories[activeCat]];

    const allFaqs = faqCategories.flatMap(c => c.items);

    return (
        <div className="bg-[#0b0b0f] text-white min-h-screen font-sans selection:bg-purple-500/30 selection:text-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org", "@type": "FAQPage",
                    mainEntity: allFaqs.map(f => ({
                        "@type": "Question", name: f.q,
                        acceptedAnswer: { "@type": "Answer", text: f.a },
                    })),
                })
            }} />

            {/* Hero */}
            <section className="relative pt-32 pb-16 overflow-hidden">
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(139,92,246,0.05), transparent 60%)" }} />
                <div ref={hero.ref} className={`max-w-5xl mx-auto px-6 text-center relative z-10 ${hero.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}>
                        <HelpCircle className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-purple-400">FAQ</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tight mb-6 text-white">
                        Got questions? <span className="landing-gradient-text">We&apos;ve got answers.</span>
                    </h1>
                    <p className="text-sm sm:text-lg text-white/40 max-w-2xl mx-auto mb-10">Search or browse through our most commonly asked questions.</p>

                    {/* Search */}
                    <div className="max-w-lg mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        />
                    </div>
                </div>
            </section>

            {/* Category Tabs */}
            {!searchQuery && (
                <section className="py-8">
                    <div className="max-w-3xl mx-auto px-6">
                        <div className="flex overflow-x-auto items-center justify-start sm:justify-center gap-2 sm:gap-3 pb-2 -mx-2 px-2 scrollbar-hide">
                            {faqCategories.map((cat, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveCat(i)}
                                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 ${activeCat === i ? "text-white" : "text-white/30 hover:text-white/60"}`}
                                    style={{
                                        background: activeCat === i ? `${cat.color}12` : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${activeCat === i ? `${cat.color}25` : "rgba(255,255,255,0.05)"}`,
                                    }}
                                >
                                    <cat.icon className="w-4 h-4" style={{ color: activeCat === i ? cat.color : "inherit" }} />
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* FAQ Accordion */}
            <section className="py-12">
                <div className="max-w-3xl mx-auto px-6">
                    {filteredCategories.map((cat, ci) => (
                        <div key={ci} className={searchQuery && ci > 0 ? "mt-10" : ""}>
                            {searchQuery && (
                                <div className="flex items-center gap-2 mb-4">
                                    <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                                    <h3 className="text-sm font-bold" style={{ color: cat.color }}>{cat.name}</h3>
                                </div>
                            )}
                            <div className="space-y-3">
                                {cat.items.map((item, qi) => {
                                    const key = `${ci}-${qi}`;
                                    const isOpen = openItems.has(key);
                                    return (
                                        <div
                                            key={qi}
                                            className="rounded-xl overflow-hidden transition-all duration-300"
                                            style={{
                                                background: isOpen ? `${cat.color}06` : "rgba(255,255,255,0.02)",
                                                border: `1px solid ${isOpen ? `${cat.color}15` : "rgba(255,255,255,0.05)"}`,
                                            }}
                                        >
                                            <button
                                                onClick={() => toggleItem(key)}
                                                className="w-full flex items-center justify-between p-5 text-left cursor-pointer group"
                                            >
                                                <span className={`text-sm font-semibold transition-colors ${isOpen ? "text-white" : "text-white/60 group-hover:text-white"}`}>
                                                    {item.q}
                                                </span>
                                                <ChevronDown
                                                    className={`w-4 h-4 shrink-0 ml-4 transition-all duration-300 ${isOpen ? "rotate-180" : ""}`}
                                                    style={{ color: isOpen ? cat.color : "rgba(255,255,255,0.2)" }}
                                                />
                                            </button>
                                            <div
                                                className="overflow-hidden transition-all duration-500"
                                                style={{ maxHeight: isOpen ? "300px" : "0px" }}
                                            >
                                                <div className="px-5 pb-5">
                                                    <p className="text-sm text-white/40 leading-relaxed">{item.a}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {searchQuery && filteredCategories.length === 0 && (
                        <div className="text-center py-16">
                            <HelpCircle className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-sm text-white/30">No matching questions found. Try a different search term.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Contact CTA */}
            {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const reveal = useReveal(0.1); return (
                    <section ref={reveal.ref} className={`py-24 relative overflow-hidden ${reveal.visible ? "landing-fade-in-up" : "opacity-0"}`}>
                        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.04))" }} />
                        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-4 text-white">Still have <span className="landing-gradient-text">questions</span>?</h2>
                            <p className="text-base text-white/35 mb-8">Our team typically responds within 2 hours during business hours.</p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <a href="mailto:support@complianceai.in" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                    Email Support <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                                <Link to="/dashboard" className="landing-cta-btn-hero px-8 py-3 rounded-xl text-sm font-bold text-white relative overflow-hidden group">
                                    <span className="relative z-10 flex items-center gap-2">Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                                </Link>
                            </div>
                        </div>
                    </section>
                );
            })()}
        </div>
    );
}
