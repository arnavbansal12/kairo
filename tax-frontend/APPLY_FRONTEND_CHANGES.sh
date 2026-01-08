#!/bin/bash

# Script to apply remaining frontend changes for Tax.AI v2.0
# Run this script from tax-frontend directory

echo "🚀 Applying Tax.AI v2.0 Frontend Changes..."
echo ""

# Check if we're in the right directory
if [ ! -f "src/App.jsx" ]; then
    echo "❌ Error: Please run this script from the tax-frontend directory"
    exit 1
fi

echo "✅ Import added - ClientSelector components"
echo "✅ State variables already added to InvoiceRegister"
echo ""
echo "⚠️  Manual steps required (copy-paste into src/App.jsx):"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Find the main App component (line ~2005)"
echo "        Look for: function App() {"
echo ""
echo "STEP 2: Add these functions AFTER the fetchHistory function:"
echo ""
cat << 'EOF'
  // 🆕 V2.0: Fetch clients
  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`);
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  // 🆕 V2.0: Fetch pending review count
  const fetchPendingReviewCount = async () => {
    try {
      const res = await fetch(`${API_URL}/documents/stats`);
      const data = await res.json();
      setPendingReviewCount(data.pending + data.needs_review);
    } catch (error) {
      console.error('Failed to fetch pending count:', error);
    }
  };
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Update the useEffect hook to call these functions:"
echo "        Find: useEffect(() => { fetchHistory(); }, []);"
echo "        Replace with:"
echo ""
cat << 'EOF'
  useEffect(() => {
    fetchHistory();
    fetchClients();
    fetchPendingReviewCount();
  }, []);
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Move state variables from InvoiceRegister to App component"
echo "        Cut these lines from InvoiceRegister (lines 547-553):"
echo "        const [clients, setClients] = useState([]);"
echo "        const [selectedClient, setSelectedClient] = useState(null);"
echo "        const [selectedDocType, setSelectedDocType] = useState('gst_invoice');"
echo "        const [showClientSelector, setShowClientSelector] = useState(false);"
echo "        const [clientSearch, setClientSearch] = useState('');"
echo "        const [pendingReviewCount, setPendingReviewCount] = useState(0);"
echo ""
echo "        Paste them in the App component near other useState declarations"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Update handleUpload function in App component"
echo "        Find: const handleUpload = async (e) => {"
echo "        Add client validation at the start:"
echo ""
cat << 'EOF'
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
        
        const confidenceEmoji = result.confidence_level === 'high' ? '✅' : 
                                result.confidence_level === 'medium' ? '🟡' : '⚠️';
        
        alert(`${confidenceEmoji} Invoice Uploaded!\nClient: ${selectedClient.company_name}\nConfidence: ${result.confidence_level}\nStatus: ${result.review_status}`);
      }
    } catch (error) {
      alert('❌ Upload Failed! ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 6: Add ClientSelectorBar before the tabs section"
echo "        Find: {/* TABS */}"
echo "        Add BEFORE it:"
echo ""
cat << 'EOF'
          {/* 🆕 CLIENT SELECTOR BAR */}
          <ClientSelectorBar 
            selectedClient={selectedClient}
            onOpenSelector={() => setShowClientSelector(true)}
            selectedDocType={selectedDocType}
            setSelectedDocType={setSelectedDocType}
          />
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 7: Add ClientSelectorModal at the end of return statement"
echo "        Find the closing tags near end of App component"
echo "        Add before </div>:"
echo ""
cat << 'EOF'
        {/* 🆕 CLIENT SELECTOR MODAL */}
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
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 8: Update header with v2.0 badge"
echo "        Find: <h1 className=\"text-3xl..."
echo "        Replace with:"
echo ""
cat << 'EOF'
            <h1 className="text-3xl font-black text-white tracking-tight">
              Tax<span className="text-purple-400">.AI</span> 
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full ml-2">v2.0</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Multi-Tenant CA Office Management System</p>
EOF

echo ""
echo "        And add pending review badge in header:"
echo ""
cat << 'EOF'
            {pendingReviewCount > 0 && (
              <div className="px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                <span className="text-xs text-orange-300 font-bold">
                  ⚠️ {pendingReviewCount} Pending Review
                </span>
              </div>
            )}
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All steps documented above!"
echo ""
echo "📝 After making these changes:"
echo "   1. Save App.jsx"
echo "   2. Check browser console for errors"
echo "   3. Test at http://localhost:5176"
echo "   4. Click 'Select Client to Start'"
echo "   5. Choose a client and upload a file"
echo ""
echo "🚀 Tax.AI v2.0 Frontend will be complete!"
echo ""
EOF
chmod +x tax-frontend/APPLY_FRONTEND_CHANGES.sh
