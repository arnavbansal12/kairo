# Frontend Implementation Guide - Tax.AI v2.0
## Client & Vendor Management System

**Status:** Backend 100% Complete | Frontend Needs Updates  
**Date:** January 7, 2026

---

## ✅ **What's Already Done**

### **Backend (100% Complete)**
- ✅ 8 database tables created with relationships
- ✅ 25+ API endpoints for clients, vendors, documents, review
- ✅ Smart vendor autocomplete system
- ✅ Approval workflow with confidence scoring
- ✅ Multi-tenant client isolation
- ✅ All endpoints tested and working

### **Frontend State Added**
- ✅ Added client state management variables to App.jsx (lines 546-552):
  ```javascript
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('gst_invoice');
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  ```

---

## 🔧 **What Needs To Be Added to Frontend**

### **Step 1: Add Missing Import**
At the top of `tax-frontend/src/App.jsx`, add `Building2` to the imports:

```javascript
import { 
  Upload, Loader2, ShieldCheck, LayoutDashboard, MessageSquare, 
  Download, Play, TrendingUp, FileCheck, AlertCircle, CheckCircle2,
  Sparkles, Zap, BarChart3, ChevronRight, Eye, Shield, X, FileText,
  Search, Filter, Trash2, Edit2, Save, Plus, FileInput, MoreVertical,
  Printer, ArrowUpRight, XCircle, AlertTriangle, Check, PieChart as PieChartIcon,
  DollarSign, Calendar, Users, Package, ArrowUp, ArrowDown, Minus,
  ChevronsUpDown, CheckSquare, Square, RefreshCw, FileSpreadsheet, Mic, MicOff,
  Bell, BellOff, Volume2, Download as DownloadIcon, MessageCircle,
  Building2  // <-- ADD THIS
} from 'lucide-react';
```

---

### **Step 2: Add Data Fetching Functions**

Find the `App` component (around line 2000) and add these functions after the existing `fetchHistory` function:

```javascript
// Fetch clients from backend
const fetchClients = async () => {
  try {
    const res = await fetch(`${API_URL}/clients`);
    const data = await res.json();
    setClients(data);
  } catch (error) {
    console.error('Failed to fetch clients:', error);
  }
};

// Fetch pending review count
const fetchPendingReviewCount = async () => {
  try {
    const res = await fetch(`${API_URL}/documents/stats`);
    const data = await res.json();
    setPendingReviewCount(data.pending + data.needs_review);
  } catch (error) {
    console.error('Failed to fetch pending count:', error);
  }
};
```

---

### **Step 3: Update useEffect to Load Clients**

Find the `useEffect` that calls `fetchHistory()` and update it:

```javascript
useEffect(() => {
  fetchHistory();
  fetchClients();        // ADD THIS
  fetchPendingReviewCount();  // ADD THIS
}, []);
```

---

### **Step 4: Update handleUpload Function**

Find the `handleUpload` function and replace it with:

```javascript
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
  formData.append('entered_by', 'System'); // TODO: Add actual user name
  
  try {
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    const result = await res.json();
    
    if (result.error) {
      alert(`⚠️ ${result.error}`);
    } else {
      await fetchHistory();
      await fetchPendingReviewCount();
      
      // Show confidence-based message
      const confidenceEmoji = {
        'high': '✅',
        'medium': '🟡',
        'low': '⚠️'
      };
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
```

---

### **Step 5: Add Client Selector Modal Component**

Add this component before the main `App` component (around line 1900):

```javascript
// Client Selector Modal Component
const ClientSelectorModal = ({ clients, onSelect, onClose, search, setSearch }) => {
  const filteredClients = clients.filter(c => 
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-400" />
              Select Client
            </h3>
            <p className="text-sm text-gray-400 mt-1">Choose a client to upload documents</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by name, GSTIN, or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        
        {/* Client List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No clients found</p>
            </div>
          )}
          
          {filteredClients.map((client) => (
            <motion.button
              key={client.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                onSelect(client);
                onClose();
              }}
              className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">
                    {client.company_name}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">{client.gstin || 'No GSTIN'}</p>
                  {client.phone && (
                    <p className="text-xs text-gray-500 mt-0.5">📱 {client.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {client.status}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-colors">
            + Add New Client
          </button>
        </div>
      </motion.div>
    </div>
  );
};
```

---

### **Step 6: Add Client Selector Bar to Main UI**

In the main `return` of the `App` component, find where the tabs are rendered and add the client selector bar BEFORE the tabs section:

```javascript
{/* 🆕 CLIENT SELECTOR BAR */}
<div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-white/10">
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-2">
      <Building2 className="w-5 h-5 text-purple-400" />
      <span className="text-sm text-gray-400">Selected Client:</span>
    </div>
    
    {selectedClient ? (
      <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
        <div>
          <div className="text-white font-semibold">{selectedClient.company_name}</div>
          <div className="text-xs text-gray-400">{selectedClient.gstin || 'No GSTIN'}</div>
        </div>
        <button 
          onClick={() => setShowClientSelector(true)}
          className="p-1 hover:bg-white/10 rounded"
        >
          <Edit2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    ) : (
      <button
        onClick={() => setShowClientSelector(true)}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-colors"
      >
        📋 Select Client to Start
      </button>
    )}
    
    {/* Document Type Selector */}
    {selectedClient && (
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-gray-400">Document Type:</span>
        <select
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
          className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
        >
          <option value="gst_invoice">📄 GST Invoice</option>
          <option value="bank_statement">🏦 Bank Statement</option>
          <option value="payment_receipt">💰 Payment Receipt</option>
          <option value="expense_bill">🧾 Expense Bill</option>
          <option value="credit_note">↩️ Credit Note</option>
          <option value="debit_note">↪️ Debit Note</option>
        </select>
      </div>
    )}
  </div>
</div>

{/* Render Client Selector Modal */}
<AnimatePresence>
  {showClientSelector && (
    <ClientSelectorModal 
      clients={clients}
      onSelect={setSelectedClient}
      onClose={() => setShowClientSelector(false)}
      search={clientSearch}
      setSearch={setClientSearch}
    />
  )}
</AnimatePresence>
```

---

### **Step 7: Update Header with Pending Review Badge**

Find the header section and update it:

```javascript
<div className="flex items-center justify-between p-6 border-b border-white/10">
  <div>
    <h1 className="text-3xl font-black text-white tracking-tight">
      Tax<span className="text-purple-400">.AI</span> 
      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full ml-2">v2.0</span>
    </h1>
    <p className="text-sm text-gray-400 mt-1">Multi-Tenant CA Office Management System</p>
  </div>
  <div className="flex items-center gap-4">
    {/* Pending Review Badge */}
    {pendingReviewCount > 0 && (
      <div className="px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg">
        <span className="text-xs text-orange-300 font-bold">
          ⚠️ {pendingReviewCount} Pending Review
        </span>
      </div>
    )}
    
    <NotificationCenter invoices={data} />
    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors" title="Settings">
      <Settings className="w-5 h-5 text-gray-400" />
    </button>
  </div>
</div>
```

---

## 🎯 **Quick Implementation Steps**

1. **Add `Building2` to imports** (Step 1)
2. **Add fetch functions** (Step 2)
3. **Update useEffect** (Step 3)
4. **Update handleUpload** (Step 4)
5. **Add ClientSelectorModal component** (Step 5)
6. **Add client selector bar to UI** (Step 6)
7. **Update header** (Step 7)

---

## 🧪 **Testing Checklist**

After implementing:

- [ ] Frontend loads without errors
- [ ] Client selector modal opens
- [ ] Can search and select clients
- [ ] Upload requires client selection
- [ ] Document type selector appears after client selection
- [ ] Pending review count shows in header
- [ ] Upload success shows confidence level

---

## 📱 **Expected User Flow**

1. User opens Tax.AI v2.0
2. Sees "Select Client to Start" button
3. Clicks → Client selector modal opens
4. Searches and selects "ABC Pvt Ltd"
5. Client name appears in selector bar
6. Document type dropdown appears
7. Selects "GST Invoice" or "Bank Statement"
8. Uploads file
9. AI processes with confidence scoring
10. Success message shows client + confidence
11. Document appears in table

---

## 🚀 **Next Features to Add (Phase 3)**

1. **Review Dashboard Tab** - Show pending documents
2. **Vendor Autocomplete** - Smart vendor suggestions
3. **Add New Client Button** - Create clients from UI
4. **Client Management Tab** - View/edit all clients
5. **Document Type Badges** - Show icons for different doc types

---

**Status: Ready for Frontend Integration!**

The backend is 100% complete and tested. Follow this guide to complete the frontend in 7 steps.
