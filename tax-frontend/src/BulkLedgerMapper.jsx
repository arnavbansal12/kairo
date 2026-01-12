import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, Building2, FileText, Package, Check,
    ChevronRight, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

// ============================================================================
// BULK LEDGER MAPPER - Assign Tally Ledgers to Multiple Bills at Once
// ============================================================================

export const BulkLedgerMapper = ({ isOpen, onClose, onComplete, isDark }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [vendorGroups, setVendorGroups] = useState([]);
    const [ledgers, setLedgers] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [search, setSearch] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch vendor groups and ledger options
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [groupsRes, ledgersRes] = await Promise.all([
                fetch(`${API_URL}/invoices/group-by-vendor`),
                fetch(`${API_URL}/tally/ledgers`)
            ]);

            const groupsData = await groupsRes.json();
            const ledgersData = await ledgersRes.json();

            setVendorGroups(groupsData.vendors || []);
            setLedgers(ledgersData || []);

            // Initialize assignments with current values
            const initial = {};
            (groupsData.vendors || []).forEach(vendor => {
                initial[vendor.vendor_name] = {
                    ledger: vendor.current_ledger !== 'Unassigned' ? vendor.current_ledger : '',
                    group: vendor.current_group !== 'Unassigned' ? vendor.current_group : ''
                };
            });
            setAssignments(initial);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLedgerChange = (vendorName, ledgerName, groupName) => {
        setAssignments(prev => ({
            ...prev,
            [vendorName]: { ledger: ledgerName, group: groupName }
        }));
    };

    const handleApplyAll = async () => {
        setSaving(true);
        setSuccessMessage('');

        try {
            let totalUpdated = 0;

            for (const vendor of vendorGroups) {
                const assignment = assignments[vendor.vendor_name];
                if (assignment?.ledger && assignment.ledger !== vendor.current_ledger) {
                    const res = await fetch(`${API_URL}/invoices/bulk-update-ledger?vendor_name=${encodeURIComponent(vendor.vendor_name)}&ledger_name=${encodeURIComponent(assignment.ledger)}&group_name=${encodeURIComponent(assignment.group || '')}`, {
                        method: 'POST'
                    });
                    const result = await res.json();
                    totalUpdated += result.updated_count || 0;
                }
            }

            setSuccessMessage(`✅ Updated ${totalUpdated} invoices successfully!`);
            setTimeout(() => {
                onComplete?.();
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Failed to update:', err);
        } finally {
            setSaving(false);
        }
    };

    // Filter vendors by search
    const filteredVendors = vendorGroups.filter(v =>
        v.vendor_name.toLowerCase().includes(search.toLowerCase())
    );

    // Count vendors needing assignment
    const needsAssignment = vendorGroups.filter(v =>
        !assignments[v.vendor_name]?.ledger || v.current_ledger === 'Unassigned'
    ).length;

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl ${isDark
                    ? 'bg-[#0f0f15] border border-white/10'
                    : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-gradient-to-r from-orange-900/20 to-amber-900/20' : 'border-gray-100 bg-orange-50'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                                <Package className={`w-6 h-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Bulk Ledger Mapper
                                </h2>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Assign Tally ledgers to all bills from the same vendor at once
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex items-center gap-6 mt-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                            <Building2 className="w-4 h-4 text-purple-400" />
                            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {vendorGroups.length} Vendors
                            </span>
                        </div>
                        {needsAssignment > 0 && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                                <AlertCircle className="w-4 h-4 text-orange-400" />
                                <span className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                                    {needsAssignment} need ledger assignment
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search vendors..."
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none ${isDark
                                ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'
                                }`}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-280px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="p-4 space-y-2">
                            {filteredVendors.map((vendor, index) => (
                                <VendorRow
                                    key={vendor.vendor_name}
                                    vendor={vendor}
                                    ledgers={ledgers}
                                    assignment={assignments[vendor.vendor_name]}
                                    onAssign={(ledger, group) => handleLedgerChange(vendor.vendor_name, ledger, group)}
                                    isDark={isDark}
                                    index={index}
                                />
                            ))}

                            {filteredVendors.length === 0 && (
                                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    No vendors found matching "{search}"
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                    {successMessage ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center justify-center gap-2 py-3 text-green-400`}
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">{successMessage}</span>
                        </motion.div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Changes will update all bills from each vendor
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className={`px-4 py-2.5 rounded-xl font-medium ${isDark
                                        ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleApplyAll}
                                    disabled={saving}
                                    className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Applying...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Apply All Changes
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// Individual vendor row component
const VendorRow = ({ vendor, ledgers, assignment, onAssign, isDark, index }) => {
    const [isOpen, setIsOpen] = useState(false);

    const currentLedger = assignment?.ledger || '';
    const hasAssignment = currentLedger && currentLedger !== 'Unassigned';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`p-4 rounded-xl border transition-all ${isDark
                ? `bg-white/[0.02] border-white/10 ${hasAssignment ? 'border-green-500/30' : 'border-orange-500/30'}`
                : `bg-white border-gray-100 ${hasAssignment ? 'border-green-200' : 'border-orange-200'}`
                }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    {/* Vendor Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${isDark
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-purple-100 text-purple-600'
                        }`}>
                        {vendor.vendor_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Vendor Info */}
                    <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {vendor.vendor_name}
                        </h4>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {vendor.bill_count} bills
                            </span>
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                ₹{(vendor.total_amount || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ledger Selector */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={currentLedger}
                            onChange={(e) => {
                                const selected = ledgers.find(l => l.name === e.target.value);
                                onAssign(e.target.value, selected?.group || '');
                            }}
                            className={`appearance-none pl-3 pr-8 py-2 rounded-lg border min-w-[200px] text-sm outline-none cursor-pointer ${isDark
                                ? `bg-white/5 border-white/10 text-white focus:border-purple-500 ${!hasAssignment ? 'border-orange-500/50' : ''}`
                                : `bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 ${!hasAssignment ? 'border-orange-300' : ''}`
                                }`}
                        >
                            <option value="">Select Ledger...</option>
                            {ledgers.map(ledger => (
                                <option key={ledger.name} value={ledger.name}>
                                    {ledger.name}
                                </option>
                            ))}
                        </select>
                        <ChevronRight className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>

                    {/* Status Icon */}
                    {hasAssignment ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-orange-400" />
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default BulkLedgerMapper;
