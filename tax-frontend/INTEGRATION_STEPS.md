# Frontend Integration Steps for Tax.AI v2.0

## ✅ Completed
1. Added `Building2` icon to imports ✅
2. Created `ClientSelector.jsx` component ✅
3. Added state variables to App.jsx (lines 546-552) ✅
4. Backend is 100% ready ✅

## 🔧 Remaining Manual Steps

### Step 1: Import ClientSelector Components

At the top of `tax-frontend/src/App.jsx`, add this import after the lucide-react imports:

```javascript
import { ClientSelectorModal, ClientSelectorBar } from './ClientSelector';
```

### Step 2: Add Fetch Functions

Find the `InvoiceRegister` component (around line 522) and add these functions BEFORE the `processedData` useMemo:

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

// Load clients on mount
useEffect(() => {
  fetchClients();
  fetchPendingReviewCount();
}, []);
```

### Step 3: Find and Update handleUpload

Search for `const handleUpload = async (e) => {` (it's in the main App component, not InvoiceRegister).

Replace the ENTIRE handleUpload function with:

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
  formData.append('entered_by', 'System');
  
  try {
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    const result = await res.json();
    
    if (result.error) {
      alert(`⚠️ ${result.error}`);
    } else {
      await fetchHistory();
      await fetchPendingReviewCount();
      
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

### Step 4: Add Client Selector Bar to UI

In the main App return statement, find where the tabs are rendered (search for `{/* TABS */}`).

ADD THIS **BEFORE** the tabs section:

```jsx
{/* CLIENT SELECTOR BAR */}
<ClientSelectorBar 
  selectedClient={selectedClient}
  onOpenSelector={() => setShowClientSelector(true)}
  selectedDocType={selectedDocType}
  setSelectedDocType={setSelectedDocType}
/>
```

### Step 5: Add Client Selector Modal to UI

At the very end of the main return statement (before the closing `</div>`), add:

```jsx
{/* CLIENT SELECTOR MODAL */}
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

### Step 6: Update Header with v2.0 Badge

Find the header `<h1>` tag and update it to:

```jsx
<h1 className="text-3xl font-black text-white tracking-tight">
  Tax<span className="text-purple-400">.AI</span> 
  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full ml-2">v2.0</span>
</h1>
<p className="text-sm text-gray-400 mt-1">Multi-Tenant CA Office Management System</p>
```

And add pending review badge:

```jsx
{pendingReviewCount > 0 && (
  <div className="px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg">
    <span className="text-xs text-orange-300 font-bold">
      ⚠️ {pendingReviewCount} Pending Review
    </span>
  </div>
)}
```

---

## 🧪 Testing Steps

1. **Open http://localhost:5176** in browser
2. Check console for errors
3. Click "Select Client to Start" button
4. Modal should open with search
5. Create test clients first (see below)
6. Select a client
7. Choose document type
8. Upload a file
9. Check success message shows client + confidence

---

## 📝 Create Test Clients

Run these commands in terminal:

```bash
# Client 1
curl -X POST http://localhost:8000/clients \
  -H "Content-Type: application/json" \
  -d '{"company_name": "ABC Pvt Ltd", "phone": "9876543210", "gstin": "27AABCU9603R1ZM"}'

# Client 2
curl -X POST http://localhost:8000/clients \
  -H "Content-Type: application/json" \
  -d '{"company_name": "XYZ Industries", "phone": "9876543211", "gstin": "29AABCU9603R1ZX"}'

# Client 3
curl -X POST http://localhost:8000/clients \
  -H "Content-Type: application/json" \
  -d '{"company_name": "DEF Traders", "phone": "9876543212"}'
```

Then refresh the frontend and click "Select Client" to see them!

---

## ⚠️ Common Issues

### Issue: "Cannot read property 'id' of null"
**Fix:** Make sure client is selected before upload

### Issue: Modal doesn't open
**Fix:** Check that `ClientSelector.jsx` import is correct

### Issue: Upload fails with 422 error
**Fix:** Backend expects `client_id` - make sure it's being sent

---

## 🎯 What This Achieves

- ✅ Multi-tenant client isolation
- ✅ Document type classification
- ✅ Client-specific upload
- ✅ Confidence-based messaging
- ✅ Pending review tracking

**Next: Test with real invoices and see the magic! 🚀**
