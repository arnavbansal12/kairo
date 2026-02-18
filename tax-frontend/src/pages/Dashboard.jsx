import { useState, useRef, useEffect, useMemo, useCallback, Component, createContext, useContext } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Upload, Loader2, ShieldCheck, LayoutDashboard, MessageSquare,
  Download, Play, TrendingUp, FileCheck, AlertCircle, CheckCircle2, CheckCircle,
  Sparkles, Zap, BarChart3, ChevronRight, Eye, Shield, X, FileText,
  Search, Filter, Trash2, Edit2, Save, Plus, FileInput, MoreVertical,
  Printer, ArrowUpRight, XCircle, AlertTriangle, Check, PieChart as PieChartIcon,
  DollarSign, Calendar, Users, Package, ArrowUp, ArrowDown, Minus, Clock,
  ChevronsUpDown, CheckSquare, Square, RefreshCw, FileSpreadsheet, Mic, MicOff,
  Bell, BellOff, Volume2, Download as DownloadIcon, MessageCircle, Building2,
  Inbox, Flag, Phone, Send, UserPlus, FolderInput, Mail, FileWarning,
  Sun, Moon, Settings, User, Newspaper
} from 'lucide-react';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RechartsPie, Pie, Cell, Legend, BarChart, Bar, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { ClientSelectorModal, ClientSelectorBar } from '../ClientSelector';
import { ClientProfile } from '../ClientProfile';
import { NotificationCenter } from '../NotificationSystem';
import { BulkLedgerMapper } from '../BulkLedgerMapper';
import { TallySimulation } from '../TallySimulation';
import { VerifyModal } from '../VerifyModal';
import { LegalNotices } from '../LegalNotices';
import { GSTNews } from '../GSTNews';
import { ClientManagement } from '../ClientManagement';
import LoginPage from '../LoginPage';
import { AuthProvider, useAuth } from '../AuthContext';
import CommandPalette from '../CommandPalette';
import { UserProfileDropdown } from '../UserProfileDropdown';
import { SecurityTab, DataPrivacyTab } from '../SettingsTabs';

// ============================================================================
// ANIMATION VARIANTS (CINEMATIC)
// ============================================================================
const pageAnimation = {
  initial: { opacity: 0, x: -20, scale: 0.95, filter: "blur(10px)" },
  animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, x: 20, scale: 1.05, filter: "blur(10px)" },
  transition: { type: "spring", stiffness: 200, damping: 25 }
};

// ============================================================================
// CONFIGURATION & UTILITIES
// ============================================================================

const API_URL = "http://127.0.0.1:8000";

const HeroIntro = ({ onComplete }) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      onAnimationComplete={onComplete}
    >
      <div className="relative z-10 text-center">
        <motion.div
          initial={{ scale: 3, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className="mb-8"
        >
          <div className="w-32 h-32 mx-auto bg-gradient-to-tr from-purple-600 to-cyan-400 rounded-3xl rotate-45 flex items-center justify-center shadow-[0_0_100px_rgba(139,92,246,0.5)]">
            <div className="w-24 h-24 bg-black rounded-2xl flex items-center justify-center">
              <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">K</span>
            </div>
          </div>
        </motion.div>

        <motion.h1
          className="text-6xl font-bold text-white mb-4 tracking-tighter"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          KAIRO
        </motion.h1>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ delay: 0.8, duration: 1 }}
          className="h-1 bg-gradient-to-r from-purple-600 to-cyan-400 mx-auto rounded-full mb-4"
        />

        <motion.p
          className="text-gray-400 tracking-[0.2em] text-sm uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Autonomous Financial Intelligence
        </motion.p>
      </div>

      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]"></div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(139,92,246,0.1)_180deg,transparent_360deg)] opacity-30"
      />
    </motion.div>
  );
};

// --- Safe Math Utility ---
const safeFloat = (val) => {
  try {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  } catch (error) {
    return 0;
  }
};

// --- Parse Invoice from JSON Data ---
const parseInvoice = (invoice) => {
  if (!invoice) return null;

  // If json_data exists, parse it and merge with top-level fields
  let parsed = { ...invoice };

  if (invoice.json_data) {
    try {
      const jsonData = typeof invoice.json_data === 'string'
        ? JSON.parse(invoice.json_data)
        : invoice.json_data;
      parsed = { ...parsed, ...jsonData };
    } catch (e) {
      console.error('Failed to parse json_data:', e);
    }
  }

  return parsed;
};

// --- Error Boundary ---
class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className={`flex items-center justify-center h-full ${isDark ? 'text-gray-500' : 'text-gray-700'} ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-2xl`}>
        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
        <span className="text-xs">Visualization Unavailable</span>
      </div>
    );
    return this.props.children;
  }
}

// ============================================================================
// VISUAL COMPONENTS (LEONARDO DESIGN SYSTEM)
// ============================================================================

const FloatingParticles = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    {[...Array(25)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-leo-cyan/40 rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -100, 0],
          opacity: [0, 0.5, 0],
          scale: [0, 1.5, 0],
        }}
        transition={{
          duration: Math.random() * 10 + 10,
          repeat: Infinity,
          ease: "linear",
          delay: Math.random() * 5,
        }}
      />
    ))}
  </div>
);

const MeshBackground = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);

  return (
    <div className="fixed inset-0 -z-10 bg-leo-void">
      {/* Deep Space Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-leo-primary/10 via-leo-void to-black" />

      {/* Animated Orbs */}
      <motion.div style={{ y: y1, opacity: 0.4 }} className="absolute -top-[10%] -right-[10%] w-[80vw] h-[80vw] bg-leo-primary/20 rounded-full blur-[120px]" />
      <motion.div style={{ y: y2, opacity: 0.3 }} className="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-leo-indigo/20 rounded-full blur-[100px]" />

      {/* Noise Texture for Realism */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>

      <FloatingParticles />
    </div>
  );
};

// --- THEME CONTEXT ---
const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

const GlassCard = ({ children, className = "", hover = true }) => {
  const { isDark } = useTheme();
  return (
    <motion.div
      whileHover={hover ? {
        y: -8,
        scale: 1.02,
        boxShadow: isDark
          ? '0 25px 50px -12px rgba(139, 92, 246, 0.25)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        transition: { type: 'spring', stiffness: 400, damping: 25 }
      } : {}}
      className={`relative overflow-hidden transition-all duration-500 ${isDark
        ? 'bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(103,58,183,0.2)] hover:border-leo-primary/30'
        : 'bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg'
        } ${className}`}
    >
      {children}
    </motion.div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    "Verified": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Invalid GST": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "DUPLICATE BILL": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "Correct": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Error": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "Manual": "bg-gray-500/10 text-gray-400 border-gray-500/20",
    "Calculated": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
  };

  // Fallback for math errors specifically
  let displayStatus = status;
  let styleKey = status;

  if (status && status.includes("Error")) {
    styleKey = "Error";
    displayStatus = "Math Error";
  }

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${styles[styleKey] || styles["Manual"]}`}>
      {displayStatus}
    </span>
  );
};

// --- Document Type Badge (Color-coded) ---
const DocTypeBadge = ({ type }) => {
  const styles = {
    'gst_invoice': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'GST Invoice' },
    'receipt': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', label: 'Receipt' },
    'bank_statement': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Bank Stmt' },
    'payment_screenshot': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', label: 'Payment' },
    'expense_bill': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', label: 'Expense' },
    'credit_note': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Credit Note' },
  };

  const style = styles[type] || styles['gst_invoice'];

  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
};

// --- Flag Button for Clarification (WhatsApp Integration) ---
const FlagButton = ({ invoice, client, onFlag }) => {
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState('');

  const handleWhatsApp = () => {
    const phone = client?.phone || '919999999999';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hello! Regarding invoice #${invoice?.invoice_no || 'N/A'} for ₹${invoice?.grand_total || 0}:\n\n${note || 'Please clarify this bill.'}\n\nThank you!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');

    // Log the flag action
    fetch(`${API_URL}/documents/${invoice.id}/add-note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: `[FLAGGED] ${note}`, added_by: 'User' })
    });

    setShowModal(false);
    setNote('');
    if (onFlag) onFlag();
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-1.5 hover:bg-yellow-500/10 rounded-lg transition-colors group"
        title="Flag for Clarification"
      >
        <Flag className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-700'} group-hover:text-yellow-400`} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gray-900 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-2xl p-6 w-full max-w-md shadow-2xl`}
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-yellow-400" />
              Request Clarification
            </h3>

            <div className="space-y-4">
              <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Invoice</p>
                <p className="text-sm font-bold text-white">#{invoice?.invoice_no || 'N/A'}</p>
                <p className="text-sm text-gray-300">₹{invoice?.grand_total?.toLocaleString() || 0}</p>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What do you need clarification on? e.g., 'Need GST number for this bill'"
                className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500`}
                rows={3}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); setNote(''); }}
                  className={`flex-1 px-4 py-2.5 ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl ${isDark ? 'text-gray-400' : 'text-gray-600'} hover:bg-white/10 transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send WhatsApp
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

// --- Triage View (Unassigned Documents "Inbox") ---
const TriageView = ({ clients, onAssign, onRefresh }) => {
  const { isDark } = useTheme();
  const [unassigned, setUnassigned] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [assignClient, setAssignClient] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchUnassigned();
    fetchStats();
  }, []);

  const fetchUnassigned = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/documents/unassigned`);
      const data = await res.json();
      setUnassigned(data);
    } catch (err) {
      console.error('Failed to fetch unassigned:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/triage/stats`);
      setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch triage stats:', err);
    }
  };

  const toggleSelect = (id, source) => {
    const key = `${source}-${id}`;
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedDocs(newSelected);
  };

  const handleBulkAssign = async () => {
    if (!assignClient || selectedDocs.size === 0) return;

    const docIds = Array.from(selectedDocs).map(key => {
      const [source, id] = key.split('-');
      return { id: parseInt(id), source };
    });

    try {
      await fetch(`${API_URL}/documents/bulk-assign?client_id=${assignClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docIds)
      });

      alert(`✅ ${docIds.length} documents assigned to ${assignClient.company_name}!`);
      setSelectedDocs(new Set());
      setShowAssignModal(false);
      fetchUnassigned();
      fetchStats();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('❌ Failed to assign documents');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Inbox className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total_unassigned || 0}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Unassigned</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.uploaded_today || 0}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Today</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.uploaded_this_week || 0}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>This Week</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.older_than_week || 0}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Older (7d+)</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Action Bar */}
      {selectedDocs.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-xl flex items-center justify-between"
        >
          <p className="text-sm text-white">
            <span className="font-bold">{selectedDocs.size}</span> documents selected
          </p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-white text-sm flex items-center gap-2"
          >
            <FolderInput className="w-4 h-4" />
            Assign to Client
          </button>
        </motion.div>
      )}

      {/* Unassigned Documents List */}
      <GlassCard className="overflow-hidden">
        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between`}>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-yellow-400" />
            Triage Area
          </h3>
          <button
            onClick={() => { fetchUnassigned(); fetchStats(); }}
            className={`p-2 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg transition-colors`}
          >
            <RefreshCw className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {unassigned.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold mb-1`}>All Clear!</p>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>No unassigned documents. Great job! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {unassigned.map((doc) => (
              <div
                key={`${doc.source_table}-${doc.id}`}
                className={`p-4 hover:${isDark ? "bg-white/5" : "bg-gray-50"} transition-colors flex items-center gap-4 ${selectedDocs.has(`${doc.source_table}-${doc.id}`) ? 'bg-purple-500/10' : ''
                  }`}
              >
                <button
                  onClick={() => toggleSelect(doc.id, doc.source_table)}
                  className="p-1"
                >
                  {selectedDocs.has(`${doc.source_table}-${doc.id}`) ? (
                    <CheckSquare className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Square className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-700'}`} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                      {doc.vendor_name || 'Unknown Vendor'}
                    </p>
                    <DocTypeBadge type={doc.doc_type || 'gst_invoice'} />
                  </div>
                  <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>#{doc.invoice_no || 'N/A'}</span>
                    <span>•</span>
                    <span>₹{safeFloat(doc.grand_total).toLocaleString()}</span>
                    <span>•</span>
                    <span>{doc.invoice_date || doc.upload_date || 'No date'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedDocs(new Set([`${doc.source_table}-${doc.id}`]));
                    setShowAssignModal(true);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Assign to Client"
                >
                  <FolderInput className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'} hover:text-purple-400`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gray-900 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-2xl p-6 w-full max-w-md shadow-2xl`}
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <FolderInput className="w-5 h-5 text-purple-400" />
              Assign to Client
            </h3>

            <div className="space-y-4">
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Assigning <span className="font-bold text-white">{selectedDocs.size}</span> document(s)
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => setAssignClient(client)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${assignClient?.id === client.id
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <p className="text-sm font-bold text-white">{client.company_name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{client.gstin || 'No GSTIN'}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAssignModal(false); setAssignClient(null); }}
                  className={`flex-1 px-4 py-2.5 ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={!assignClient}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-bold"
                >
                  Assign
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS (TABS)
// ============================================================================

// --- 1. ENHANCED DASHBOARD COMPONENT - CA FOCUSED & BEAUTIFUL ---
const DashboardView = ({ data = [], selectedClient = null, onSelectClient = null }) => {
  const { isDark } = useTheme();
  const [animatedValues, setAnimatedValues] = useState({});

  // Parse all invoices to extract json_data
  const parsedData = useMemo(() => (data || []).map(parseInvoice), [data]);

  // Filter by selected client if any
  const clientFilteredData = useMemo(() => {
    if (!selectedClient) return parsedData;
    return parsedData.filter(d => d && d.client_id === selectedClient.id);
  }, [parsedData, selectedClient]);

  // Enhanced Calculations
  const uniqueData = useMemo(() => clientFilteredData.filter(d => d && d.gst_status !== "DUPLICATE BILL"), [clientFilteredData]);

  const stats = useMemo(() => {
    let totalPurchases = 0, cgst = 0, sgst = 0, igst = 0, paidCount = 0, unpaidAmount = 0, paidAmount = 0;

    uniqueData.forEach(d => {
      if (!d) return;
      const amount = safeFloat(d.grand_total);
      totalPurchases += amount;
      cgst += safeFloat(d.cgst_amount);
      sgst += safeFloat(d.sgst_amount);
      igst += safeFloat(d.igst_amount);

      if (d.payment_status === "Paid") {
        paidCount++;
        paidAmount += amount;
      } else {
        unpaidAmount += amount;
      }
    });

    const totalTax = cgst + sgst + igst;
    const itcAvailable = totalTax; // ITC = Input tax paid on purchases

    return {
      totalPurchases,
      cgst,
      sgst,
      igst,
      totalTax,
      itcAvailable,
      paidCount,
      unpaidCount: uniqueData.length - paidCount,
      paidAmount,
      unpaidAmount,
      paidPercent: uniqueData.length > 0 ? Math.round((paidCount / uniqueData.length) * 100) : 0,
      totalInvoices: uniqueData.length
    };
  }, [uniqueData]);

  // Animated counter effect
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedValues({
        totalPurchases: Math.round(stats.totalPurchases * easeOut),
        totalTax: Math.round(stats.totalTax * easeOut),
        itcAvailable: Math.round(stats.itcAvailable * easeOut),
        unpaidCount: Math.round(stats.unpaidCount * easeOut),
        paidPercent: Math.round(stats.paidPercent * easeOut)
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [stats]);

  // GST Due Dates
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const gstr1Due = new Date(currentYear, currentMonth + 1, 11); // 11th of next month
  const gstr3bDue = new Date(currentYear, currentMonth + 1, 20); // 20th of next month

  const daysToGstr1 = Math.ceil((gstr1Due - today) / (1000 * 60 * 60 * 24));
  const daysToGstr3b = Math.ceil((gstr3bDue - today) / (1000 * 60 * 60 * 24));

  // Format currency
  const formatCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
    return `₹${val.toFixed(0)}`;
  };

  // Chart colors - Beautiful gradient palette
  const COLORS = {
    cgst: '#8B5CF6',
    sgst: '#06B6D4',
    igst: '#F59E0B',
    paid: '#10B981',
    unpaid: '#EF4444'
  };

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-[60vh] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className={`w-28 h-28 rounded-3xl flex items-center justify-center mb-6 ${isDark ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10' : 'bg-gradient-to-br from-blue-100 to-purple-100 border border-gray-200'}`}
        >
          <BarChart3 className={`w-12 h-12 ${isDark ? 'text-purple-400' : 'text-blue-500'}`} />
        </motion.div>
        <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ready to Analyze</h3>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Upload invoices to see your GST dashboard come alive.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Client Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-2xl flex items-center justify-between ${isDark ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-blue-100'}`}>
            <Building2 className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Showing data for</p>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedClient ? selectedClient.company_name : 'All Clients'}
            </h2>
          </div>
        </div>
        {onSelectClient && (
          <button
            onClick={onSelectClient}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}
          >
            {selectedClient ? 'Change Client' : 'Select Client'}
          </button>
        )}
      </motion.div>

      {/* KPI CARDS - Beautiful Animated */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Total Purchases",
            value: formatCurrency(animatedValues.totalPurchases || 0),
            icon: DollarSign,
            gradient: isDark ? 'from-emerald-500/20 to-teal-500/20' : 'from-emerald-50 to-teal-50',
            iconBg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
            iconColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
            sub: `${stats.totalInvoices} invoices`
          },
          {
            label: "Tax Liability",
            value: formatCurrency(animatedValues.totalTax || 0),
            icon: FileText,
            gradient: isDark ? 'from-purple-500/20 to-indigo-500/20' : 'from-purple-50 to-indigo-50',
            iconBg: isDark ? 'bg-purple-500/20' : 'bg-purple-100',
            iconColor: isDark ? 'text-purple-400' : 'text-purple-600',
            sub: 'CGST + SGST + IGST'
          },
          {
            label: "ITC Available",
            value: formatCurrency(animatedValues.itcAvailable || 0),
            icon: TrendingUp,
            gradient: isDark ? 'from-cyan-500/20 to-blue-500/20' : 'from-cyan-50 to-blue-50',
            iconBg: isDark ? 'bg-cyan-500/20' : 'bg-cyan-100',
            iconColor: isDark ? 'text-cyan-400' : 'text-cyan-600',
            sub: 'Input Tax Credit',
            highlight: true
          },
          {
            label: "Pending Payments",
            value: animatedValues.unpaidCount || 0,
            icon: AlertCircle,
            gradient: stats.unpaidCount > 0
              ? (isDark ? 'from-red-500/20 to-orange-500/20' : 'from-red-50 to-orange-50')
              : (isDark ? 'from-green-500/20 to-emerald-500/20' : 'from-green-50 to-emerald-50'),
            iconBg: stats.unpaidCount > 0 ? (isDark ? 'bg-red-500/20' : 'bg-red-100') : (isDark ? 'bg-green-500/20' : 'bg-green-100'),
            iconColor: stats.unpaidCount > 0 ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-green-400' : 'text-green-600'),
            sub: stats.unpaidCount > 0 ? formatCurrency(stats.unpaidAmount) + ' unpaid' : 'All paid! 🎉'
          }
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
            whileHover={{
              scale: 1.03,
              y: -5,
              transition: { duration: 0.2 }
            }}
            className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer border backdrop-blur-xl ${isDark
              ? `bg-gradient-to-br ${card.gradient} border-white/10`
              : `bg-gradient-to-br ${card.gradient} border-gray-100 shadow-lg shadow-gray-200/50`
              }`}
          >
            {/* Animated glow effect */}
            <motion.div
              className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30 ${isDark ? 'bg-purple-500' : 'bg-blue-400'
                }`}
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${card.iconBg}`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                {card.highlight && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                    Claimable
                  </span>
                )}
              </div>

              <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {card.label}
              </p>
              <p className={`text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {card.value}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {card.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* GST Breakdown Donut - Beautiful */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>GST Breakdown</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tax distribution by type</p>
              </div>
              <div className={`px-3 py-1.5 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                <span className={`text-sm font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                  {formatCurrency(stats.totalTax)}
                </span>
              </div>
            </div>

            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <Pie
                    data={[
                      { name: 'CGST', value: stats.cgst, color: COLORS.cgst },
                      { name: 'SGST', value: stats.sgst, color: COLORS.sgst },
                      { name: 'IGST', value: stats.igst, color: COLORS.igst }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={300}
                    animationDuration={1000}
                  >
                    {[
                      { name: 'CGST', value: stats.cgst, color: COLORS.cgst },
                      { name: 'SGST', value: stats.sgst, color: COLORS.sgst },
                      { name: 'IGST', value: stats.igst, color: COLORS.igst }
                    ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} filter="url(#glow)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f0f15' : '#ffffff',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{value}</span>}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </ChartErrorBoundary>

            {/* Legend Cards */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'CGST', value: stats.cgst, color: COLORS.cgst },
                { label: 'SGST', value: stats.sgst, color: COLORS.sgst },
                { label: 'IGST', value: stats.igst, color: COLORS.igst }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className={`p-3 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                >
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }} />
                  <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(item.value)}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Status Ring - Beautiful */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Payment Status</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Paid vs Unpaid invoices</p>
              </div>
              <div className={`px-3 py-1.5 rounded-xl ${stats.paidPercent >= 80 ? (isDark ? 'bg-green-500/20' : 'bg-green-100') : (isDark ? 'bg-yellow-500/20' : 'bg-yellow-100')}`}>
                <span className={`text-sm font-bold ${stats.paidPercent >= 80 ? (isDark ? 'text-green-300' : 'text-green-700') : (isDark ? 'text-yellow-300' : 'text-yellow-700')}`}>
                  {animatedValues.paidPercent || 0}% Paid
                </span>
              </div>
            </div>

            <ChartErrorBoundary>
              <div className="relative">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'Paid', value: stats.paidCount, color: COLORS.paid },
                        { name: 'Unpaid', value: stats.unpaidCount, color: COLORS.unpaid }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={400}
                      animationDuration={1200}
                    >
                      <Cell fill={COLORS.paid} />
                      <Cell fill={COLORS.unpaid} />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#0f0f15' : '#ffffff',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                        borderRadius: '12px'
                      }}
                      formatter={(value, name) => [`${value} invoices`, name]}
                    />
                  </RechartsPie>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <motion.p
                      className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, type: 'spring' }}
                    >
                      {animatedValues.paidPercent || 0}%
                    </motion.p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Paid</p>
                  </div>
                </div>
              </div>
            </ChartErrorBoundary>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <motion.div
                whileHover={{ scale: 1.03 }}
                className={`p-4 rounded-xl ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>Paid</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.paidCount}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatCurrency(stats.paidAmount)}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.03 }}
                className={`p-4 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>Unpaid</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.unpaidCount}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatCurrency(stats.unpaidAmount)}</p>
              </motion.div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* FILING DEADLINES & QUICK ACTIONS */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
      >
        <GlassCard className="p-6">
          <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📅 Upcoming GST Deadlines
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GSTR-1 */}
            <motion.div
              whileHover={{ scale: 1.02, y: -3 }}
              className={`p-5 rounded-2xl border ${daysToGstr1 <= 3
                ? (isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
                : daysToGstr1 <= 7
                  ? (isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200')
                  : (isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>GSTR-1</span>
                <span className={`text-xs px-2 py-1 rounded-full ${daysToGstr1 <= 3
                  ? 'bg-red-500/20 text-red-400'
                  : daysToGstr1 <= 7
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                  }`}>
                  {daysToGstr1 <= 0 ? 'OVERDUE!' : `${daysToGstr1} days left`}
                </span>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Due: {gstr1Due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Sales Return for {today.toLocaleDateString('en-IN', { month: 'long' })}
              </p>
            </motion.div>

            {/* GSTR-3B */}
            <motion.div
              whileHover={{ scale: 1.02, y: -3 }}
              className={`p-5 rounded-2xl border ${daysToGstr3b <= 3
                ? (isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
                : daysToGstr3b <= 7
                  ? (isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200')
                  : (isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>GSTR-3B</span>
                <span className={`text-xs px-2 py-1 rounded-full ${daysToGstr3b <= 3
                  ? 'bg-red-500/20 text-red-400'
                  : daysToGstr3b <= 7
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                  }`}>
                  {daysToGstr3b <= 0 ? 'OVERDUE!' : `${daysToGstr3b} days left`}
                </span>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Due: {gstr3bDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Summary Return with Tax Payment
              </p>
            </motion.div>

            {/* Quick Export */}
            <motion.div
              whileHover={{ scale: 1.02, y: -3 }}
              className={`p-5 rounded-2xl border cursor-pointer ${isDark ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 hover:border-purple-400'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <Download className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Export</span>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Export data for Tally
              </p>
              <p className={`text-xs mt-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                → Click to download XML
              </p>
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}







































// --- 2. UPLOAD CENTER COMPONENT - ENHANCED QUEUE ---
const UploadView = ({
  onUploadSuccess,
  selectedClient,
  clients,
  // External state for persistence across tab switches
  uploadQueue: fileQueue = [],
  setUploadQueue: setFileQueue = () => { },
  isUploading: uploading = false,
  setIsUploading: setUploading = () => { }
}) => {
  const { isDark } = useTheme();

  // Status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  const [completedCount, setCompletedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);


  const handleFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        error: null,
        result: null
      }));
      setFileQueue(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        error: null,
        result: null
      }));
      setFileQueue(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeFile = (id) => {
    setFileQueue(prev => prev.filter(f => f.id !== id));
  };

  const updateFileStatus = (id, updates) => {
    setFileQueue(prev => prev.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const processQueue = async () => {
    const pendingFiles = fileQueue.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setCompletedCount(0);
    setTotalToProcess(pendingFiles.length);

    // Helper function to upload with retry
    const uploadWithRetry = async (fileItem, retries = 1) => {
      const formData = new FormData();
      formData.append('file', fileItem.file);
      if (selectedClient?.id) {
        formData.append('client_id', selectedClient.id);
      }

      try {
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();

        if (data.error) {
          // If parse error and we have retries left, try again
          if (retries > 0 && (data.error.includes('parse') || data.error.includes('Invalid'))) {
            console.log(`Retrying upload for ${fileItem.name}...`);
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
            return uploadWithRetry(fileItem, retries - 1);
          }
          return { success: false, error: data.error };
        }
        return { success: true, data };
      } catch (err) {
        if (retries > 0) {
          console.log(`Network error, retrying ${fileItem.name}...`);
          await new Promise(r => setTimeout(r, 500));
          return uploadWithRetry(fileItem, retries - 1);
        }
        return { success: false, error: err.message };
      }
    };

    for (const fileItem of pendingFiles) {
      // Update status to uploading
      updateFileStatus(fileItem.id, { status: 'uploading', progress: 10 });

      // Update to processing
      updateFileStatus(fileItem.id, { status: 'processing', progress: 50 });

      const result = await uploadWithRetry(fileItem);

      if (!result.success) {
        updateFileStatus(fileItem.id, { status: 'error', error: result.error, progress: 100 });
      } else {
        // Mark as completed
        updateFileStatus(fileItem.id, { status: 'completed', progress: 100, result: result.data });
        onUploadSuccess(result.data);
        setCompletedCount(prev => prev + 1);

        // Remove from queue after animation (1.5s delay)
        setTimeout(() => {
          removeFile(fileItem.id);
        }, 1500);
      }
    }

    setUploading(false);
  };


  const clearAllCompleted = () => {
    setFileQueue(prev => prev.filter(f => f.status !== 'completed'));
  };

  const retryFailed = () => {
    setFileQueue(prev => prev.map(f =>
      f.status === 'error' ? { ...f, status: 'pending', error: null, progress: 0 } : f
    ));
  };

  const pendingFiles = fileQueue.filter(f => f.status === 'pending');
  const processingFiles = fileQueue.filter(f => ['uploading', 'processing'].includes(f.status));
  const completedFiles = fileQueue.filter(f => f.status === 'completed');
  const errorFiles = fileQueue.filter(f => f.status === 'error');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'uploading': return <Upload className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-500/20 border-gray-500/30';
      case 'uploading': return 'bg-blue-500/20 border-blue-500/30';
      case 'processing': return 'bg-purple-500/20 border-purple-500/30 animate-pulse';
      case 'completed': return 'bg-emerald-500/20 border-emerald-500/30';
      case 'error': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-white/5 border-white/10';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
      {/* DROP ZONE */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center relative group
          ${dragOver
            ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
            : isDark
              ? 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/50'
              : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
          }`}
      >
        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.webp" />

        <motion.div
          animate={{ scale: dragOver ? 1.2 : 1, rotate: dragOver ? 10 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500"
        >
          <Upload className={`w-10 h-10 ${dragOver ? 'text-purple-300' : 'text-purple-400'}`} />
        </motion.div>
        <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
          {dragOver ? 'Drop files here!' : 'Upload Invoices'}
        </h3>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>PDF, JPG, PNG, WebP supported</p>

        {/* Animated Particles */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <motion.div
            animate={{
              scale: dragOver ? 1.5 : 1,
              opacity: dragOver ? 0.3 : 0.1
            }}
            className="absolute top-1/2 left-1/2 w-[200px] h-[200px] bg-purple-500 blur-[50px] -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        {/* Stats Badge */}
        {fileQueue.length > 0 && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute top-4 right-4 bg-purple-500 text-white text-sm font-bold px-3 py-1 rounded-full"
          >
            {fileQueue.length} files
          </motion.div>
        )}
      </div>

      {/* QUEUE & STATUS */}
      <GlassCard className="flex flex-col p-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Processing Queue</h3>
          <div className="flex gap-2">
            {completedFiles.length > 0 && (
              <button onClick={clearAllCompleted} className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500/30 transition-colors">
                Clear {completedFiles.length} completed
              </button>
            )}
            {errorFiles.length > 0 && (
              <button onClick={retryFailed} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/30 transition-colors">
                Retry {errorFiles.length} failed
              </button>
            )}
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex gap-4 mb-4 text-xs">
          <span className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" /> {pendingFiles.length} pending
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <Loader2 className="w-3 h-3" /> {processingFiles.length} processing
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle className="w-3 h-3" /> {completedFiles.length} done
          </span>
          {errorFiles.length > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3 h-3" /> {errorFiles.length} failed
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {fileQueue.length === 0 && !uploading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <FileText className="w-12 h-12 mb-3 opacity-20" />
              <p>No files in queue</p>
              <p className="text-xs mt-1">Drag & drop or click to add files</p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {fileQueue.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 50, scale: 0.8 }}
                animate={{
                  opacity: item.status === 'completed' ? 0.7 : 1,
                  x: 0,
                  scale: 1,
                  y: item.status === 'completed' ? -5 : 0
                }}
                exit={{ opacity: 0, x: -100, scale: 0.5, transition: { duration: 0.3 } }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`p-3 rounded-xl border ${getStatusColor(item.status)} relative overflow-hidden`}
              >
                {/* Progress Bar Background */}
                {item.status !== 'pending' && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    className={`absolute inset-0 ${item.status === 'completed' ? 'bg-emerald-500/10' :
                      item.status === 'error' ? 'bg-red-500/10' :
                        'bg-purple-500/10'
                      }`}
                  />
                )}

                <div className="relative flex items-center gap-3">
                  {/* Status Icon */}
                  <div className={`p-2 rounded-lg ${item.status === 'completed' ? 'bg-emerald-500/20' :
                    item.status === 'error' ? 'bg-red-500/20' :
                      item.status === 'processing' ? 'bg-purple-500/20' :
                        'bg-blue-500/10'
                    }`}>
                    {getStatusIcon(item.status)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.size)}
                      {item.status === 'processing' && ' • AI Extracting...'}
                      {item.status === 'completed' && ' • ✓ Complete'}
                      {item.status === 'error' && ` • ${item.error}`}
                    </p>
                  </div>

                  {/* Actions */}
                  {item.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-700'} hover:text-red-400`} />
                    </button>
                  )}

                  {item.status === 'completed' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-6 space-y-4">
          {/* Overall Progress */}
          {uploading && totalToProcess > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Processing {completedCount + processingFiles.length} of {totalToProcess}</span>
                <span>{Math.round((completedCount / totalToProcess) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / totalToProcess) * 100}%` }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={processQueue}
            disabled={uploading || pendingFiles.length === 0}
            className="w-full py-4 bg-leo-gradient rounded-xl font-bold text-white shadow-lg shadow-leo-primary/20 hover:shadow-leo-primary/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing {pendingFiles.length + processingFiles.length} files...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                Start Audit Engine ({pendingFiles.length} files)
              </>
            )}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};


// --- 3. INVOICE REGISTER - EXCEL/TALLY POWERHOUSE ---
const InvoiceRegister = ({ data, setData }) => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [pdfView, setPdfView] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showTallySimulation, setShowTallySimulation] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [columnVisibility, setColumnVisibility] = useState({
    vendor_name: true,
    invoice_no: true,
    invoice_date: true,
    taxable_value: true,
    tax_amount: true,
    grand_total: true,
    gst_no: true,
    payment_status: true,
    hsn_code: true,
    ledger_name: true,
    group_name: true,
    // NEW GST Columns for Tally compliance
    vendor_state: true,      // Vendor state from GSTIN
    gst_type: true,          // CGST+SGST or IGST
    tax_rate: true,          // GST percentage (5/12/18/28)
    place_of_supply: false   // Hidden by default (same as vendor_state usually)
  });

  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, unpaid
  const [filterGST, setFilterGST] = useState('all'); // all, verified, invalid

  // 🆕 V2.0: Client & Document Management
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('gst_invoice');
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  // Enhanced Filter & Sort Logic
  const processedData = useMemo(() => {
    let result = [...data];

    // Text search
    if (search) {
      result = result.filter(item =>
        item.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
        item.gst_no?.toLowerCase().includes(search.toLowerCase()) ||
        String(item.grand_total).includes(search)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(item => item.payment_status?.toLowerCase() === filterStatus);
    }

    // GST filter
    if (filterGST !== 'all') {
      result = result.filter(item => {
        if (filterGST === 'verified') return item.gst_status === 'Verified';
        if (filterGST === 'invalid') return item.gst_status === 'Invalid GST';
        return true;
      });
    }

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle numeric fields
        if (['grand_total', 'taxable_value', 'igst_amount', 'cgst_amount', 'sgst_amount'].includes(sortConfig.key)) {
          aVal = safeFloat(aVal);
          bVal = safeFloat(bVal);
        }

        // Handle dates
        if (sortConfig.key === 'invoice_date') {
          aVal = new Date(aVal || '1970-01-01');
          bVal = new Date(bVal || '1970-01-01');
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, sortConfig, filterStatus, filterGST]);

  // --- CRUD OPERATIONS ---
  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    // 1. Optimistic Update
    const newData = data.map(d => d.id === editingId ? { ...editForm, math_status: 'Calculated' } : d);
    setData(newData);
    setEditingId(null);

    // 2. API Call
    try {
      await fetch(`${API_URL}/invoice/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
    } catch (err) {
      console.error("Save failed", err);
      // Revert if needed (omitted for brevity)
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this invoice record?")) return;

    // 1. Optimistic Delete
    setData(data.filter(d => d.id !== id));

    // 2. API Call
    try {
      await fetch(`${API_URL}/invoice/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // FLAG & ASK - Context-aware WhatsApp messaging
  const handleFlagAndAsk = (invoice) => {
    // Get client phone from the selected client
    const clientPhone = selectedClient?.phone || '';

    // Format the phone number (remove +91, spaces, etc.)
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const whatsappPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    // Format amount
    const amount = invoice.grand_total ? `₹${Number(invoice.grand_total).toLocaleString('en-IN')}` : 'N/A';

    // Format date
    const date = invoice.invoice_date || 'N/A';

    // Build the context message
    const message = `Hi Sir! 🙏

            Regarding Bill #${invoice.invoice_no || 'N/A'} for ${amount} dated ${date} from ${invoice.vendor_name || 'Unknown Vendor'}:

            Could you please clarify what this expense was for?

            📋 Details needed:
            • Purpose of expense
            • Project/Client (if any)
            • Expense Category

            Thank you!
            - KAIRO Pro`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp with pre-filled message
    if (clientPhone) {
      window.open(`https://wa.me/${whatsappPhone}?text=${encodedMessage}`, '_blank');
    } else {
      // If no phone number, show clipboard option
      navigator.clipboard.writeText(message);
      alert('📋 Message copied to clipboard!\n\nNo phone number found for this client. Please add a phone number in Client Profile or paste the message manually.');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    // Basic validation
    payload.grand_total = parseFloat(payload.grand_total);
    payload.taxable_value = parseFloat(payload.taxable_value);

    try {
      const res = await fetch(`${API_URL}/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newItem = await res.json();
      setData(prev => [newItem, ...prev]);
      setIsManualModalOpen(false);
    } catch (err) {
      console.error("Manual Entry Failed", err);
    }
  };

  const handleExportTally = async () => {
    // Open the Tally Simulation modal instead of direct export
    // This allows proper validation and error handling
    setShowTallySimulation(true);
  };

  // Bulk Actions
  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(processedData.map(item => item.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedRows.size} selected invoices?`)) return;

    const idsToDelete = Array.from(selectedRows);
    setData(data.filter(d => !idsToDelete.includes(d.id)));

    for (const id of idsToDelete) {
      try {
        await fetch(`${API_URL}/invoice/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error(`Failed to delete ${id}`, err);
      }
    }
    setSelectedRows(new Set());
  };

  const handleBulkExport = () => {
    const selectedData = processedData.filter(item => selectedRows.has(item.id));
    const csv = [
      ['Invoice No', 'Date', 'Vendor', 'GSTIN', 'Taxable', 'Tax', 'Total', 'Status'],
      ...selectedData.map(item => [
        item.invoice_no,
        item.invoice_date,
        item.vendor_name,
        item.gst_no,
        safeFloat(item.taxable_value),
        safeFloat(item.igst_amount) + safeFloat(item.cgst_amount) + safeFloat(item.sgst_amount),
        safeFloat(item.grand_total),
        item.payment_status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_export_${Date.now()}.csv`;
    a.click();
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- RENDER HELPERS ---
  const InputCell = ({ field, type = "text" }) => (
    <input
      type={type}
      value={editForm[field] || ''}
      onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
      className="w-full bg-black/50 border border-purple-500/50 rounded px-2 py-1 text-white text-xs focus:outline-none"
    />
  );

  const SortableHeader = ({ label, sortKey }) => (
    <th
      onClick={() => handleSort(sortKey)}
      className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} cursor-pointer hover:bg-white/5 transition-colors group`}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <ChevronsUpDown className="w-3 h-3 text-gray-600 group-hover:text-purple-400" />
        {sortConfig.key === sortKey && (
          <span className="text-purple-400 text-xs">
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <div className="h-full flex flex-col relative">
      {/* ENHANCED TOOLBAR */}
      <GlassCard className="p-4 mb-4 space-y-3">
        {/* Row 1: Search & Primary Actions */}
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-700'}`} />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-leo-void/50 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl ${isDark ? 'text-white' : 'text-gray-900'} focus:border-leo-accent outline-none`}
              />
            </div>

            {/* Filter Dropdowns */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`bg-black/20 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500`}
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <select
              value={filterGST}
              onChange={(e) => setFilterGST(e.target.value)}
              className={`bg-black/20 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500`}
            >
              <option value="all">All GST</option>
              <option value="verified">Verified</option>
              <option value="invalid">Invalid</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setIsManualModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add
            </button>
            <button onClick={handleExportTally} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors">
              <FileText className="w-4 h-4" /> Tally
            </button>
          </div>
        </div>

        {/* Row 2: Bulk Actions & Stats */}
        {selectedRows.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-purple-900/20 border border-purple-500/30 rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{selectedRows.size} Selected</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3 h-3" /> Export CSV
              </button>
            </div>
            <button
              onClick={() => setSelectedRows(new Set())}
              className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} hover:text-white transition-colors`}
            >
              Clear Selection
            </button>
          </motion.div>
        )}

        {/* Row 3: Info Bar */}
        <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>
          <span>Showing {processedData.length} of {data.length} invoices</span>
          <div className="flex gap-4">
            <span>Total: ₹{(processedData.reduce((sum, item) => sum + safeFloat(item.grand_total), 0) / 100000).toFixed(2)}L</span>
            <span className="text-green-400">Paid: {processedData.filter(i => i.payment_status === 'Paid').length}</span>
            <span className="text-red-400">Unpaid: {processedData.filter(i => i.payment_status === 'Unpaid').length}</span>
          </div>
        </div>
      </GlassCard>

      {/* ENHANCED DATA GRID */}
      <GlassCard className="flex-1 overflow-hidden flex flex-col relative">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className={`${isDark ? 'bg-black/40 text-gray-400' : 'bg-slate-50 text-slate-500'} text-xs font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md`}>
              <tr>
                <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <button onClick={toggleAllRows} className="hover:text-purple-400 transition-colors">
                    {selectedRows.size === processedData.length && processedData.length > 0 ?
                      <CheckSquare className="w-4 h-4" /> :
                      <Square className="w-4 h-4" />
                    }
                  </button>
                </th>
                <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>Action</th>
                <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>Status</th>
                <SortableHeader label="Vendor" sortKey="vendor_name" />
                <SortableHeader label="Inv No" sortKey="invoice_no" />
                <SortableHeader label="Date" sortKey="invoice_date" />
                {columnVisibility.hsn_code && <SortableHeader label="HSN" sortKey="hsn_code" />}
                {columnVisibility.ledger_name && <SortableHeader label="Ledger" sortKey="ledger_name" />}
                {columnVisibility.group_name && <SortableHeader label="Group" sortKey="group_name" />}
                {columnVisibility.taxable_value && <SortableHeader label="Taxable" sortKey="taxable_value" />}
                {columnVisibility.tax_amount && <th className={`p-4 border-b text-right ${isDark ? 'border-white/10' : 'border-slate-200'}`}>Tax</th>}
                {columnVisibility.grand_total && <SortableHeader label="Total" sortKey="grand_total" />}
                {/* NEW GST Columns for Tally Compliance */}
                {columnVisibility.vendor_state && <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>State</th>}
                {columnVisibility.gst_type && <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>GST Type</th>}
                {columnVisibility.tax_rate && <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>Rate</th>}
                {columnVisibility.gst_no && <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>GSTIN</th>}
                {columnVisibility.payment_status && <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>Payment</th>}
                <th className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>View</th>

              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isDark ? 'divide-white/5 text-gray-300' : 'divide-slate-100 text-slate-600'}`}>
              {processedData.map((item) => (
                <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} ${editingId === item.id ? (isDark ? 'bg-purple-900/10' : 'bg-purple-50') : ''} ${selectedRows.has(item.id) ? (isDark ? 'bg-blue-900/10' : 'bg-blue-50') : ''}`}>
                  <td className="p-4">
                    <button
                      onClick={() => toggleRowSelection(item.id)}
                      className="hover:text-purple-400 transition-colors"
                    >
                      {selectedRows.has(item.id) ?
                        <CheckSquare className="w-4 h-4 text-purple-400" /> :
                        <Square className="w-4 h-4" />
                      }
                    </button>
                  </td>

                  <td className="p-4">
                    {editingId === item.id ? (
                      <div className="flex gap-2">
                        <button onClick={handleSave} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className={`p-1.5 bg-gray-500/20 ${isDark ? 'text-gray-400' : 'text-gray-600'} rounded hover:bg-gray-500/30`}><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2 opacity-50 group-hover:opacity-100">
                        <button
                          onClick={() => handleFlagAndAsk(item)}
                          className="p-1.5 hover:text-red-400"
                          title="Ask client about this bill"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(item)} className="p-1.5 hover:text-purple-400"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={item.gst_status} />
                      <StatusBadge status={item.math_status} />
                      {/* Doc Type Badge */}
                      {item.doc_type && item.doc_type !== 'gst_invoice' && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.doc_type === 'receipt' ? 'bg-orange-500/20 text-orange-400' :
                          item.doc_type === 'credit_note' ? 'bg-purple-500/20 text-purple-400' :
                            item.doc_type === 'bank_statement' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                          }`}>
                          {item.doc_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      )}
                      {/* ITC Warning Badge */}
                      {item.claim_itc === false && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          No ITC
                        </span>
                      )}
                      {item.itc_warning && item.claim_itc !== false && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400" title={item.itc_warning}>
                          ⚠️ ITC Risk
                        </span>
                      )}
                    </div>
                  </td>

                  {/* EDITABLE CELLS */}
                  <td className="p-4">{editingId === item.id ? <InputCell field="vendor_name" /> : <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.vendor_name}</span>}</td>
                  <td className="p-4">{editingId === item.id ? <InputCell field="invoice_no" /> : <span className="font-mono text-xs">{item.invoice_no}</span>}</td>
                  <td className="p-4">{editingId === item.id ? <InputCell field="invoice_date" type="date" /> : <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{item.invoice_date}</span>}</td>

                  {columnVisibility.hsn_code && (
                    <td className="p-4 font-mono text-xs">
                      {editingId === item.id ? <InputCell field="hsn_code" placeholder="HSN" /> : (
                        <span className="text-blue-400">{item.hsn_code || '-'}</span>
                      )}
                    </td>
                  )}

                  {columnVisibility.ledger_name && (
                    <td className="p-4 text-xs">
                      {editingId === item.id ? <InputCell field="ledger_name" placeholder="Ledger" /> : (
                        <span className="text-purple-400">{item.ledger_name || '-'}</span>
                      )}
                    </td>
                  )}

                  {columnVisibility.group_name && (
                    <td className="p-4 text-xs">
                      {editingId === item.id ? <InputCell field="group_name" placeholder="Group" /> : (
                        <span className="text-green-400">{item.group_name || '-'}</span>
                      )}
                    </td>
                  )}

                  {columnVisibility.taxable_value && (
                    <td className={`p-4 text-right font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {editingId === item.id ? <InputCell field="taxable_value" type="number" /> : `₹${safeFloat(item.taxable_value).toLocaleString('en-IN')}`}
                    </td>
                  )}

                  {columnVisibility.tax_amount && (
                    <td className={`p-4 text-right font-mono ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                      {editingId === item.id ?
                        <div className="flex flex-col gap-1">
                          <InputCell field="igst_amount" placeholder="IGST" />
                          <InputCell field="cgst_amount" placeholder="CGST" />
                        </div>
                        : `₹${(safeFloat(item.igst_amount) + safeFloat(item.cgst_amount) + safeFloat(item.sgst_amount)).toLocaleString('en-IN')}`}
                    </td>
                  )}

                  {columnVisibility.grand_total && (
                    <td className={`p-4 text-right font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {editingId === item.id ? <InputCell field="grand_total" type="number" /> : `₹${safeFloat(item.grand_total).toLocaleString('en-IN')}`}
                    </td>
                  )}

                  {/* NEW GST Columns for Tally Compliance */}
                  {columnVisibility.vendor_state && (
                    <td className={`p-4 text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      {item.vendor_state || (item.gst_no ? item.gst_no.substring(0, 2) : '-')}
                    </td>
                  )}

                  {columnVisibility.gst_type && (
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.gst_type === 'IGST'
                        ? 'bg-orange-500/20 text-orange-400'
                        : item.gst_type === 'CGST+SGST' || (safeFloat(item.cgst_amount) > 0)
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                        }`}>
                        {item.gst_type || (safeFloat(item.igst_amount) > 0 ? 'IGST' : (safeFloat(item.cgst_amount) > 0 ? 'CGST+SGST' : '-'))}
                      </span>
                    </td>
                  )}

                  {columnVisibility.tax_rate && (
                    <td className={`p-4 text-xs font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      {item.tax_rate ? `${item.tax_rate}%` : '-'}
                    </td>
                  )}

                  {columnVisibility.gst_no && (
                    <td className={`p-4 font-mono text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{item.gst_no}</td>
                  )}


                  {columnVisibility.payment_status && (
                    <td className="p-4">
                      {editingId === item.id ? (
                        <select
                          value={editForm.payment_status || 'Unpaid'}
                          onChange={e => setEditForm(prev => ({ ...prev, payment_status: e.target.value }))}
                          className="w-full bg-black/50 border border-purple-500/50 rounded px-2 py-1 text-white text-xs focus:outline-none"
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.payment_status === 'Paid' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {item.payment_status || 'Unpaid'}
                        </span>
                      )}
                    </td>
                  )}

                  <td className="p-4">
                    {item.file_url ? (
                      <button onClick={() => setPdfView(`${API_URL}${item.file_url}`)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400 flex items-center gap-1 text-xs">
                        <Eye className="w-4 h-4" /> View
                      </button>
                    ) : <span className="text-gray-600 text-xs">No File</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* PDF SIDE PANEL */}
      <AnimatePresence>
        {pdfView && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed top-0 right-0 h-full w-[50%] bg-[#0a0a0a] border-l ${isDark ? 'border-white/10' : 'border-gray-200'} z-50 shadow-2xl flex flex-col`}
          >
            <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} flex justify-between items-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Original Invoice</h3>
              <button onClick={() => setPdfView(null)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 bg-gray-900">
              <iframe src={pdfView} className="w-full h-full border-none" title="PDF Viewer" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANUAL ENTRY MODAL */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`bg-[#0f0f11] border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl`}
            >
              <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-blue-900/20`}>
                <h3 className="text-xl font-bold text-white">Manual Invoice Entry</h3>
                <button onClick={() => setIsManualModalOpen(false)}><X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="p-8 grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Vendor Name</label>
                  <input name="vendor_name" required className={`w-full bg-leo-void/50 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 ${isDark ? 'text-gray-200' : 'text-gray-900'} focus:border-leo-accent focus:shadow-[0_0_10px_rgba(0,188,212,0.2)] outline-none transition-all`} placeholder="Enter Vendor Name" />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Invoice No</label>
                  <input name="invoice_no" required className={`w-full bg-leo-void/50 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 ${isDark ? 'text-gray-200' : 'text-gray-900'} focus:border-leo-accent focus:shadow-[0_0_10px_rgba(0,188,212,0.2)] outline-none transition-all`} />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Invoice Date</label>
                  <input name="invoice_date" type="date" required className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`} />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>GSTIN</label>
                  <input name="gst_no" className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`} />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>HSN Code <span className="text-blue-400 font-normal">(AI Auto-fills)</span></label>
                  <input name="hsn_code" className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`} placeholder="Leave empty for AI detection" />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Ledger Name <span className="text-purple-400 font-normal">(AI Auto-fills)</span></label>
                  <input name="ledger_name" className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`} placeholder="Leave empty for AI detection" />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Group Name <span className="text-green-400 font-normal">(AI Auto-fills)</span></label>
                  <input name="group_name" className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`} placeholder="Leave empty for AI detection" />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Tax Rate (%)</label>
                  <select name="tax_rate" className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`}>
                    <option value="18">18%</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="28">28%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Taxable Value</label>
                  <input name="taxable_value" type="number" step="0.01" className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`} />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold block mb-2`}>Grand Total</label>
                  <input name="grand_total" type="number" step="0.01" required className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl p-3 text-white focus:border-purple-500 outline-none`} />
                </div>
                <div className="col-span-2 pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className={`flex-1 py-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} hover:bg-white/10 rounded-xl text-white font-bold transition-colors`}>Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold shadow-lg transition-colors">Save Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )
        }
      </AnimatePresence >

      {/* Tally Simulation Modal */}
      <TallySimulation
        isOpen={showTallySimulation}
        onClose={() => setShowTallySimulation(false)}
        onExport={() => {
          console.log('Export complete');
        }}
        isDark={isDark}
      />
    </div >
  );
};

// ============================================================================
// INNOVATIVE FEATURES: NOTIFICATIONS & QUICK ACTIONS
// ============================================================================

// ============================================================================
// TIME MACHINE FILTER - Premium Month/Year Selector
// ============================================================================

const MonthFilter = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();

  // Generate last 18 months for dropdown (covers full financial year)
  const getMonthOptions = () => {
    const options = [{ value: 'all', label: 'All Time', icon: '📅' }];
    const now = new Date();

    for (let i = 0; i < 18; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const shortLabel = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      options.push({ value, label, shortLabel, icon: '📆' });
    }

    return options;
  };

  const options = getMonthOptions();
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative">
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${isDark
          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/50'
          : 'bg-white border-gray-200 hover:border-purple-500 shadow-sm'
          }`}
      >
        <Calendar className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
          {selectedOption.shortLabel || selectedOption.label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronsUpDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl border shadow-2xl z-50 ${isDark
                ? 'bg-[#151520]/95 backdrop-blur-xl border-white/10'
                : 'bg-white border-gray-200'
                }`}
            >
              {/* Header */}
              <div className={`sticky top-0 p-3 border-b ${isDark ? 'border-white/10 bg-[#151520]' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select Period
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="p-2">
                {options.map((opt, index) => (
                  <motion.button
                    key={opt.value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${value === opt.value
                      ? (isDark ? 'bg-purple-600/20 text-purple-300' : 'bg-purple-50 text-purple-700')
                      : (isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700')
                      }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-sm font-medium">{opt.label}</span>
                    {value === opt.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuickActions = () => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Plus, label: 'Add Invoice', shortcut: 'Ctrl+N', color: 'blue' },
    { icon: Search, label: 'AI Search', shortcut: 'Ctrl+K', color: 'purple' },
    { icon: DownloadIcon, label: 'Export Tally', shortcut: 'Ctrl+E', color: 'green' },
    { icon: RefreshCw, label: 'Refresh Data', shortcut: 'Ctrl+R', color: 'orange' }
  ];

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'} hover:bg-white/10 rounded-xl transition-colors`}
      >
        <Zap className="w-5 h-5 text-yellow-400" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute right-0 top-14 w-64 bg-black/90 backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-2xl shadow-2xl overflow-hidden z-50`}
          >
            <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h3 className="font-bold text-white text-sm">Quick Actions</h3>
            </div>
            <div className="p-2">
              {actions.map((action, i) => (
                <button
                  key={i}
                  className={`w-full p-3 flex items-center gap-3 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl transition-colors group`}
                >
                  <div className={`p-2 rounded-lg bg-${action.color}-500/10`}>
                    <action.icon className={`w-4 h-4 text-${action.color}-400`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-white">{action.label}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>{action.shortcut}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// NOTICES VIEW - GST NOTICE REPLY DRAFTER
// ============================================================================

// --- 8. NOTICES VIEW (Enhanced) ---
const NoticesView = () => {
  const { isDark } = useTheme();

  const notices = [
    { id: 1, title: "GST Filing Extension", date: "Jan 05, 2026", type: "Important", desc: "The due date for GSTR-1 has been extended to Jan 15th." },
    { id: 2, title: "New Compliance Rule 88C", date: "Jan 02, 2026", type: "Update", desc: "New automated intimation for mismatch in GSTR-1 vs GSTR-3B." },
    { id: 3, title: "System Maintenance", date: "Dec 28, 2025", type: "Alert", desc: "GST Portal will be down for maintenance on Sunday 12 AM - 4 AM." },
  ];

  return (
    <div className={`h-full overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Legal Notices</h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Latest updates from GST Network</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
          Refresh Updates
        </button>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${notice.type === 'Important' ? 'bg-rose-500/10 text-rose-500' :
                  notice.type === 'Alert' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                  {notice.type}
                </span>
                <h3 className="font-bold text-lg">{notice.title}</h3>
              </div>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{notice.date}</span>
            </div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>{notice.desc}</p>
            <div className="mt-4 flex gap-3">
              <button className={`text-sm font-medium hover:underline ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Read Full Notice</button>
              <button className={`text-sm font-medium hover:underline ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dismiss</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// COMMUNICATION CENTER - MULTI-CHANNEL SYSTEM
// ============================================================================

const CommunicationCenter = ({ data }) => {
  const { isDark } = useTheme();
  const [activeView, setActiveView] = useState('overview');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeChannel, setComposeChannel] = useState('whatsapp');
  const [scheduledComms, setScheduledComms] = useState([]);
  const [recentComms, setRecentComms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch clients list
  useEffect(() => {
    const token = localStorage.getItem('taxai_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    fetch(`${API_URL}/clients`, { headers })
      .then(res => res.json())
      .then(setClients)
      .catch(err => console.error('Failed to load clients:', err));
  }, []);

  // Fetch scheduled communications
  useEffect(() => {
    const token = localStorage.getItem('taxai_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    fetch(`${API_URL}/communications/scheduled`, { headers })
      .then(res => res.json())
      .then(data => {
        setScheduledComms(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load scheduled:', err);
        setLoading(false);
      });
  }, []);

  // Fetch recent communications
  useEffect(() => {
    const token = localStorage.getItem('taxai_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    fetch(`${API_URL}/communications/recent`, { headers })
      .then(res => res.json())
      .then(data => setRecentComms(data || []))
      .catch(err => console.error('Failed to load recent:', err));
  }, []);

  // Fetch templates
  useEffect(() => {
    const token = localStorage.getItem('taxai_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    fetch(`${API_URL}/templates`, { headers })
      .then(res => res.json())
      .then(setTemplates)
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  // Fetch analytics
  useEffect(() => {
    const token = localStorage.getItem('taxai_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    fetch(`${API_URL}/communications/analytics`, { headers })
      .then(res => res.json())
      .then(setAnalytics)
      .catch(err => console.error('Failed to load analytics:', err));
  }, []);

  const refreshData = async () => {
    try {
      const token = localStorage.getItem('taxai_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [scheduled, recent, analyticsRes] = await Promise.all([
        fetch(`${API_URL}/communications/scheduled`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/communications/recent`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/communications/analytics`, { headers }).then(r => r.json())
      ]);
      setScheduledComms(scheduled || []);
      setRecentComms(recent || []);
      setAnalytics(analyticsRes || {});
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  };

  const handleSendMessage = async (messageData) => {
    try {
      const endpoint = messageData.channel === 'whatsapp' ? '/whatsapp/send' :
        messageData.channel === 'email' ? '/email/send' :
          messageData.channel === 'sms' ? '/sms/send' :
            messageData.channel === 'call' ? '/calls/schedule' : null;

      if (!endpoint) return;

      const token = localStorage.getItem('taxai_token');
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(messageData)
      });

      const result = await res.json();

      if (result.status === 'sent' || result.status === 'scheduled') {
        // For WhatsApp, open the link in a new tab
        if (messageData.channel === 'whatsapp' && result.whatsapp_link) {
          window.open(result.whatsapp_link, '_blank');
          alert(`✅ WhatsApp opened for ${result.client_name || 'Client'}`);
        } else {
          alert(`✅ ${messageData.channel.toUpperCase()} ${result.status} successfully!`);
        }
        setShowComposeModal(false);
        refreshData();
      } else {
        alert(`❌ Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('❌ Failed to send message: ' + err.message);
    }
  };

  const sendQuickWhatsApp = async (client) => {
    // Generate a quick WhatsApp link for the client
    const phone = client.phone;
    if (!phone) {
      alert('⚠️ No phone number for this client!');
      return;
    }
    const cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const message = 'Hello! Just checking in regarding your account. Please let us know if you need anything.';
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header with Quick Actions */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage all client communications • {clients.length} clients</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage all client communications • {clients.length} clients</p>
          </div>

          <div className="flex gap-2">
            {['overview', 'schedule', 'history', 'analytics'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-2 rounded-lg transition-colors capitalize ${activeView === view
                  ? 'bg-purple-600 text-white'
                  : isDark ? '${isDark ? "bg-white/5" : "bg-gray-50"} text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setComposeChannel('whatsapp'); setShowComposeModal(true); }}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl hover:border-green-500/50 transition-all"
          >
            <MessageSquare className="w-6 h-6 text-green-400" />
            <div className="text-left">
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>WhatsApp</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Send message</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setComposeChannel('call'); setShowComposeModal(true); }}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-all"
          >
            <Phone className="w-6 h-6 text-blue-400" />
            <div className="text-left">
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Schedule Call</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Set reminder</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setComposeChannel('email'); setShowComposeModal(true); }}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition-all"
          >
            <Mail className="w-6 h-6 text-purple-400" />
            <div className="text-left">
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Email</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Send email</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setComposeChannel('sms'); setShowComposeModal(true); }}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl hover:border-orange-500/50 transition-all"
          >
            <MessageCircle className="w-6 h-6 text-orange-400" />
            <div className="text-left">
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>SMS</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Send text</p>
            </div>
          </motion.button>
        </div>
      </GlassCard>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Client List */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Contact</h3>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                  {clients.length} clients
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {clients.length === 0 ? (
                  <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No clients found</p>
                    <p className="text-xs text-gray-600">Add clients to start communicating</p>
                  </div>
                ) : (
                  clients.slice(0, 8).map((client) => (
                    <div key={client.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{client.company_name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{client.phone || 'No phone'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => sendQuickWhatsApp(client)}
                          className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4 text-green-400" />
                        </button>
                        <button
                          onClick={() => client.phone && window.open(`tel:${client.phone}`, '_self')}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Call"
                        >
                          <Phone className="w-4 h-4 text-blue-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            {/* Recent Communications */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
                <button onClick={refreshData} className="p-1.5 hover:bg-white/10 rounded transition-colors">
                  <RefreshCw className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </div>

              <div className="space-y-3">
                {recentComms.length === 0 ? (
                  <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent communications</p>
                    <p className="text-xs text-gray-600">Start by sending a WhatsApp message!</p>
                  </div>
                ) : (
                  recentComms.slice(0, 5).map((comm, i) => (
                    <div key={i} className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-1 ${comm.channel === 'whatsapp' ? 'bg-green-500/20 text-green-400' :
                          comm.channel === 'call' ? 'bg-blue-500/20 text-blue-400' :
                            comm.channel === 'email' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-orange-500/20 text-orange-400'
                          }`}>
                          {comm.channel === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> :
                            comm.channel === 'call' ? <Phone className="w-4 h-4" /> :
                              comm.channel === 'email' ? <Mail className="w-4 h-4" /> :
                                <MessageCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-white truncate">{comm.client_name || 'Unknown'}</p>
                            <p className={`text - xs ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>{comm.timestamp}</p>
                          </div>
                          <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'} truncate`}>{comm.message?.substring(0, 60)}...</p>
                          <span className={`text - xs font - bold ${comm.status === 'delivered' || comm.status === 'sent' ? 'text-green-400' : 'text-gray-400'}`}>
                            {comm.status === 'delivered' ? '✓ Delivered' : comm.status === 'sent' ? '→ Sent' : '○ Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            {/* Communication Stats */}
            <GlassCard className="p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-white mb-4">Communication Statistics</h3>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <MessageSquare className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analytics.whatsapp?.sent || 0}</p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>WhatsApp sent</p>
                </div>

                <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Phone className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analytics.calls?.completed || 0}</p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Calls scheduled</p>
                </div>

                <div className="text-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <Mail className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analytics.email?.sent || 0}</p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Emails sent</p>
                </div>

                <div className="text-center p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <MessageCircle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analytics.sms?.sent || 0}</p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SMS delivered</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {activeView === 'schedule' && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Scheduled Communications</h3>
              <button onClick={refreshData} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <RefreshCw className={`w - 4 h - 4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            {scheduledComms.length === 0 ? (
              <div className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold text-white mb-2">No Scheduled Communications</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Click "Schedule Call" to add a reminder</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledComms.map((comm, i) => (
                  <div key={i} className={`flex items-center gap-4 p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className={`p-3 rounded-lg ${comm.channel === 'call' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                      {comm.channel === 'call' ? <Phone className="w-5 h-5 text-blue-400" /> : <MessageSquare className="w-5 h-5 text-green-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{comm.client_name || 'Unknown Client'}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{comm.message || comm.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-400">{comm.scheduled_time}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>{comm.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {activeView === 'history' && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Communication History</h3>
              <button onClick={refreshData} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <RefreshCw className={`w - 4 h - 4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            {recentComms.length === 0 ? (
              <div className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold text-white mb-2">No Communication History</p>
                <p className={`text - sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Send a message to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentComms.map((comm, i) => (
                  <div key={i} className={`p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${comm.channel === 'whatsapp' ? 'bg-green-500/20 text-green-400' :
                        comm.channel === 'call' ? 'bg-blue-500/20 text-blue-400' :
                          comm.channel === 'email' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-orange-500/20 text-orange-400'
                        }`}>
                        {comm.channel === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> :
                          comm.channel === 'call' ? <Phone className="w-4 h-4" /> :
                            comm.channel === 'email' ? <Mail className="w-4 h-4" /> :
                              <MessageCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-white">{comm.client_name || 'Unknown'}</p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${comm.status === 'sent' || comm.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                              {comm.status}
                            </span>
                            <span className={`text - xs ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>{comm.timestamp}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300">{comm.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {activeView === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Channel Performance</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-green-400">
                      <MessageSquare className="w-4 h-4" /> WhatsApp
                    </span>
                    <span className="text-2xl font-bold text-white">{analytics.whatsapp?.sent || 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.whatsapp?.sent || 0) * 10, 100)} % ` }} />
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-blue-400">
                      <Phone className="w-4 h-4" /> Calls
                    </span>
                    <span className="text-2xl font-bold text-white">{analytics.calls?.completed || 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.calls?.completed || 0) * 10, 100)} % ` }} />
                  </div>
                </div>

                <div className="p-4 bg-purple-500/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-purple-400">
                      <Mail className="w-4 h-4" /> Email
                    </span>
                    <span className="text-2xl font-bold text-white">{analytics.email?.sent || 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.email?.sent || 0) * 10, 100)} % ` }} />
                  </div>
                </div>

                <div className="p-4 bg-orange-500/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-orange-400">
                      <MessageCircle className="w-4 h-4" /> SMS
                    </span>
                    <span className="text-2xl font-bold text-white">{analytics.sms?.sent || 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.sms?.sent || 0) * 10, 100)} % ` }} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p - 4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded - xl text - center`}>
                  <p className="text-4xl font-bold text-white">{analytics.today_total || 0}</p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt - 1`}>Messages Today</p>
                </div>
                <div className={`p - 4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded - xl text - center`}>
                  <p className="text-4xl font-bold text-white">
                    {(analytics.whatsapp?.sent || 0) + (analytics.email?.sent || 0) + (analytics.sms?.sent || 0)}
                  </p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt - 1`}>Total Messages</p>
                </div>
                <div className={`p - 4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded - xl text - center`}>
                  <p className="text-4xl font-bold text-white">{clients.length}</p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt - 1`}>Active Clients</p>
                </div>
                <div className={`p - 4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded - xl text - center`}>
                  <p className="text-4xl font-bold text-white">{scheduledComms.length}</p>
                  <p className={`text - xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt - 1`}>Scheduled</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Compose Message Modal */}
      <AnimatePresence>
        {showComposeModal && (
          <ComposeMessageModal
            channel={composeChannel}
            clients={clients}
            templates={templates}
            onSend={handleSendMessage}
            onClose={() => setShowComposeModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ComposeMessageModal = ({ channel, clients, templates, onSend, onClose }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sendNow, setSendNow] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSend({
      channel,
      client_id: selectedClient,
      subject: subject || undefined,
      message,
      schedule_time: sendNow ? null : scheduleTime
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-2xl w-full max-w-2xl p-6 shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Compose Message - {channel}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className={`w - 5 h - 5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Select Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500`}
              required
            >
              <option value="">Choose client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name || client.vendor_name || `Client ${client.id}`} {client.phone ? `(${client.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {
            channel === 'email' && (
              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                  className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500`}
                  required
                />
              </div>
            )
          }

          <div>
            <label className={`block text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Template (Optional)</label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                const template = templates.find(t => t.id === parseInt(e.target.value));
                if (template) setMessage(template.body);
              }}
              className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500`}
            >
              <option value="">Write custom message...</option>
              {templates.filter(t => t.channel === channel).map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Write your ${channel} message...`}
              rows={6}
              className={`w-full bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none`}
              required
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={sendNow}
                onChange={() => setSendNow(true)}
                className="w-4 h-4"
              />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Send Now</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!sendNow}
                onChange={() => setSendNow(false)}
                className="w-4 h-4"
              />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Schedule</span>
            </label>

            {!sendNow && (
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className={`bg-black/30 border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500`}
                required={!sendNow}
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} hover:bg-white/10 rounded-xl text-white font-bold transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-bold transition-all"
            >
              {sendNow ? 'Send Message' : 'Schedule Message'}
            </button>
          </div>
        </form >
      </motion.div >
    </motion.div >
  );
};

// ============================================================================
// PHASE 2: AI SEARCH "JARVIS" COMPONENT WITH VOICE
// ============================================================================

const JarvisSearch = ({ onResults, onClose, activeTab, selectedClient, selectedMonth, userName = 'User' }) => {
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [helpResponse, setHelpResponse] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-IN'; // Indian English

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError('Voice recognition failed. Please try again.');
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setError('Voice recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setError("");
      recognition.start();
      setIsListening(true);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setHelpResponse(null);

    try {
      const res = await fetch(`${API_URL}/search/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: {
            current_tab: activeTab || 'dashboard',
            selected_client: selectedClient?.company_name || null,
            client_id: selectedClient?.id || null,
            month: selectedMonth || 'all',
            username: userName
          }
        })
      });
      const results = await res.json();

      if (results.error) {
        setError(results.error);
      } else if (results.type === 'help' && results.explanation) {
        // Show help response inline
        setHelpResponse(results.explanation);
      } else {
        onResults(results);
        if (results.type !== 'help') {
          onClose();
        }
      }
    } catch (err) {
      setError("Failed to connect to AI search. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Quick suggestion commands
  const suggestions = [
    "Show dashboard",
    "Add bills",
    "Show January bills",
    "What is GST credit?",
    "Help"
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`backdrop-blur-xl border rounded-3xl w-full max-w-2xl p-8 shadow-2xl ${isDark
          ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30'
          : 'bg-white/80 border-slate-100 shadow-blue-900/20'
          }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Jarvis AI Search</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Ask me anything about your invoices</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try: "Show unpaid invoices above 50k" or "Find all bills from Ratan Diesels"'
              className={`w-full border rounded-xl px-4 py-4 pr-14 focus:outline-none focus:border-purple-500 transition-colors ${isDark
                ? 'bg-black/30 border-white/10 text-white placeholder-gray-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {loading ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : (
                <motion.button
                  type="button"
                  onClick={toggleListening}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-2 rounded-lg transition-all ${isListening
                    ? 'bg-red-500/20 text-red-400 animate-pulse'
                    : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                    }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.button>
              )}
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} hover:bg-white/10 rounded-xl text-white font-bold transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Response Display */}
        <AnimatePresence>
          {helpResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 p-5 rounded-2xl border ${isDark
                ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30'
                : 'bg-green-50 border-green-200'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <Sparkles className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>KAIRO Says:</h4>
                  <div className={`text-sm whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {helpResponse}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Suggestions */}
        <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5">
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2 font-bold`}>🚀 Quick Commands:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((example, i) => (
              <button
                key={i}
                onClick={() => setQuery(example)}
                className={`px-3 py-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-50'} hover:bg-purple-500/20 hover:text-purple-300 rounded-lg text-xs text-gray-300 transition-colors`}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* More Examples */}
        <div className={`mt-3 flex flex-wrap gap-2`}>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>More:</span>
          {["Find unpaid bills", "Export to Tally", "Dark mode", "Settings"].map((cmd, i) => (
            <button
              key={i}
              onClick={() => setQuery(cmd)}
              className={`text-xs ${isDark ? 'text-gray-500 hover:text-purple-400' : 'text-gray-400 hover:text-purple-600'} transition-colors`}
            >
              {cmd}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- SETTINGS MODAL ---
const SettingsModal = ({ isOpen, onClose, activeTab, setActiveTab, isDark, setTheme, currentUser = null, onLogout = () => { } }) => {
  const [toggles, setToggles] = useState({ 'Email Alerts': true, 'Desktop Notifications': false, 'Marketing Emails': false });

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser) return 'U';
    const name = currentUser.display_name || currentUser.username || 'User';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      onLogout();
      onClose();
    }
  };

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden ${isDark ? 'bg-leo-void/95 backdrop-blur-2xl border border-white/10' : 'bg-white'}`}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <div className={`w-48 p-4 border-r ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 px-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Settings</h3>
            <nav className="space-y-1">
              {[
                { id: 'general', label: 'General', icon: Settings },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'account', label: 'Account', icon: User },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'privacy', label: 'Data & Privacy', icon: ShieldCheck },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === item.id
                    ? (isDark ? 'bg-leo-gradient text-white shadow-lg shadow-leo-primary/25' : 'bg-white shadow-sm text-purple-600')
                    : (isDark ? 'text-gray-400 hover:bg-white/5 hover:text-leo-accent' : 'text-gray-500 hover:bg-gray-100')
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Theme Settings */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Appearance</label>
                  <div className={`p-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                          {isDark ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        </div>
                        <div>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Adjust interface theme</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                      >
                        Switch to {isDark ? 'Light' : 'Dark'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Language Settings */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Language & Region</label>
                  <div className={`p-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                    <select className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <option>English (India)</option>
                      <option>हिन्दी (Hindi)</option>
                      <option>English (US)</option>
                    </select>
                  </div>
                </div>

                {/* Date Format */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date Format</label>
                  <div className={`p-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                    <select className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <option>DD/MM/YYYY (15/01/2026)</option>
                      <option>MM/DD/YYYY (01/15/2026)</option>
                      <option>YYYY-MM-DD (2026-01-15)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {['Email Alerts', 'Desktop Notifications', 'Marketing Emails'].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item}</span>
                    <div
                      onClick={() => handleToggle(item)}
                      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${toggles[item] ? 'bg-purple-600' : (isDark ? 'bg-white/10' : 'bg-gray-300')}`}
                    >
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white ${toggles[item] ? 'translate-x-5' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
            }

            {
              activeTab === 'account' && (
                <div className="space-y-6">
                  {/* Profile Section */}
                  <div className="text-center py-8">
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 bg-gradient-to-br ${isDark ? 'from-purple-600 to-blue-600' : 'from-purple-400 to-blue-400'} shadow-lg`}>
                      <span className="text-3xl font-bold text-white">{getUserInitials()}</span>
                    </div>
                    <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {currentUser?.display_name || currentUser?.username || 'User'}
                    </h3>
                    <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentUser?.email || 'user@example.com'}
                    </p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      Active Account
                    </span>
                  </div>

                  {/* Account Info */}
                  <div className="space-y-3">
                    <div className={`p-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Username</p>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentUser?.username || 'N/A'}</p>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Email Address</p>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentUser?.email || 'N/A'}</p>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Account Type</p>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Professional CA</p>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}">
                    <button
                      onClick={handleLogout}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500' : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <User className="w-4 h-4" />
                        Sign Out of Account
                      </div>
                    </button>
                    <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                      You'll be redirected to the login page
                    </p>
                  </div>
                </div>
              )
            }

            {/* Security Tab */}
            {activeTab === 'security' && (
              <SecurityTab isDark={isDark} currentUser={currentUser} />
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'privacy' && (
              <DataPrivacyTab isDark={isDark} currentUser={currentUser} onLogout={onLogout} />
            )}
          </div >
        </div >
      </motion.div >
    </motion.div >
  );
};

// --- NOTIFICATION DROPDOWN ---
const NotificationDropdown = ({ isOpen, onClose, notifications, markAllRead, isDark }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-transparent" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`absolute top-14 right-0 z-[70] w-80 rounded-2xl shadow-2xl overflow-hidden border ${isDark ? 'bg-[#1a1a24] border-white/10' : 'bg-white border-gray-100'}`}
      >
        <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-50'} flex justify-between items-center`}>
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
          <button onClick={markAllRead} className="text-xs font-medium text-purple-500 hover:text-purple-600">Mark all read</button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-4 border-b relative last:border-0 ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'} transition-colors`}>
                {!n.read && <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-purple-500" />}
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{n.title}</p>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{n.msg}</p>
                <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{n.time}</span>
              </div>
            ))
          )}
        </div >
        <div className={`p-3 text-center border-t ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-50 bg-gray-50'}`}>
          <button className={`text-xs font-bold ${isDark ? 'text-gray-500' : 'text-gray-700'} hover:text-gray-700`}>View All Activity</button>
        </div >
      </motion.div >
    </>
  );
};

// ============================================================================
// MAIN APPLICATION SHELL
// ============================================================================

function App({ currentUser = null, onLogout = () => { } }) {
  const [theme, setTheme] = useState('dark'); // 'light' | 'dark' - Default to Dark for Leo Theme
  const isDark = theme === 'dark';
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true); // Loading state for initial data fetch

  const [showJarvis, setShowJarvis] = useState(false);
  const [aiSearchResults, setAISearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Global search state

  // User info for personalization
  const userName = currentUser?.display_name || currentUser?.username || 'User';

  // 🔔 Notifications & Settings State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New Invoice Uploaded", msg: "Invoice #INV-2024-001 from Amazon Web Services processed successfully.", time: "2 mins ago", read: false, type: "success" },
    { id: 2, title: "GST Mismatch Found", msg: "Discrepancy detected in invoice #INV-992 from Dell Computers.", time: "1 hour ago", read: false, type: "warning" },
    { id: 3, title: "Monthly Report Ready", msg: "Your January 2026 tax liability report is ready for download.", time: "5 hours ago", read: true, type: "info" }
  ]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // 🎯 Enterprise Features State
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    // Force dark mode initially for the "Leo" experience
    if (!localStorage.getItem('theme')) {
      setTheme('dark');
    }
    const timer = setTimeout(() => setShowIntro(false), 3800);
    return () => clearTimeout(timer);
  }, []);

  // ⌨️ Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Cmd/Ctrl + /: Jarvis AI Search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowJarvis(true);
      }
      // Cmd/Ctrl + ,: Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }
      // Cmd/Ctrl + U: Upload
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        setActiveTab('upload');
      }
      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        // Only if not in an input
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          setShowUserDropdown(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // 🆕 V2.0: Client & Document Management
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('gst_invoice');
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showClientProfile, setShowClientProfile] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // 📤 UPLOAD QUEUE STATE (persists across tab switches)
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [triageStats, setTriageStats] = useState({ total_unassigned: 0 });
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all', '2026-01', '2025-12', etc.
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // New Feature Modals
  const [showBulkMapper, setShowBulkMapper] = useState(false);
  const [showTallySimulation, setShowTallySimulation] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyInvoice, setVerifyInvoice] = useState(null);


  // Filter data by selected month
  // Filter data by selected month AND search query
  const filteredData = useMemo(() => {
    let result = data;

    // 1. Filter by Month
    if (selectedMonth !== 'all') {
      result = result.filter(invoice => {
        const dateStr = invoice.date || invoice.invoice_date || invoice.bill_date || invoice.created_at;
        if (!dateStr) return false;
        try {
          const invoiceDate = new Date(dateStr);
          const invoiceMonth = `${invoiceDate.getFullYear()} -${String(invoiceDate.getMonth() + 1).padStart(2, '0')} `;
          return invoiceMonth === selectedMonth;
        } catch { return false; }
      });
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv => {
        const jsonData = typeof inv.json_data === 'string' ? JSON.parse(inv.json_data || '{ }') : (inv.json_data || {});

        // Search in main fields and parsed JSON data
        return (
          (inv.vendor_name || '').toLowerCase().includes(q) ||
          (inv.invoice_no || '').toLowerCase().includes(q) ||
          (jsonData.vendor_name || '').toLowerCase().includes(q) ||
          (jsonData.invoice_no || '').toLowerCase().includes(q) ||
          String(inv.grand_total || '').includes(q) ||
          String(jsonData.grand_total || '').includes(q)
        );
      });
    }

    return result;
  }, [data, selectedMonth, searchQuery]);

  // --- LOAD HISTORY & CLIENTS ---
  // --- LOAD HISTORY & CLIENTS ---
  // Timeout wrapper for fetch requests (5 second timeout)
  const fetchWithTimeout = async (url, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = localStorage.getItem('taxai_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(url, {
        signal: controller.signal,
        headers
      });
      clearTimeout(timeoutId);
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  const loadAllData = useCallback(async () => {
    setIsDataLoading(true);

    // Use Promise.allSettled so one failure doesn't block others
    const results = await Promise.allSettled([
      fetchWithTimeout(`${API_URL}/history`),
      fetchWithTimeout(`${API_URL}/clients`),
      fetchWithTimeout(`${API_URL}/documents/stats`),
      fetchWithTimeout(`${API_URL}/triage/stats`)
    ]);

    // Process results individually
    if (results[0].status === 'fulfilled' && results[0].value) {
      setData(results[0].value);
    } else {
      console.error("History Load Error:", results[0].reason);
      setData([]); // Set empty array to prevent loading state
    }

    if (results[1].status === 'fulfilled' && results[1].value) {
      setClients(results[1].value);
    } else {
      console.error("Clients Load Error:", results[1].reason);
      setClients([]); // Set empty array
    }

    if (results[2].status === 'fulfilled' && results[2].value) {
      const stats = results[2].value;
      setPendingReviewCount((stats.pending || 0) + (stats.needs_review || 0));
    } else {
      console.error("Stats Load Error:", results[2].reason);
      setPendingReviewCount(0);
    }

    if (results[3].status === 'fulfilled' && results[3].value) {
      setTriageStats(results[3].value);
    } else {
      console.error("Triage Stats Error:", results[3].reason);
      setTriageStats({ total_unassigned: 0 });
    }

    // Always set loading to false after all attempts
    setIsDataLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);



  // Handle AI Search Results (with navigation support)
  const handleAIResults = (results) => {
    // Check if it's a navigation action
    if (results.type === 'navigation' && results.action) {
      const action = results.action;

      // Handle tab navigation
      if (action.action === 'navigate' && action.tab) {
        setActiveTab(action.tab);
        setShowJarvis(false);
        return;
      }

      // Handle settings
      if (action.action === 'open_settings') {
        setSettingsOpen(true);
        setShowJarvis(false);
        return;
      }

      // Handle theme toggle
      if (action.action === 'toggle_theme') {
        if (action.theme === 'toggle') {
          setTheme(theme === 'dark' ? 'light' : 'dark');
        } else {
          setTheme(action.theme);
        }
        setShowJarvis(false);
        return;
      }

      // Handle month filter
      if (action.action === 'filter_month' && action.month) {
        setSelectedMonth(action.month);
        setActiveTab('register'); // Switch to register to show filtered results
        setShowJarvis(false);
        return;
      }

      // === NEW: Handle modal actions ===
      if (action.action === 'open_modal' && action.modal) {
        setShowJarvis(false);

        switch (action.modal) {
          case 'bulk_mapper':
            setShowBulkMapper(true);
            break;
          case 'tally_simulation':
            setShowTallySimulation(true);
            break;
          case 'client_profile':
            setShowClientProfile(true);
            break;
          case 'client_selector':
            setShowClientSelector(true);
            break;
          case 'add_client':
            // You could add a state for this
            setShowClientSelector(true);
            break;
          default:
            console.log('Unknown modal:', action.modal);
        }
        return;
      }

      // === NEW: Handle special commands ===
      if (action.action === 'special' && action.command) {
        setShowJarvis(false);

        switch (action.command) {
          case 'verify_gstin':
            // Open a prompt to enter GSTIN
            const gstin = prompt('🕵️ Vendor Spy - Enter GSTIN to verify:');
            if (gstin) {
              const token = localStorage.getItem('taxai_token');
              const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
              fetch(`${API_URL}/vendor/verify-gst/${gstin}`, { headers })
                .then(res => res.json())
                .then(result => {
                  const status = result.valid ? '✅ ACTIVE' : '❌ CANCELLED';
                  alert(`🕵️ Vendor Spy Results:\n\nGSTIN: ${result.gstin}\nStatus: ${status}\nState: ${result.state || 'Unknown'}\n\n${result.message}`);
                })
                .catch(err => alert('Failed to verify GSTIN: ' + err));
            }
            break;
          case 'refresh':
            // Refresh data
            loadAllData();
            break;
          default:
            console.log('Unknown special command:', action.command);
        }
        return;
      }
    }

    // Check if it's a help response
    if (results.type === 'help' && results.explanation) {
      // Keep the modal open and show the explanation
      setAISearchResults(results);
      return;
    }

    // Normal search results (array of invoices)
    setAISearchResults(results);
    setActiveTab('register'); // Switch to register tab to show results
    setShowJarvis(false);
  };

  // Reset AI search when switching tabs manually
  useEffect(() => {
    if (activeTab !== 'register') {
      setAISearchResults(null);
    }
  }, [activeTab]);

  // --- UPLOAD HANDLER ---
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if client is selected
    if (!selectedClient) {
      alert('⚠️ Please select a client first!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowClientSelector(true);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', selectedClient.id);
    formData.append('doc_type', selectedDocType);
    formData.append('entered_by', 'System');

    try {
      const token = localStorage.getItem('taxai_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const result = await res.json();

      if (result.error) {
        alert(`⚠️ ${result.error}`);
      } else {
        // Refresh data using loadAllData which is secured
        await loadAllData();

        const confidenceEmoji = { 'high': '✅', 'medium': '🟡', 'low': '⚠️' };
        const emoji = confidenceEmoji[result.confidence_level] || '✅';

        alert(`${emoji} Invoice Uploaded!\nClient: ${selectedClient.company_name}\nConfidence: ${result.confidence_level}\nStatus: ${result.review_status}`);
      }
    } catch (error) {
      alert('❌ Upload Failed! ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- NAVIGATION ---
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Add Bills', icon: Upload },
    { id: 'register', label: 'Bill Register', icon: FileText },
    { id: 'clients', label: 'Clients', icon: Building2 },
    { id: 'triage', label: 'Pending', icon: Inbox, badge: triageStats?.total_unassigned },
    { id: 'comms', label: 'Messages', icon: MessageSquare },
    { id: 'legal', label: 'Legal', icon: FileWarning },
    { id: 'news', label: 'GST News', icon: Newspaper },
  ];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      <AnimatePresence mode="wait">
        {showIntro && <HeroIntro onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>
      {/* MAIN CONTAINER - Zona Pro Light Blue Gradient */}
      <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${isDark
        ? 'bg-[#0a0a0f] text-white'
        : 'bg-gradient-to-br from-[#C9E0F5] via-[#E0EDF8] to-[#D4E8FA] text-gray-900'
        }`}>
        {isDark && <MeshBackground />}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SIDEBAR - Dark: Original Jarvis Design | Light: Zona Pro Icon-Only */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <motion.aside
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`flex flex-col z-50 py-4 ${isDark
            ? 'w-64 bg-[#0f0f15] border-r border-white/5'
            : 'w-[80px] bg-transparent'
            }`}
        >
          {/* Logo Section */}
          {isDark ? (
            // Original Jarvis Logo for Dark Mode
            <div className="flex items-center gap-3 px-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">KAIRO</h1>
                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-700'} font-medium`}>Powered by Jarvis</p>
              </div>
            </div>
          ) : (
            // Zona Pro Icon-Only Logo for Light Mode
            <motion.div
              className="flex items-center justify-center mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer bg-[#2D75BD]"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>
          )}

          {/* Navigation */}
          {isDark ? (
            // Original Jarvis Navigation for Dark Mode - Full width with labels
            <nav className="flex-1 px-3 py-4 space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                    : `text-gray-400 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} hover:text-white`
                    }`}
                >
                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="absolute right-3 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-yellow-500 text-black">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          ) : (
            // Zona Pro Icon-Only Navigation for Light Mode
            <nav className="flex-1 flex flex-col items-center space-y-2">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  whileHover={{ scale: 1.15, y: -3, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-200 ${activeTab === tab.id
                    ? 'bg-[#2D75BD] text-white shadow-lg shadow-blue-200/50'
                    : 'text-[#2D75BD]/60 hover:bg-white/50'
                    }`}
                  title={tab.label}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, delay: 0.5 + index * 0.1 }}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-red-500 text-white"
                    >
                      {tab.badge}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </nav>
          )}

          {/* Sidebar Footer */}
          {isDark ? (
            // Original Jarvis Footer for Dark Mode
            <div className="p-3 space-y-2">
              <button
                onClick={() => setTheme('light')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${isDark ? 'text-gray-400' : 'text-gray-600'} hover:${isDark ? 'bg-leo-primary/10 text-leo-accent' : 'bg-gray-50'} transition-colors`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-sm font-medium">Light Mode</span>
              </button>
              <button onClick={() => setSettingsOpen(true)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${isDark ? 'text-gray-400' : 'text-gray-600'} hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-colors`}>
                <Package className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </button>
            </div>
          ) : (
            // Zona Pro Icon-Only Footer for Light Mode
            <motion.div
              className="flex flex-col items-center space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <motion.button
                whileHover={{ scale: 1.15, y: -3 }}
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={() => setTheme('dark')}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors text-[#2D75BD]/60 hover:bg-white/50"
                title="Dark Mode"
              >
                <Moon className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.15, rotate: 90, y: -3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSettingsOpen(true)}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors text-[#2D75BD]/60 hover:bg-white/50"
                title="Settings"
              >
                <Package className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}
        </motion.aside>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MAIN CONTENT - Floating White Panel (Zona Pro Style) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <main className={`flex-1 flex flex-col min-w-0 overflow-hidden m-4 rounded-3xl shadow-2xl ${isDark ? 'bg-leo-void/80 backdrop-blur-3xl border border-white/5' : 'bg-white'}`}>

          {/* TOP HEADER BAR - Matching screenshot12 */}
          <header className={`px-6 py-4 flex items-center justify-between ${isDark ? 'border-b border-white/5' : 'bg-white border-b border-gray-100'}`}>
            {/* Search Bar - Large & Centered */}
            <div className="flex-1 max-w-xl">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-full border ${isDark ? 'bg-leo-void/50 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoices, clients, GST numbers..."
                  className={`flex-1 bg-transparent border-none outline-none text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                    <X className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  </button>
                )}

              </div>
            </div>

            {/* Right Icons - Now Functional with Animations */}
            <div className="flex items-center gap-2">
              {/* Analytics Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('dashboard')}
                className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                title="View Analytics"
              >
                <TrendingUp className="w-5 h-5" />
              </motion.button>

              {/* Quick Settings Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSettingsOpen(true)}
                className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                title="Settings"
              >
                <Package className="w-5 h-5" />
              </motion.button>

              {/* Notification Bell with Animated Badge */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`p-2.5 rounded-xl transition-colors relative ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} ${notificationsOpen ? (isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-purple-600') : ''}`}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                      className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0f0f15]"
                    />
                  )}
                </motion.button>

                {/* Notification Dropdown */}
                <NotificationDropdown
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                  notifications={notifications}
                  markAllRead={markAllRead}
                  isDark={isDark}
                />
              </div>

              {/* User Profile Dropdown - Enhanced */}
              <div className="relative ml-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-gradient-to-br font-bold text-sm transition-all ${isDark
                    ? 'from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/50'
                    : 'from-purple-400 to-blue-400 text-white hover:shadow-lg hover:shadow-purple-400/30'
                    }`}
                >
                  {currentUser?.display_name?.charAt(0).toUpperCase() || currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                </motion.button>

                <UserProfileDropdown
                  isOpen={showUserDropdown}
                  onClose={() => setShowUserDropdown(false)}
                  currentUser={currentUser}
                  isDark={isDark}
                  onOpenSettings={() => {
                    setShowUserDropdown(false);
                    setSettingsOpen(true);
                  }}
                  onOpenNotifications={() => {
                    setShowUserDropdown(false);
                    setNotificationsOpen(true);
                  }}
                  onLogout={onLogout}
                />
              </div>
            </div>
          </header>

          {/* SECONDARY HEADER - Page Title & Actions (Matching screenshot12) */}
          <div className={`px-6 py-4 flex items-center justify-between ${isDark ? '' : 'bg-white border-b border-gray-100'}`}>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'register' ? 'Bill Register' : activeTab === 'upload' ? 'Add Bills' : activeTab === 'triage' ? 'Pending Review' : activeTab === 'comms' ? 'Messages' : activeTab === 'legal' ? 'Legal Eagle' : activeTab === 'news' ? 'GST Intelligence' : 'Dashboard'}
            </h1>

            <div className="flex items-center gap-3">
              {/* Month Filter Dropdown */}
              <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />

              {/* Download Report Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Export data as JSON
                  const exportData = {
                    exportDate: new Date().toISOString(),
                    summary: {
                      totalInvoices: data.length,
                      month: selectedMonth
                    },
                    invoices: data.map(d => {
                      const parsed = typeof d.json_data === 'string' ? JSON.parse(d.json_data) : d.json_data;
                      return {
                        vendor: parsed?.vendor_name,
                        invoice_no: parsed?.invoice_no,
                        date: parsed?.invoice_date,
                        total: parsed?.grand_total
                      };
                    })
                  };
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tax-report-${selectedMonth || 'all'}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md'}`}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </motion.button>

              {/* AI Assistant - Glowing Purple Button with Pulse */}
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(147, 51, 234, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    '0 10px 25px rgba(147, 51, 234, 0.3)',
                    '0 15px 35px rgba(147, 51, 234, 0.5)',
                    '0 10px 25px rgba(147, 51, 234, 0.3)'
                  ]
                }}
                transition={{
                  boxShadow: { repeat: Infinity, duration: 2 },
                  scale: { type: 'spring', stiffness: 400 }
                }}
                onClick={() => setShowJarvis(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-leo-gradient hover:bg-white/10 transition-all hover:scale-105 shadow-lg shadow-leo-primary/20"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <span>AI Assistant</span>
              </motion.button>
            </div>
          </div>

          {/* VIEWPORT */}
          <div className={`flex-1 p-8 overflow-y-auto overflow-x-hidden ${isDark ? '' : 'bg-white'}`}>
            <AnimatePresence mode='wait'>

              {activeTab === 'dashboard' && (
                <motion.div key="dash" {...pageAnimation} className="h-full">
                  <DashboardView data={filteredData} />
                </motion.div>
              )}

              {activeTab === 'upload' && (
                <motion.div key="up" {...pageAnimation} className="h-full">
                  <UploadView
                    onUploadSuccess={(newItem) => setData(prev => [newItem, ...prev])}
                    selectedClient={selectedClient}
                    clients={clients}
                    uploadQueue={uploadQueue}
                    setUploadQueue={setUploadQueue}
                    isUploading={isUploading}
                    setIsUploading={setIsUploading}
                  />
                </motion.div>
              )}

              {activeTab === 'register' && (
                <motion.div key="reg" {...pageAnimation} className="h-full">
                  <InvoiceRegister data={aiSearchResults || filteredData} setData={setData} />
                  {aiSearchResults && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="fixed top-24 right-8 bg-purple-900/90 backdrop-blur-xl border border-purple-500/50 rounded-xl px-4 py-2 shadow-2xl"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-purple-300" />
                        <span className="text-white font-bold">AI Search Active</span>
                        <button
                          onClick={() => setAISearchResults(null)}
                          className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <X className={`w-3 h-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                      </div>
                      <p className="text-xs text-purple-300 mt-1">Showing {aiSearchResults.length} results</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeTab === 'comms' && (
                <motion.div key="comms" {...pageAnimation} className="h-full">
                  <CommunicationCenter data={data} />
                </motion.div>
              )}

              {activeTab === 'legal' && (
                <motion.div key="legal" {...pageAnimation} className="h-full">
                  <LegalNotices
                    clientId={selectedClient?.id}
                    isDark={isDark}
                  />
                </motion.div>
              )}

              {activeTab === 'triage' && (
                <motion.div key="triage" {...pageAnimation} className="h-full">
                  <TriageView
                    clients={clients}
                    onRefresh={async () => {
                      const res = await fetch(`${API_URL}/triage/stats`);
                      setTriageStats(await res.json());
                      const token = localStorage.getItem('taxai_token');
                      const histRes = await fetch(`${API_URL}/history`, {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                      });
                      setData(await histRes.json());
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'news' && (
                <motion.div key="news" {...pageAnimation} className="h-full">
                  <GSTNews isDark={isDark} />
                </motion.div>
              )}

              {activeTab === 'clients' && (
                <motion.div key="clients" {...pageAnimation} className="h-full">
                  <ClientManagement isDark={isDark} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

        {/* Jarvis AI Search Modal */}
        <AnimatePresence>
          {showJarvis && (
            <JarvisSearch
              onResults={handleAIResults}
              onClose={() => setShowJarvis(false)}
              activeTab={activeTab}
              selectedClient={selectedClient}
              selectedMonth={selectedMonth}
              userName={userName}
            />
          )}
        </AnimatePresence>
      </div >

      {/* Command Palette - Cmd/Ctrl + K */}
      <AnimatePresence>
        {showCommandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            isDark={isDark}
            onCommand={(command) => {
              if (command.type === 'navigate' && command.tab) {
                setActiveTab(command.tab);
              } else if (command.type === 'toggle_theme') {
                setTheme(isDark ? 'light' : 'dark');
              } else if (command.type === 'open_modal') {
                if (command.modal === 'settings') setSettingsOpen(true);
                else if (command.modal === 'tally') setShowTallySimulation(true);
              } else if (command.type === 'export_data') {
                // Trigger data export
                alert('Data export feature coming soon!');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal - Enhanced with new tabs */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            activeTab={settingsTab}
            setActiveTab={setSettingsTab}
            isDark={isDark}
            setTheme={setTheme}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )
        }
      </AnimatePresence >

      {/* Client Profile Modal */}
      <AnimatePresence>
        {showClientProfile && selectedClient && (
          <ClientProfile
            client={selectedClient}
            onClose={() => setShowClientProfile(false)}
            onUpdate={(updated) => {
              setSelectedClient(updated);
              setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Bulk Ledger Mapper Modal */}
      <AnimatePresence>
        {showBulkMapper && (
          <BulkLedgerMapper
            isOpen={showBulkMapper}
            onClose={() => setShowBulkMapper(false)}
            onUpdate={() => loadAllData()}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Tally Simulation Modal */}
      <TallySimulation
        isOpen={showTallySimulation}
        onClose={() => setShowTallySimulation(false)}
        onExport={() => loadAllData()}
        isDark={isDark}
      />

      {/* Verify Invoice Modal */}
      <AnimatePresence>
        {showVerifyModal && verifyInvoice && (
          <VerifyModal
            invoice={verifyInvoice}
            onApprove={(updated) => {
              setData(prev => prev.map(d => d.id === updated.id ? updated : d));
              setShowVerifyModal(false);
            }}
            onReject={() => setShowVerifyModal(false)}
            onUpdate={(updated) => {
              setData(prev => prev.map(d => d.id === updated.id ? updated : d));
            }}
            onClose={() => setShowVerifyModal(false)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

    </ThemeContext.Provider >
  );
}

// =============================================================================
// APP WITH AUTHENTICATION WRAPPER
// =============================================================================


const Dashboard = () => {
  const { user, logout } = useAuth();

  // Dashboard is now protected by APP router, so we can assume user is logged in
  // or handle the null case gracefully if context is still loading (though ProtectedRoute handles that)

  return <App currentUser={user} onLogout={logout} />;
};

export default Dashboard;