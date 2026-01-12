// GSTNews.jsx
// -----------------------------------------------------------------------------
// GST INTELLIGENCE MODULE - News Section + AI Summary
// White & Orange GST Theme with AI-powered insights
// -----------------------------------------------------------------------------

import { useState, useEffect, useContext, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Newspaper, ExternalLink, RefreshCw, AlertCircle,
    Filter, Calendar, Building2, Sparkles, TrendingUp,
    ChevronRight, Clock, Zap, AlertTriangle, Bell,
    CheckCircle2, ArrowRight, Lightbulb, Target,
    Shield, FileText
} from 'lucide-react';

// API Configuration
const API_URL = "http://127.0.0.1:8000";

// GST Orange Theme Colors
const GST_ORANGE = "#F47920";
const GST_ORANGE_LIGHT = "#FFF3EB";
const GST_ORANGE_DARK = "#D66518";

// Impact level colors
const IMPACT_COLORS = {
    HIGH: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
    MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
    LOW: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
};

// Source badge colors
const SOURCE_COLORS = {
    "News Media": { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    "Official Notification": { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
    "Expert Analysis": { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
};

// Theme context
const ThemeContext = createContext({ isDark: true });
const useTheme = () => useContext(ThemeContext);

// =============================================================================
// AI SUMMARY SECTION - "What You Need to Know Today"
// =============================================================================

const AISummarySection = ({ aiSummary, loading, isDark }) => {
    const [expanded, setExpanded] = useState(true);

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-gradient-to-r from-purple-900/30 to-orange-900/30 border border-purple-500/20' : 'bg-gradient-to-r from-orange-50 to-purple-50 border-2 border-orange-200'}`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-purple-500 flex items-center justify-center animate-pulse">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className={`h-5 w-48 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'} animate-pulse`} />
                        <div className={`h-3 w-32 rounded mt-2 ${isDark ? 'bg-white/5' : 'bg-gray-100'} animate-pulse`} />
                    </div>
                </div>
                <div className={`h-4 w-full rounded ${isDark ? 'bg-white/5' : 'bg-gray-100'} animate-pulse mb-2`} />
                <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-white/5' : 'bg-gray-100'} animate-pulse`} />
            </motion.div>
        );
    }

    if (!aiSummary) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl overflow-hidden mb-6 ${isDark
                ? 'bg-gradient-to-r from-purple-900/30 via-orange-900/20 to-purple-900/30 border border-purple-500/30'
                : 'bg-gradient-to-r from-orange-50 via-white to-purple-50 border-2 border-orange-200'
                }`}
        >
            {/* Header */}
            <div
                className="p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${GST_ORANGE}, #8B5CF6)` }}
                        >
                            <Sparkles className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                🎯 What You Need to Know Today
                            </h2>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                AI-powered summary • Updated just now
                            </p>
                        </div>
                    </div>
                    <motion.div
                        animate={{ rotate: expanded ? 90 : 0 }}
                        className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}
                    >
                        <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        {/* Daily Digest */}
                        <div className={`px-5 pb-4 ${isDark ? 'border-t border-white/10' : 'border-t border-gray-200'} pt-4`}>
                            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white border border-gray-100'}`}>
                                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {aiSummary.daily_digest}
                                </p>
                            </div>
                        </div>

                        {/* Critical Alerts */}
                        {aiSummary.critical_alerts && aiSummary.critical_alerts.length > 0 && (
                            <div className="px-5 pb-4">
                                <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    Critical Alerts ({aiSummary.critical_alerts.length})
                                </h3>
                                <div className="space-y-3">
                                    {aiSummary.critical_alerts.map((alert, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className={`p-4 rounded-xl border-l-4 ${alert.impact_level === 'HIGH'
                                                    ? 'border-l-red-500 bg-red-50'
                                                    : alert.impact_level === 'MEDIUM'
                                                        ? 'border-l-yellow-500 bg-yellow-50'
                                                        : 'border-l-green-500 bg-green-50'
                                                } ${isDark ? 'bg-opacity-10' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <h4 className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {alert.title}
                                                    </h4>
                                                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {alert.description}
                                                    </p>
                                                    {alert.action_required && (
                                                        <div className={`flex items-center gap-2 text-xs font-medium ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                                            <Target className="w-3 h-3" />
                                                            {alert.action_required}
                                                        </div>
                                                    )}
                                                    {alert.deadline && (
                                                        <div className={`flex items-center gap-2 text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                                            <Clock className="w-3 h-3" />
                                                            Deadline: {alert.deadline}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${IMPACT_COLORS[alert.impact_level]?.bg || 'bg-gray-100'
                                                    } ${IMPACT_COLORS[alert.impact_level]?.text || 'text-gray-700'}`}>
                                                    {alert.impact_level}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rate Changes */}
                        {aiSummary.rate_changes && aiSummary.rate_changes.length > 0 && (
                            <div className="px-5 pb-4">
                                <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    GST Rate Changes
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {aiSummary.rate_changes.map((change, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'}`}
                                        >
                                            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {change.item}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-red-500 text-xs line-through">{change.old_rate}</span>
                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                                <span className="text-green-500 text-xs font-bold">{change.new_rate}</span>
                                            </div>
                                            {change.effective_date && (
                                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                    Effective: {change.effective_date}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Compliance Reminders */}
                        {aiSummary.compliance_reminders && aiSummary.compliance_reminders.length > 0 && (
                            <div className="px-5 pb-4">
                                <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <Bell className="w-4 h-4" style={{ color: GST_ORANGE }} />
                                    Compliance Reminders
                                </h3>
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                                    <ul className="space-y-2">
                                        {aiSummary.compliance_reminders.map((reminder, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GST_ORANGE }} />
                                                <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {reminder}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* News Summaries - Plain English */}
                        {aiSummary.news_summaries && aiSummary.news_summaries.length > 0 && (
                            <div className="px-5 pb-5">
                                <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                                    News in Plain English
                                </h3>
                                <div className="space-y-3">
                                    {aiSummary.news_summaries.map((summary, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}
                                        >
                                            <h4 className={`font-bold text-sm mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {summary.headline}
                                            </h4>
                                            <p className={`text-xs leading-relaxed mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                💡 <strong>What it means:</strong> {summary.plain_english}
                                            </p>
                                            {summary.action && (
                                                <p className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                                    ➡️ <strong>Action:</strong> {summary.action}
                                                </p>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// =============================================================================
// NEWS CARD COMPONENT
// =============================================================================

const NewsCard = ({ item, index, isDark }) => {
    const sourceStyle = SOURCE_COLORS[item.source_label] || SOURCE_COLORS["News Media"];

    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            const today = new Date();
            const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return "Today";
            if (diffDays === 1) return "Yesterday";
            if (diffDays < 7) return `${diffDays} days ago`;
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ y: -4, scale: 1.01, boxShadow: '0 15px 30px rgba(244, 121, 32, 0.1)' }}
            className={`relative overflow-hidden rounded-xl transition-all duration-300 ${isDark
                    ? 'bg-white/5 border border-white/10 hover:border-orange-500/30'
                    : 'bg-white border border-gray-100 hover:border-orange-300 shadow-sm'
                }`}
            style={{ borderLeftWidth: '3px', borderLeftColor: item.is_high_impact ? '#EF4444' : GST_ORANGE }}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${sourceStyle.bg} ${sourceStyle.text}`}>
                            {item.source_label}
                        </span>
                        {item.is_high_impact && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                                <Zap className="w-3 h-3" /> High Impact
                            </span>
                        )}
                    </div>
                    <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatDate(item.date)}
                    </span>
                </div>

                {/* Title */}
                <h3 className={`font-bold text-sm leading-tight mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.title}
                </h3>

                {/* Summary  */}
                <p className={`text-xs leading-relaxed mb-3 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.summary}
                </p>

                {/* Read More */}
                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold transition-all"
                    style={{ color: GST_ORANGE }}
                >
                    Read Full Article
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </motion.article>
    );
};

// =============================================================================
// FILTER TABS
// =============================================================================

const FilterTabs = ({ activeFilter, setActiveFilter, counts, isDark }) => {
    const filters = [
        { id: "all", label: "All", icon: Newspaper },
        { id: "high_impact", label: "⚡ Important", icon: Zap },
        { id: "News Media", label: "Media", icon: TrendingUp },
        { id: "Official Notification", label: "Official", icon: Building2 },
        { id: "Expert Analysis", label: "Expert", icon: Sparkles },
    ];

    return (
        <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((filter) => {
                const count = filter.id === "all"
                    ? counts.total
                    : filter.id === "high_impact"
                        ? counts.high_impact
                        : counts[filter.id] || 0;

                return (
                    <motion.button
                        key={filter.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === filter.id
                                ? 'text-white shadow-md'
                                : isDark
                                    ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        style={{
                            backgroundColor: activeFilter === filter.id ? GST_ORANGE : undefined,
                        }}
                    >
                        {filter.label}
                        <span className={`px-1 py-0.5 rounded text-[9px] ${activeFilter === filter.id ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-200'
                            }`}>
                            {count}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
};

// =============================================================================
// MAIN GST NEWS COMPONENT
// =============================================================================

export const GSTNews = ({ isDark: propIsDark }) => {
    const [news, setNews] = useState([]);
    const [aiSummary, setAiSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState("all");
    const [lastUpdated, setLastUpdated] = useState(null);

    const isDark = propIsDark !== undefined ? propIsDark : true;

    // Fetch news with AI summary
    const fetchNews = async () => {
        setLoading(true);
        setAiLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/gst-news/ai-summary`);
            const data = await response.json();

            if (data.success) {
                setNews(data.news || []);
                setAiSummary(data.ai_summary);
                setLastUpdated(new Date());
            } else {
                throw new Error(data.error || "Failed to fetch news");
            }
        } catch (err) {
            console.error("GST News fetch error:", err);
            setError(err.message);
            // Fallback to basic news endpoint
            try {
                const fallbackRes = await fetch(`${API_URL}/api/gst-news`);
                const fallbackData = await fallbackRes.json();
                setNews(fallbackData.news || []);
            } catch {
                setNews([]);
            }
        } finally {
            setLoading(false);
            setAiLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    // Filter news
    const filteredNews = activeFilter === "all"
        ? news
        : activeFilter === "high_impact"
            ? news.filter(item => item.is_high_impact)
            : news.filter(item => item.source_label === activeFilter);

    // Counts
    const counts = {
        total: news.length,
        high_impact: news.filter(n => n.is_high_impact).length,
        "News Media": news.filter(n => n.source_label === "News Media").length,
        "Official Notification": news.filter(n => n.source_label === "Official Notification").length,
        "Expert Analysis": news.filter(n => n.source_label === "Expert Analysis").length,
    };

    return (
        <ThemeContext.Provider value={{ isDark }}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: GST_ORANGE }}>
                            <Newspaper className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                GST Intelligence
                            </h1>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                AI-powered news • {news.length} articles • {counts.high_impact} important
                            </p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05, rotate: 180 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={fetchNews}
                        disabled={loading}
                        className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    </motion.button>
                </div>

                {/* AI Summary Section */}
                <AISummarySection aiSummary={aiSummary} loading={aiLoading} isDark={isDark} />

                {/* Filter Tabs */}
                <FilterTabs
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    counts={counts}
                    isDark={isDark}
                />

                {/* Error */}
                {error && !loading && (
                    <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Unable to load news</p>
                        <button onClick={fetchNews} className="mt-2 px-3 py-1 rounded-lg text-xs text-white" style={{ backgroundColor: GST_ORANGE }}>
                            Retry
                        </button>
                    </div>
                )}

                {/* News Grid */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNews.map((item, index) => (
                            <NewsCard key={item.id} item={item} index={index} isDark={isDark} />
                        ))}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className={`rounded-xl p-4 ${isDark ? 'bg-white/5' : 'bg-gray-100'} animate-pulse`}>
                                <div className={`h-4 w-1/3 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'} mb-3`} />
                                <div className={`h-4 w-full rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'} mb-2`} />
                                <div className={`h-4 w-2/3 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'} mb-3`} />
                                <div className={`h-3 w-full rounded ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className={`text-center text-xs py-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    Sources: Google News • Economic Times • Taxscan | AI Summary by Gemini
                </div>
            </div>
        </ThemeContext.Provider>
    );
};

export default GSTNews;
