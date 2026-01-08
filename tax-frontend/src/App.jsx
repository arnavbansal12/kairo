import { useState, useRef, useEffect, useMemo, Component } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Upload, Loader2, ShieldCheck, LayoutDashboard, MessageSquare,
  Download, Play, TrendingUp, FileCheck, AlertCircle, CheckCircle2,
  Sparkles, Zap, BarChart3, ChevronRight, Eye, Shield, X, FileText,
  Search, Filter, Trash2, Edit2, Save, Plus, FileInput, MoreVertical,
  Printer, ArrowUpRight, XCircle, AlertTriangle, Check, PieChart as PieChartIcon,
  DollarSign, Calendar, Users, Package, ArrowUp, ArrowDown, Minus,
  ChevronsUpDown, CheckSquare, Square, RefreshCw, FileSpreadsheet, Mic, MicOff,
  Bell, BellOff, Volume2, Download as DownloadIcon, MessageCircle, Building2,
  Inbox, Flag, Phone, Send, UserPlus, FolderInput, Mail, FileWarning
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RechartsPie, Pie, Cell, Legend, BarChart, Bar, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { ClientSelectorModal, ClientSelectorBar } from './ClientSelector';
import { NotificationCenter } from './NotificationSystem';

// ============================================================================
// CONFIGURATION & UTILITIES
// ============================================================================

const API_URL = "http://127.0.0.1:8000";

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
      <div className="flex items-center justify-center h-full text-gray-500 bg-white/5 rounded-2xl">
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
        className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
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
    <div className="fixed inset-0 -z-10 bg-[#030005]">
      {/* Deep Space Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0518] via-[#05010a] to-black" />

      {/* Animated Orbs */}
      <motion.div style={{ y: y1, opacity: 0.6 }} className="absolute -top-[10%] -right-[10%] w-[80vw] h-[80vw] bg-purple-900/20 rounded-full blur-[120px]" />
      <motion.div style={{ y: y2, opacity: 0.4 }} className="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-indigo-900/20 rounded-full blur-[100px]" />

      {/* Noise Texture for Realism */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>

      <FloatingParticles />
    </div>
  );
};

const GlassCard = ({ children, className = "", hover = false }) => (
  <motion.div
    whileHover={hover ? { y: -4, boxShadow: "0 20px 40px -10px rgba(124, 58, 237, 0.1)" } : {}}
    className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl ${className}`}
  >
    {children}
  </motion.div>
);

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
        <Flag className="w-4 h-4 text-gray-500 group-hover:text-yellow-400" />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-yellow-400" />
              Request Clarification
            </h3>

            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-gray-400">Invoice</p>
                <p className="text-sm font-bold text-white">#{invoice?.invoice_no || 'N/A'}</p>
                <p className="text-sm text-gray-300">₹{invoice?.grand_total?.toLocaleString() || 0}</p>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What do you need clarification on? e.g., 'Need GST number for this bill'"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                rows={3}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); setNote(''); }}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors"
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
              <p className="text-2xl font-bold text-white">{stats.total_unassigned || 0}</p>
              <p className="text-xs text-gray-400">Unassigned</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.uploaded_today || 0}</p>
              <p className="text-xs text-gray-400">Today</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.uploaded_this_week || 0}</p>
              <p className="text-xs text-gray-400">This Week</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.older_than_week || 0}</p>
              <p className="text-xs text-gray-400">Older (7d+)</p>
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
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-yellow-400" />
            Triage Area
          </h3>
          <button
            onClick={() => { fetchUnassigned(); fetchStats(); }}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {unassigned.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-white font-bold mb-1">All Clear!</p>
            <p className="text-gray-400 text-sm">No unassigned documents. Great job! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {unassigned.map((doc) => (
              <div
                key={`${doc.source_table}-${doc.id}`}
                className={`p-4 hover:bg-white/5 transition-colors flex items-center gap-4 ${selectedDocs.has(`${doc.source_table}-${doc.id}`) ? 'bg-purple-500/10' : ''
                  }`}
              >
                <button
                  onClick={() => toggleSelect(doc.id, doc.source_table)}
                  className="p-1"
                >
                  {selectedDocs.has(`${doc.source_table}-${doc.id}`) ? (
                    <CheckSquare className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-white truncate">
                      {doc.vendor_name || 'Unknown Vendor'}
                    </p>
                    <DocTypeBadge type={doc.doc_type || 'gst_invoice'} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
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
                  <FolderInput className="w-4 h-4 text-gray-400 hover:text-purple-400" />
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
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <FolderInput className="w-5 h-5 text-purple-400" />
              Assign to Client
            </h3>

            <div className="space-y-4">
              <p className="text-sm text-gray-400">
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
                    <p className="text-xs text-gray-400">{client.gstin || 'No GSTIN'}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAssignModal(false); setAssignClient(null); }}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400"
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

// --- 1. ENHANCED DASHBOARD COMPONENT ---
const DashboardView = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <BarChart3 className="w-10 h-10 opacity-40" />
        </motion.div>
        <h3 className="text-2xl font-bold text-white mb-2">Analytics Engine Idle</h3>
        <p className="text-gray-400">Upload invoices or enter data to wake up the AI.</p>
      </div>
    );
  }

  // Parse all invoices to extract json_data
  const parsedData = useMemo(() => data.map(parseInvoice), [data]);

  // Enhanced Calculations
  const uniqueData = parsedData.filter(d => d && d.gst_status !== "DUPLICATE BILL");

  const stats = useMemo(() => {
    let totalRevenue = 0, totalTax = 0, gstCompliance = 0, paidCount = 0;
    const monthlyData = {};
    const vendorData = {};

    uniqueData.forEach(d => {
      if (!d) return;
      const revenue = safeFloat(d.grand_total);
      const tax = safeFloat(d.igst_amount) + safeFloat(d.cgst_amount) + safeFloat(d.sgst_amount);

      totalRevenue += revenue;
      totalTax += tax;
      if (d.gst_status === "Verified") gstCompliance++;
      if (d.payment_status === "Paid") paidCount++;

      // Monthly aggregation
      const date = d.invoice_date || '2024-01-01';
      const month = date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = { revenue: 0, tax: 0, count: 0 };
      monthlyData[month].revenue += revenue;
      monthlyData[month].tax += tax;
      monthlyData[month].count += 1;

      // Vendor aggregation
      const vendor = d.vendor_name || 'Unknown';
      if (!vendorData[vendor]) vendorData[vendor] = 0;
      vendorData[vendor] += revenue;
    });

    return {
      totalRevenue,
      totalTax,
      gstCompliance,
      paidCount,
      unpaidCount: uniqueData.length - paidCount,
      monthlyData: Object.entries(monthlyData).map(([month, vals]) => ({
        month,
        revenue: vals.revenue,
        tax: vals.tax,
        count: vals.count
      })).sort((a, b) => a.month.localeCompare(b.month)),
      topVendors: Object.entries(vendorData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }))
    };
  }, [uniqueData]);

  // Chart colors
  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* KPI CARDS - Enhanced with trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            val: `₹${(stats.totalRevenue / 100000).toFixed(2)}L`,
            icon: DollarSign,
            col: "from-emerald-500 to-green-500",
            trend: stats.monthlyData.length > 1 ? ((stats.monthlyData[stats.monthlyData.length - 1].revenue - stats.monthlyData[stats.monthlyData.length - 2].revenue) / stats.monthlyData[stats.monthlyData.length - 2].revenue * 100).toFixed(1) : 0
          },
          {
            label: "Tax Liability",
            val: `₹${(stats.totalTax / 1000).toFixed(1)}K`,
            icon: FileCheck,
            col: "from-purple-500 to-pink-500",
            trend: null
          },
          {
            label: "GST Verified",
            val: `${Math.round((stats.gstCompliance / uniqueData.length) * 100)}%`,
            icon: ShieldCheck,
            col: "from-blue-500 to-cyan-500",
            trend: null
          },
          {
            label: "Payment Status",
            val: `${stats.paidCount}/${uniqueData.length}`,
            icon: CheckCircle2,
            col: "from-orange-500 to-red-500",
            sub: `${stats.unpaidCount} Pending`
          }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard hover className="p-5 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.col} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`} />
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.col} bg-opacity-10`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                {stat.trend !== null && stat.trend !== undefined && (
                  <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend > 0 ? 'text-green-400' : stat.trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {stat.trend > 0 ? <ArrowUp className="w-3 h-3" /> : stat.trend < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {Math.abs(stat.trend)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.val}</p>
              {stat.sub && <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>}
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-1">Monthly Trend</h3>
          <p className="text-xs text-gray-400 mb-4">Revenue & Tax over time</p>
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" dataKey="tax" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </GlassCard>

        {/* Top Vendors Pie Chart */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-1">Top 5 Vendors</h3>
          <p className="text-xs text-gray-400 mb-4">By revenue contribution</p>
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPie>
                <Pie
                  data={stats.topVendors}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.substring(0, 15)} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.topVendors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                  formatter={(value) => `₹${(value / 1000).toFixed(1)}K`}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </GlassCard>

        {/* Invoice Volume Bar Chart */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-1">Invoice Volume</h3>
          <p className="text-xs text-gray-400 mb-4">Monthly invoice count</p>
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </GlassCard>

        {/* Payment Status Overview */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-1">Payment Status</h3>
          <p className="text-xs text-gray-400 mb-4">Paid vs Unpaid distribution</p>
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPie>
                <Pie
                  data={[
                    { name: 'Paid', value: stats.paidCount },
                    { name: 'Unpaid', value: stats.unpaidCount }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }} />
              </RechartsPie>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </GlassCard>
      </div>
    </div>
  );
};

// --- 2. UPLOAD CENTER COMPONENT ---
const UploadView = ({ onUploadSuccess, selectedClient, clients }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const processQueue = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);
      // Pass client_id for proper document association
      if (selectedClient?.id) {
        formData.append('client_id', selectedClient.id);
      }

      try {
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        onUploadSuccess(data); // Notify parent to update data
      } catch (err) {
        console.error("Upload Failed", err);
      }
      setProgress(((i + 1) / files.length) * 100);
    }
    setFiles([]);
    setUploading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
      {/* DROP ZONE */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/50 transition-all cursor-pointer flex flex-col items-center justify-center relative group"
      >
        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />

        <div className="w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
          <Upload className="w-10 h-10 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Upload Invoices</h3>
        <p className="text-gray-400">PDF, JPG, PNG supported</p>

        {/* Animated Particles inside dropzone */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-1/2 left-1/2 w-[200px] h-[200px] bg-purple-500/10 blur-[50px] -translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/20 transition-colors" />
        </div>
      </div>

      {/* QUEUE & STATUS */}
      <GlassCard className="flex flex-col p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Processing Queue</h3>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-purple-300">{files.length} Pending</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
          {files.length === 0 && !uploading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <FileText className="w-12 h-12 mb-3 opacity-20" />
              <p>No files in queue</p>
            </div>
          )}

          <AnimatePresence>
            {files.map((file, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><FileText className="w-4 h-4 text-blue-400" /></div>
                  <span className="text-sm text-gray-300 truncate max-w-[200px]">{file.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)) }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-gray-500 hover:text-red-400" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-6 space-y-4">
          {uploading && (
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-purple-500 to-blue-500" />
            </div>
          )}

          <button
            onClick={processQueue}
            disabled={uploading || files.length === 0}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
            {uploading ? 'Extracting Data...' : 'Start Audit Engine'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

// --- 3. INVOICE REGISTER - EXCEL/TALLY POWERHOUSE ---
const InvoiceRegister = ({ data, setData }) => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [pdfView, setPdfView] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
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
    group_name: true
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
    window.open(`${API_URL}/export/tally`, '_blank');
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
      className="p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors group"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search Vendor, Invoice No, GSTIN, Amount..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Filter Dropdowns */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <select
              value={filterGST}
              onChange={(e) => setFilterGST(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
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
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear Selection
            </button>
          </motion.div>
        )}

        {/* Row 3: Info Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500">
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
            <thead className="bg-black/40 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4 border-b border-white/10">
                  <button onClick={toggleAllRows} className="hover:text-purple-400 transition-colors">
                    {selectedRows.size === processedData.length && processedData.length > 0 ?
                      <CheckSquare className="w-4 h-4" /> :
                      <Square className="w-4 h-4" />
                    }
                  </button>
                </th>
                <th className="p-4 border-b border-white/10">Action</th>
                <th className="p-4 border-b border-white/10">Status</th>
                <SortableHeader label="Vendor" sortKey="vendor_name" />
                <SortableHeader label="Inv No" sortKey="invoice_no" />
                <SortableHeader label="Date" sortKey="invoice_date" />
                {columnVisibility.hsn_code && <SortableHeader label="HSN" sortKey="hsn_code" />}
                {columnVisibility.ledger_name && <SortableHeader label="Ledger" sortKey="ledger_name" />}
                {columnVisibility.group_name && <SortableHeader label="Group" sortKey="group_name" />}
                {columnVisibility.taxable_value && <SortableHeader label="Taxable" sortKey="taxable_value" />}
                {columnVisibility.tax_amount && <th className="p-4 border-b border-white/10 text-right">Tax</th>}
                {columnVisibility.grand_total && <SortableHeader label="Total" sortKey="grand_total" />}
                {columnVisibility.gst_no && <th className="p-4 border-b border-white/10">GSTIN</th>}
                {columnVisibility.payment_status && <th className="p-4 border-b border-white/10">Payment</th>}
                <th className="p-4 border-b border-white/10">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
              {processedData.map((item) => (
                <tr key={item.id} className={`hover:bg-white/[0.02] transition-colors ${editingId === item.id ? 'bg-purple-900/10' : ''} ${selectedRows.has(item.id) ? 'bg-blue-900/10' : ''}`}>
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
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2 opacity-50 group-hover:opacity-100">
                        <button onClick={() => handleEdit(item)} className="p-1.5 hover:text-purple-400"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={item.gst_status} />
                      <StatusBadge status={item.math_status} />
                    </div>
                  </td>

                  {/* EDITABLE CELLS */}
                  <td className="p-4">{editingId === item.id ? <InputCell field="vendor_name" /> : <span className="font-medium text-white">{item.vendor_name}</span>}</td>
                  <td className="p-4">{editingId === item.id ? <InputCell field="invoice_no" /> : <span className="font-mono text-xs">{item.invoice_no}</span>}</td>
                  <td className="p-4">{editingId === item.id ? <InputCell field="invoice_date" type="date" /> : <span className="text-xs text-gray-400">{item.invoice_date}</span>}</td>

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
                    <td className="p-4 text-right font-mono text-white">
                      {editingId === item.id ? <InputCell field="taxable_value" type="number" /> : `₹${safeFloat(item.taxable_value).toLocaleString('en-IN')}`}
                    </td>
                  )}

                  {columnVisibility.tax_amount && (
                    <td className="p-4 text-right font-mono text-gray-400">
                      {editingId === item.id ?
                        <div className="flex flex-col gap-1">
                          <InputCell field="igst_amount" placeholder="IGST" />
                          <InputCell field="cgst_amount" placeholder="CGST" />
                        </div>
                        : `₹${(safeFloat(item.igst_amount) + safeFloat(item.cgst_amount) + safeFloat(item.sgst_amount)).toLocaleString('en-IN')}`}
                    </td>
                  )}

                  {columnVisibility.grand_total && (
                    <td className="p-4 text-right font-bold text-emerald-400">
                      {editingId === item.id ? <InputCell field="grand_total" type="number" /> : `₹${safeFloat(item.grand_total).toLocaleString('en-IN')}`}
                    </td>
                  )}

                  {columnVisibility.gst_no && (
                    <td className="p-4 font-mono text-xs text-gray-500">{item.gst_no}</td>
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
            className="fixed top-0 right-0 h-full w-[50%] bg-[#0a0a0a] border-l border-white/10 z-50 shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
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
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f0f11] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                <h3 className="text-xl font-bold text-white">Manual Invoice Entry</h3>
                <button onClick={() => setIsManualModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="p-8 grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Vendor Name</label>
                  <input name="vendor_name" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" placeholder="Enter Vendor Name" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Invoice No</label>
                  <input name="invoice_no" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Invoice Date</label>
                  <input name="invoice_date" type="date" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">GSTIN</label>
                  <input name="gst_no" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">HSN Code <span className="text-blue-400 font-normal">(AI Auto-fills)</span></label>
                  <input name="hsn_code" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" placeholder="Leave empty for AI detection" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Ledger Name <span className="text-purple-400 font-normal">(AI Auto-fills)</span></label>
                  <input name="ledger_name" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" placeholder="Leave empty for AI detection" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Group Name <span className="text-green-400 font-normal">(AI Auto-fills)</span></label>
                  <input name="group_name" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" placeholder="Leave empty for AI detection" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Tax Rate (%)</label>
                  <select name="tax_rate" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none">
                    <option value="18">18%</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="28">28%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Taxable Value</label>
                  <input name="taxable_value" type="number" step="0.01" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Grand Total</label>
                  <input name="grand_total" type="number" step="0.01" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div className="col-span-2 pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold shadow-lg transition-colors">Save Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// INNOVATIVE FEATURES: NOTIFICATIONS & QUICK ACTIONS
// ============================================================================



// ============================================================================
// MONTH FILTER COMPONENT - For GSTR Filing Period Selection
// ============================================================================

const MonthFilter = ({ value, onChange }) => {
  // Generate last 12 months for dropdown
  const getMonthOptions = () => {
    const options = [{ value: 'all', label: 'All Months' }];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      options.push({ value, label });
    }

    return options;
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
    >
      {getMonthOptions().map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
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
        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
      >
        <Zap className="w-5 h-5 text-yellow-400" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-14 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Quick Actions</h3>
            </div>
            <div className="p-2">
              {actions.map((action, i) => (
                <button
                  key={i}
                  className="w-full p-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-colors group"
                >
                  <div className={`p-2 rounded-lg bg-${action.color}-500/10`}>
                    <action.icon className={`w-4 h-4 text-${action.color}-400`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-white">{action.label}</p>
                    <p className="text-xs text-gray-500">{action.shortcut}</p>
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

const NoticesView = () => {
  const [notices, setNotices] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [aiReply, setAiReply] = useState('');
  const fileInputRef = useRef(null);

  const handleUploadNotice = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setAnalyzing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/legal/analyze-notice`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      const newNotice = {
        id: Date.now(),
        filename: file.name,
        upload_date: new Date().toISOString(),
        notice_type: result.notice_type || 'Unknown',
        summary: result.summary || 'Notice uploaded. AI analysis in progress...',
        suggested_reply: result.suggested_reply || '',
        status: 'pending'
      };

      setNotices(prev => [newNotice, ...prev]);
      setSelectedNotice(newNotice);
      setAiReply(result.suggested_reply || '');
    } catch (err) {
      console.error('Notice upload failed:', err);
      alert('⚠️ Failed to analyze notice. Please try again.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileWarning className="w-6 h-6 text-red-400" />
              GST Notices 📄
            </h2>
            <p className="text-sm text-gray-400">Upload government notices • Get AI-drafted replies</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl text-white font-bold shadow-lg transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Notice
          </motion.button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadNotice}
            accept=".pdf,.jpg,.png,.jpeg"
            className="hidden"
          />
        </div>
      </GlassCard>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        {/* Notices List */}
        <GlassCard className="p-6 overflow-auto">
          <h3 className="text-lg font-bold text-white mb-4">Your Notices</h3>

          {notices.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileWarning className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold text-white mb-2">No Notices Yet</p>
              <p className="text-sm text-gray-400">Upload a GST notice (ASMT-10, DRC-01, etc.)</p>
              <p className="text-xs text-gray-500 mt-2">Tax.AI will analyze and draft a reply</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => {
                    setSelectedNotice(notice);
                    setAiReply(notice.suggested_reply || '');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedNotice?.id === notice.id
                    ? 'bg-red-500/10 border-red-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <FileWarning className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{notice.notice_type}</p>
                      <p className="text-xs text-gray-400 mb-2">{notice.filename}</p>
                      <p className="text-sm text-gray-300 line-clamp-2">{notice.summary}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${notice.status === 'replied' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                      {notice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Reply Drafter */}
        <GlassCard className="p-6 flex flex-col overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-4">AI Reply Draft</h3>

          {selectedNotice ? (
            <div className="flex-1 flex flex-col">
              <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm font-bold text-red-400">{selectedNotice.notice_type}</p>
                <p className="text-xs text-gray-400">{selectedNotice.summary}</p>
              </div>

              <textarea
                value={aiReply}
                onChange={(e) => setAiReply(e.target.value)}
                placeholder="AI-drafted reply will appear here..."
                className="flex-1 bg-black/30 border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-purple-500 font-mono text-sm"
              />

              <div className="flex gap-2 mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold"
                  onClick={() => {
                    navigator.clipboard.writeText(aiReply);
                    alert('✅ Reply copied to clipboard!');
                  }}
                >
                  📋 Copy Reply
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 bg-white/10 rounded-xl text-white font-bold"
                  onClick={() => window.print()}
                >
                  🖨️ Print
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a notice to see AI reply</p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

// ============================================================================
// COMMUNICATION CENTER - MULTI-CHANNEL SYSTEM
// ============================================================================

const CommunicationCenter = ({ data }) => {
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
    fetch(`${API_URL}/clients`)
      .then(res => res.json())
      .then(setClients)
      .catch(err => console.error('Failed to load clients:', err));
  }, []);

  // Fetch scheduled communications
  useEffect(() => {
    fetch(`${API_URL}/communications/scheduled`)
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
    fetch(`${API_URL}/communications/recent`)
      .then(res => res.json())
      .then(data => setRecentComms(data || []))
      .catch(err => console.error('Failed to load recent:', err));
  }, []);

  // Fetch templates
  useEffect(() => {
    fetch(`${API_URL}/templates`)
      .then(res => res.json())
      .then(setTemplates)
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  // Fetch analytics
  useEffect(() => {
    fetch(`${API_URL}/communications/analytics`)
      .then(res => res.json())
      .then(setAnalytics)
      .catch(err => console.error('Failed to load analytics:', err));
  }, []);

  const refreshData = async () => {
    try {
      const [scheduled, recent, analyticsRes] = await Promise.all([
        fetch(`${API_URL}/communications/scheduled`).then(r => r.json()),
        fetch(`${API_URL}/communications/recent`).then(r => r.json()),
        fetch(`${API_URL}/communications/analytics`).then(r => r.json())
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

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            <h2 className="text-2xl font-bold text-white">Communication Center</h2>
            <p className="text-sm text-gray-400">Manage all client communications • {clients.length} clients</p>
          </div>

          <div className="flex gap-2">
            {['overview', 'schedule', 'history', 'analytics'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-2 rounded-lg transition-colors capitalize ${activeView === view ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
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
              <p className="text-sm font-bold text-white">WhatsApp</p>
              <p className="text-xs text-gray-400">Send message</p>
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
              <p className="text-sm font-bold text-white">Schedule Call</p>
              <p className="text-xs text-gray-400">Set reminder</p>
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
              <p className="text-sm font-bold text-white">Email</p>
              <p className="text-xs text-gray-400">Send email</p>
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
              <p className="text-sm font-bold text-white">SMS</p>
              <p className="text-xs text-gray-400">Send text</p>
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
                <h3 className="text-lg font-bold text-white">Quick Contact</h3>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                  {clients.length} clients
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {clients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No clients found</p>
                    <p className="text-xs text-gray-600">Add clients to start communicating</p>
                  </div>
                ) : (
                  clients.slice(0, 8).map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{client.company_name}</p>
                        <p className="text-xs text-gray-400">{client.phone || 'No phone'}</p>
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
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <button onClick={refreshData} className="p-1.5 hover:bg-white/10 rounded transition-colors">
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                {recentComms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent communications</p>
                    <p className="text-xs text-gray-600">Start by sending a WhatsApp message!</p>
                  </div>
                ) : (
                  recentComms.slice(0, 5).map((comm, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
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
                            <p className="text-xs text-gray-500">{comm.timestamp}</p>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{comm.message?.substring(0, 60)}...</p>
                          <span className={`text-xs font-bold ${comm.status === 'delivered' || comm.status === 'sent' ? 'text-green-400' : 'text-gray-400'}`}>
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
                  <p className="text-xs text-gray-400">WhatsApp sent</p>
                </div>

                <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Phone className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analytics.calls?.completed || 0}</p>
                  <p className="text-xs text-gray-400">Calls scheduled</p>
                </div>

                <div className="text-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <Mail className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analytics.email?.sent || 0}</p>
                  <p className="text-xs text-gray-400">Emails sent</p>
                </div>

                <div className="text-center p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <MessageCircle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analytics.sms?.sent || 0}</p>
                  <p className="text-xs text-gray-400">SMS delivered</p>
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
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {scheduledComms.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold text-white mb-2">No Scheduled Communications</p>
                <p className="text-sm text-gray-400">Click "Schedule Call" to add a reminder</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledComms.map((comm, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className={`p-3 rounded-lg ${comm.channel === 'call' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                      {comm.channel === 'call' ? <Phone className="w-5 h-5 text-blue-400" /> : <MessageSquare className="w-5 h-5 text-green-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{comm.client_name || 'Unknown Client'}</p>
                      <p className="text-sm text-gray-400">{comm.message || comm.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-400">{comm.scheduled_time}</p>
                      <p className="text-xs text-gray-500">{comm.status}</p>
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
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {recentComms.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold text-white mb-2">No Communication History</p>
                <p className="text-sm text-gray-400">Send a message to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentComms.map((comm, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
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
                            <span className="text-xs text-gray-500">{comm.timestamp}</span>
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
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.whatsapp?.sent || 0) * 10, 100)}%` }} />
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
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.calls?.completed || 0) * 10, 100)}%` }} />
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
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.email?.sent || 0) * 10, 100)}%` }} />
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
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min((analytics.sms?.sent || 0) * 10, 100)}%` }} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-4xl font-bold text-white">{analytics.today_total || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Messages Today</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-4xl font-bold text-white">
                    {(analytics.whatsapp?.sent || 0) + (analytics.email?.sent || 0) + (analytics.sms?.sent || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Total Messages</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-4xl font-bold text-white">{clients.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Active Clients</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-4xl font-bold text-white">{scheduledComms.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Scheduled</p>
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
        className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Compose Message - {channel}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Select Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
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

          {channel === 'email' && (
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Template (Optional)</label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                const template = templates.find(t => t.id === parseInt(e.target.value));
                if (template) setMessage(template.body);
              }}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Write custom message...</option>
              {templates.filter(t => t.channel === channel).map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Write your ${channel} message...`}
              rows={6}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none"
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
              <span className="text-sm text-gray-400">Send Now</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!sendNow}
                onChange={() => setSendNow(false)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-400">Schedule</span>
            </label>

            {!sendNow && (
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                required={!sendNow}
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-colors"
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
        </form>
      </motion.div>
    </motion.div>
  );
};



// ============================================================================
// PHASE 2: AI SEARCH "JARVIS" COMPONENT WITH VOICE
// ============================================================================

const JarvisSearch = ({ onResults, onClose, activeTab, selectedClient }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

    try {
      const res = await fetch(`${API_URL}/search/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: {
            current_tab: activeTab || 'dashboard',
            selected_client: selectedClient?.company_name || null,
            client_id: selectedClient?.id || null
          }
        })
      });
      const results = await res.json();

      if (results.error) {
        setError(results.error);
      } else {
        onResults(results);
        onClose();
      }
    } catch (err) {
      setError("Failed to connect to AI search. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
        className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl w-full max-w-2xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Jarvis AI Search</h3>
              <p className="text-xs text-gray-400">Ask me anything about your invoices</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try: "Show unpaid invoices above 50k" or "Find all bills from Ratan Diesels"'
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
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
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-colors"
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

        <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5">
          <p className="text-xs text-gray-400 mb-2 font-bold">Example Queries:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Show all unpaid invoices",
              "Find bills above 1 lakh",
              "List invoices from last month",
              "Show verified GST invoices"
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setQuery(example)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN APPLICATION SHELL
// ============================================================================

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [showJarvis, setShowJarvis] = useState(false);
  const [aiSearchResults, setAISearchResults] = useState(null);

  // 🆕 V2.0: Client & Document Management
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('gst_invoice');
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [triageStats, setTriageStats] = useState({ total_unassigned: 0 });
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all', '2026-01', '2025-12', etc.
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Filter data by selected month
  const filteredData = useMemo(() => {
    if (selectedMonth === 'all') return data;

    return data.filter(invoice => {
      // Try to get date from multiple possible fields
      const dateStr = invoice.date || invoice.invoice_date || invoice.bill_date || invoice.created_at;
      if (!dateStr) return false;

      try {
        const invoiceDate = new Date(dateStr);
        const invoiceMonth = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
        return invoiceMonth === selectedMonth;
      } catch {
        return false;
      }
    });
  }, [data, selectedMonth]);

  // --- LOAD HISTORY & CLIENTS ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/history`);
        const histData = await res.json();
        if (histData) setData(histData);
      } catch (err) { console.error("History Load Error", err); }
    };

    const fetchClients = async () => {
      try {
        const res = await fetch(`${API_URL}/clients`);
        const clientData = await res.json();
        setClients(clientData);
      } catch (err) { console.error("Clients Load Error", err); }
    };

    const fetchPendingReviewCount = async () => {
      try {
        const res = await fetch(`${API_URL}/documents/stats`);
        const stats = await res.json();
        setPendingReviewCount(stats.pending + stats.needs_review);
      } catch (err) { console.error("Stats Load Error", err); }
    };

    const fetchTriageStats = async () => {
      try {
        const res = await fetch(`${API_URL}/triage/stats`);
        const stats = await res.json();
        setTriageStats(stats);
      } catch (err) { console.error("Triage Stats Error", err); }
    };

    fetchHistory();
    fetchClients();
    fetchPendingReviewCount();
    fetchTriageStats();
  }, []);

  // Handle AI Search Results
  const handleAIResults = (results) => {
    setAISearchResults(results);
    setActiveTab('register'); // Switch to register tab to show results
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
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const result = await res.json();

      if (result.error) {
        alert(`⚠️ ${result.error}`);
      } else {
        // Refresh data
        const histRes = await fetch(`${API_URL}/history`);
        const histData = await histRes.json();
        if (histData) setData(histData);

        // Refresh pending count
        const statsRes = await fetch(`${API_URL}/documents/stats`);
        const stats = await statsRes.json();
        setPendingReviewCount(stats.pending + stats.needs_review);

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
    { id: 'dashboard', label: 'Dashboard 📊', icon: LayoutDashboard, gradient: 'from-blue-600 to-cyan-600' },
    { id: 'upload', label: 'Add Bills ➕', icon: Upload, gradient: 'from-purple-600 to-pink-600' },
    { id: 'register', label: 'Bill Register 📋', icon: FileText, gradient: 'from-emerald-600 to-teal-600' },
    { id: 'triage', label: 'Pending ⚠️', icon: Inbox, gradient: 'from-yellow-600 to-orange-600', badge: triageStats?.total_unassigned },
    { id: 'comms', label: 'Messages 💬', icon: MessageSquare, gradient: 'from-orange-600 to-red-600' },
    { id: 'notices', label: 'Notices 📄', icon: FileWarning, gradient: 'from-red-600 to-pink-600' },
  ];

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden selection:bg-purple-500/30">
      <MeshBackground />

      {/* SIDEBAR */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="w-20 lg:w-72 bg-white/[0.02] backdrop-blur-3xl border-r border-white/10 flex flex-col z-50 transition-all duration-300"
      >
        <div className="p-6 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-xl tracking-wide">TAX.AI</h1>
            <p className="text-[10px] text-purple-400 font-medium tracking-widest">ENTERPRISE OS</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              {activeTab === tab.id && (
                <motion.div layoutId="nav-bg" className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-20 rounded-xl border border-white/10`} />
              )}
              <tab.icon className={`w-5 h-5 relative z-10 ${activeTab === tab.id ? 'text-white' : 'group-hover:text-purple-300'}`} />
              <span className="font-medium relative z-10 hidden lg:block">{tab.label}</span>
              {/* Badge for counts */}
              {tab.badge > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded-full z-10">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />}
            </button>
          ))}
        </nav>

        <div className="p-4 hidden lg:block">
          <GlassCard className="p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg"><Zap className="w-4 h-4 text-purple-300" /></div>
              <div>
                <p className="text-xs font-bold text-white">System Status</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
            <p className="text-xs text-gray-500">
              {activeTab === 'register' ? 'Manage and Edit Data' : 'AI Powered Audit System'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month Filter - for GSTR Filing */}
            <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />

            {/* Notifications */}
            <NotificationCenter invoices={data} />

            {/* Quick Actions */}
            <QuickActions />

            {/* Tax.AI Search Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowJarvis(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-bold shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Tax.AI 🤖</span>
            </motion.button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> DB Connected
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 border-2 border-white/10" />
          </div>
        </header>

        {/* VIEWPORT */}
        <div className="flex-1 p-8 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode='wait'>

            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full">
                <DashboardView data={filteredData} />
              </motion.div>
            )}

            {activeTab === 'upload' && (
              <motion.div key="up" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <UploadView
                  onUploadSuccess={(newItem) => setData(prev => [newItem, ...prev])}
                  selectedClient={selectedClient}
                  clients={clients}
                />
              </motion.div>
            )}

            {activeTab === 'register' && (
              <motion.div key="reg" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
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
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-xs text-purple-300 mt-1">Showing {aiSearchResults.length} results</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'comms' && (
              <motion.div key="comms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <CommunicationCenter data={data} />
              </motion.div>
            )}

            {activeTab === 'notices' && (
              <motion.div key="notices" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
                <NoticesView />
              </motion.div>
            )}

            {activeTab === 'triage' && (
              <motion.div key="triage" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                <TriageView
                  clients={clients}
                  onRefresh={async () => {
                    const res = await fetch(`${API_URL}/triage/stats`);
                    setTriageStats(await res.json());
                    const histRes = await fetch(`${API_URL}/history`);
                    setData(await histRes.json());
                  }}
                />
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;