import { useState, useRef, useEffect, useMemo, Component } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  Upload, Loader2, ShieldCheck, LayoutDashboard, MessageSquare, 
  Download, Play, TrendingUp, FileCheck, AlertCircle, CheckCircle2,
  Sparkles, Zap, BarChart3, ChevronRight, Eye, Shield, X, FileText,
  Search, Filter, Trash2, Edit2, Save, Plus, FileInput, MoreVertical,
  Printer, ArrowUpRight, XCircle, AlertTriangle, Check
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

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

// ============================================================================
// SUB-COMPONENTS (TABS)
// ============================================================================

// --- 1. DASHBOARD COMPONENT ---
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

  // Logic: Ignore Duplicates
  let totalRevenue = 0, totalTax = 0, gstCompliance = 0;
  const uniqueData = data.filter(d => d.gst_status !== "DUPLICATE BILL");
  
  uniqueData.forEach(d => {
    totalRevenue += safeFloat(d.grand_total);
    totalTax += safeFloat(d.igst_amount) + safeFloat(d.cgst_amount) + safeFloat(d.sgst_amount);
    if(d.gst_status === "Verified") gstCompliance++;
  });

  const chartData = uniqueData.map((d, i) => ({
    name: `Inv ${i+1}`,
    amount: safeFloat(d.grand_total),
    tax: safeFloat(d.igst_amount) + safeFloat(d.cgst_amount) + safeFloat(d.sgst_amount)
  }));

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Revenue", val: `₹${(totalRevenue/100000).toFixed(2)}L`, icon: TrendingUp, col: "from-blue-500 to-cyan-500" },
          { label: "Total Tax Liability", val: `₹${(totalTax/1000).toFixed(1)}K`, icon: FileCheck, col: "from-purple-500 to-pink-500" },
          { label: "GST Accuracy", val: `${Math.round((gstCompliance/uniqueData.length)*100)}%`, icon: ShieldCheck, col: "from-emerald-500 to-green-500" },
          { label: "Active Invoices", val: uniqueData.length, icon: FileText, col: "from-orange-500 to-red-500" }
        ].map((stat, i) => (
          <GlassCard key={i} hover className="p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.col} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.col} bg-opacity-10`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">LIVE</span>
            </div>
            <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">{stat.label}</p>
            <p className="text-3xl font-bold text-white mt-1 tracking-tight">{stat.val}</p>
          </GlassCard>
        ))}
      </div>

      {/* MAIN CHART */}
      <GlassCard className="p-8 h-[450px]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-white">Revenue vs Tax Trend</h3>
            <p className="text-sm text-gray-400">Excluding duplicate entries</p>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 text-xs text-gray-400"><div className="w-3 h-3 rounded-full bg-purple-500"></div>Revenue</div>
             <div className="flex items-center gap-2 text-xs text-gray-400"><div className="w-3 h-3 rounded-full bg-cyan-500"></div>Tax</div>
          </div>
        </div>
        <ChartErrorBoundary>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis stroke="#6b7280" tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fill="url(#colRev)" />
              <Area type="monotone" dataKey="tax" stroke="#06b6d4" strokeWidth={3} fill="url(#colTax)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </GlassCard>
    </div>
  );
};

// --- 2. UPLOAD CENTER COMPONENT ---
const UploadView = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const processQueue = async () => {
    if(files.length === 0) return;
    setUploading(true);
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);

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

// --- 3. INVOICE REGISTER (THE NEW POWERHOUSE) ---
const InvoiceRegister = ({ data, setData }) => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [pdfView, setPdfView] = useState(null); // URL of PDF to show
  const [filteredData, setFilteredData] = useState(data);

  // Filter Logic
  useEffect(() => {
    setFilteredData(data.filter(item => 
      item.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
      String(item.grand_total).includes(search)
    ));
  }, [search, data]);

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
    if(!confirm("Are you sure you want to delete this invoice record?")) return;
    
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

  // --- RENDER HELPERS ---
  const InputCell = ({ field, type = "text" }) => (
    <input 
      type={type}
      value={editForm[field] || ''}
      onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
      className="w-full bg-black/50 border border-purple-500/50 rounded px-2 py-1 text-white text-xs focus:outline-none"
    />
  );

  return (
    <div className="h-full flex flex-col relative">
      {/* TOOLBAR */}
      <GlassCard className="p-4 mb-6 flex flex-wrap gap-4 justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search Vendor, Invoice No, Amount..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10"><Filter className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setIsManualModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Bill
          </button>
          <button onClick={handleExportTally} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors">
            <FileText className="w-4 h-4" /> Tally XML
          </button>
        </div>
      </GlassCard>

      {/* DATA GRID */}
      <GlassCard className="flex-1 overflow-hidden flex flex-col relative">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/40 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4 border-b border-white/10">Action</th>
                <th className="p-4 border-b border-white/10">Status</th>
                <th className="p-4 border-b border-white/10">Vendor</th>
                <th className="p-4 border-b border-white/10">Inv No</th>
                <th className="p-4 border-b border-white/10 text-right">Taxable</th>
                <th className="p-4 border-b border-white/10 text-right">Tax</th>
                <th className="p-4 border-b border-white/10 text-right">Total</th>
                <th className="p-4 border-b border-white/10">GSTIN</th>
                <th className="p-4 border-b border-white/10">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
              {filteredData.map((item) => (
                <tr key={item.id} className={`hover:bg-white/[0.02] transition-colors ${editingId === item.id ? 'bg-purple-900/10' : ''}`}>
                  <td className="p-4">
                    {editingId === item.id ? (
                      <div className="flex gap-2">
                        <button onClick={handleSave} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"><Save className="w-4 h-4"/></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30"><X className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <div className="flex gap-2 opacity-50 group-hover:opacity-100">
                        <button onClick={() => handleEdit(item)} className="p-1.5 hover:text-purple-400"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button>
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
                  
                  <td className="p-4 text-right font-mono text-white">
                    {editingId === item.id ? <InputCell field="taxable_value" type="number"/> : `₹${safeFloat(item.taxable_value).toLocaleString('en-IN')}`}
                  </td>
                  <td className="p-4 text-right font-mono text-gray-400">
                     {editingId === item.id ? 
                       <div className="flex flex-col gap-1">
                         <InputCell field="igst_amount" placeholder="IGST"/>
                         <InputCell field="cgst_amount" placeholder="CGST"/> 
                       </div>
                     : `₹${(safeFloat(item.igst_amount) + safeFloat(item.cgst_amount) + safeFloat(item.sgst_amount)).toLocaleString('en-IN')}`}
                  </td>
                  <td className="p-4 text-right font-bold text-emerald-400">
                    {editingId === item.id ? <InputCell field="grand_total" type="number"/> : `₹${safeFloat(item.grand_total).toLocaleString('en-IN')}`}
                  </td>

                  <td className="p-4 font-mono text-xs text-gray-500">{item.gst_no}</td>
                  
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
              <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5"/> Original Invoice</h3>
              <button onClick={() => setPdfView(null)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5"/></button>
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
                <button onClick={() => setIsManualModalOpen(false)}><X className="w-5 h-5 text-gray-400"/></button>
              </div>
              <form onSubmit={handleManualSubmit} className="p-8 grid grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Vendor Name</label>
                   <input name="vendor_name" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" placeholder="Enter Vendor Name"/>
                </div>
                <div>
                   <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Invoice No</label>
                   <input name="invoice_no" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"/>
                </div>
                <div>
                   <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Invoice Date</label>
                   <input name="invoice_date" type="date" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"/>
                </div>
                <div>
                   <label className="text-xs text-gray-400 uppercase font-bold block mb-2">GSTIN</label>
                   <input name="gst_no" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"/>
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
                   <input name="taxable_value" type="number" step="0.01" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"/>
                </div>
                <div>
                   <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Grand Total</label>
                   <input name="grand_total" type="number" step="0.01" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"/>
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
// MAIN APPLICATION SHELL
// ============================================================================

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  
  // --- LOAD HISTORY ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/history`);
        const histData = await res.json();
        if(histData) setData(histData);
      } catch (err) { console.error("History Load Error", err); }
    };
    fetchHistory();
  }, []);

  // --- NAVIGATION ---
  const tabs = [
    { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard, gradient: 'from-blue-600 to-cyan-600' },
    { id: 'upload', label: 'Upload', icon: Upload, gradient: 'from-purple-600 to-pink-600' },
    { id: 'register', label: 'Invoices', icon: FileText, gradient: 'from-emerald-600 to-teal-600' }, // NEW TAB
    { id: 'comms', label: 'Comms', icon: MessageSquare, gradient: 'from-orange-600 to-red-600' },
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
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
                activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {activeTab === tab.id && (
                 <motion.div layoutId="nav-bg" className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-20 rounded-xl border border-white/10`} />
              )}
              <tab.icon className={`w-5 h-5 relative z-10 ${activeTab === tab.id ? 'text-white' : 'group-hover:text-purple-300'}`} />
              <span className="font-medium relative z-10 hidden lg:block">{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />}
            </button>
          ))}
        </nav>

        <div className="p-4 hidden lg:block">
          <GlassCard className="p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg"><Zap className="w-4 h-4 text-purple-300"/></div>
              <div>
                <p className="text-xs font-bold text-white">System Status</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Online</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* HEADER */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
            <p className="text-xs text-gray-500">
              {activeTab === 'register' ? 'Manage and Edit Data' : 'AI Powered Audit System'}
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400">
               <span className="w-2 h-2 rounded-full bg-green-500"></span> DB Connected
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 border-2 border-white/10" />
          </div>
        </header>

        {/* VIEWPORT */}
        <div className="flex-1 p-8 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode='wait'>
            
            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="h-full">
                <DashboardView data={data} />
              </motion.div>
            )}

            {activeTab === 'upload' && (
              <motion.div key="up" initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -20}} className="h-full">
                <UploadView onUploadSuccess={(newItem) => setData(prev => [newItem, ...prev])} />
              </motion.div>
            )}

            {activeTab === 'register' && (
              <motion.div key="reg" initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.95}} className="h-full">
                <InvoiceRegister data={data} setData={setData} />
              </motion.div>
            )}

            {activeTab === 'comms' && (
               <motion.div key="comms" initial={{opacity: 0}} animate={{opacity: 1}} className="h-full flex items-center justify-center">
                 <GlassCard className="p-12 text-center max-w-lg">
                   <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                     <MessageSquare className="w-10 h-10 text-green-400" />
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-2">WhatsApp Integration</h3>
                   <p className="text-gray-400 mb-8">Connect your business API to send automated payment reminders.</p>
                   <button className="px-6 py-3 bg-green-600 rounded-xl font-bold text-white hover:bg-green-500 transition-colors">Configure API</button>
                 </GlassCard>
               </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;