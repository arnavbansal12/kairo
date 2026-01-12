import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Download, AlertCircle, AlertTriangle, CheckCircle2,
    Loader2, FileText, RefreshCw, ChevronDown, ChevronUp, Building
} from 'lucide-react';


const API_URL = "http://127.0.0.1:8000";

// ============================================================================
// TALLY SIMULATION REPORT - Pre-export Validation
// ============================================================================

export const TallySimulation = ({ isOpen, onClose, onExport, isDark }) => {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState(null);
    const [expandedSection, setExpandedSection] = useState('warnings');

    // GST Export Configuration
    const [companyName, setCompanyName] = useState('ABC Traders');
    const [companyState, setCompanyState] = useState('Delhi');
    const [voucherType, setVoucherType] = useState('Purchase');
    const [useGstExport, setUseGstExport] = useState(true);

    // Validation State
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    // Indian States for dropdown
    const INDIAN_STATES = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
        'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
        'Meghalaya', 'Mizoram', 'Nagaland', 'Orissa', 'Punjab', 'Rajasthan',
        'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
        'Uttarakhand', 'West Bengal', 'Chandigarh', 'Puducherry'
    ];

    useEffect(() => {
        if (isOpen) {
            runSimulation();
        }
    }, [isOpen]);

    const runSimulation = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/export/tally/simulate`);
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Simulation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        // Step 1: VALIDATE FIRST
        setValidating(true);
        setValidationResult(null);

        try {
            // Call validation endpoint
            const validateRes = await fetch(`${API_URL}/export/tally/validate?voucher_type=${encodeURIComponent(voucherType)}&company_state=${encodeURIComponent(companyState)}`, {
                method: 'POST'
            });
            const validation = await validateRes.json();
            setValidationResult(validation);

            // If validation FAILED, show errors and BLOCK export
            if (!validation.valid) {
                setShowValidationErrors(true);
                setValidating(false);
                return; // BLOCK EXPORT
            }

            // Step 2: EXPORT (only if validation passed)
            setValidating(false);
            setExporting(true);

            const endpoint = useGstExport
                ? `${API_URL}/export/tally/gst?company_name=${encodeURIComponent(companyName)}&voucher_type=${encodeURIComponent(voucherType)}&company_state=${encodeURIComponent(companyState)}`
                : `${API_URL}/export/tally`;

            const res = await fetch(endpoint);

            // Check if response is an error (validation failed on server side)
            if (!res.ok) {
                const errorData = await res.json();
                if (errorData.validation) {
                    setValidationResult(errorData.validation);
                    setShowValidationErrors(true);
                    return;
                }
                throw new Error(errorData.message || 'Export failed');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tally_gst_${voucherType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xml`;
            a.click();
            URL.revokeObjectURL(url);
            onExport?.();
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
            setValidating(false);
        }
    };

    // Get rule-friendly name
    const getRuleName = (rule) => {
        const ruleNames = {
            'B2B_GSTIN_REQUIRED': 'B2B GSTIN Required',
            'B2B_GSTIN_INVALID': 'Invalid GSTIN Checksum',
            'TAX_MATH_CGST_MISMATCH': 'CGST Calculation Error',
            'TAX_MATH_SGST_MISMATCH': 'SGST Calculation Error',
            'TAX_MATH_IGST_MISMATCH': 'IGST Calculation Error',
            'PLACE_OF_SUPPLY_MISSING': 'Place of Supply Missing',
            'IGST_INTRASTATE_ERROR': 'IGST Used for Intrastate',
            'CGST_SGST_INTERSTATE_ERROR': 'CGST/SGST Used for Interstate',
            'CGST_SGST_UNEQUAL': 'CGST ≠ SGST',
            'NEGATIVE_CGST_NOT_ALLOWED': 'Negative CGST',
            'NEGATIVE_SGST_NOT_ALLOWED': 'Negative SGST',
            'NEGATIVE_IGST_NOT_ALLOWED': 'Negative IGST',
            'NEGATIVE_TAXABLE_NOT_ALLOWED': 'Negative Taxable Value',
        };
        return ruleNames[rule] || rule;
    };



    if (!isOpen) return null;

    // Validation Error Modal (Blocking)
    const ValidationErrorModal = () => (
        <AnimatePresence>
            {showValidationErrors && validationResult && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                    onClick={() => setShowValidationErrors(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl ${isDark ? 'bg-[#1a1a25] border border-red-500/30' : 'bg-white border border-red-200'
                            }`}
                    >
                        {/* Error Header */}
                        <div className={`p-5 border-b ${isDark ? 'border-red-500/20 bg-red-900/20' : 'border-red-100 bg-red-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                                        Export Blocked - Validation Failed
                                    </h3>
                                    <p className={`text-sm ${isDark ? 'text-red-300/70' : 'text-red-600'}`}>
                                        {validationResult.summary?.error_count || 0} blocking errors must be fixed
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Errors List */}
                        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3">
                            {validationResult.errors?.map((error, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-4 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {getRuleName(error.rule)}
                                                </span>
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {error.invoice}
                                                </span>
                                            </div>
                                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {error.message}
                                            </p>
                                            <div className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                <span>Current: <code className="bg-black/20 px-1 rounded">{String(error.current)}</code></span>
                                                <span className="mx-2">→</span>
                                                <span>Expected: <code className="bg-green-500/20 px-1 rounded text-green-400">{String(error.expected)}</code></span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Warnings Section (if any) */}
                            {validationResult.warnings?.length > 0 && (
                                <div className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-100'}`}>
                                    <p className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                        ⚠️ {validationResult.warnings.length} Warnings (non-blocking)
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-center justify-between">
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Fix these errors in the Invoice Register, then try again.
                                </p>
                                <button
                                    onClick={() => setShowValidationErrors(false)}
                                    className={`px-4 py-2 rounded-xl font-medium ${isDark
                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        } transition-colors`}
                                >
                                    Close & Fix Errors
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

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
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl ${isDark
                    ? 'bg-[#0f0f15] border border-white/10'
                    : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-gradient-to-r from-blue-900/20 to-cyan-900/20' : 'border-gray-100 bg-blue-50'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                <FileText className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Tally Export Simulation
                                </h2>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Pre-check your bills before importing to Tally
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-200px)]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Running simulation...</p>
                        </div>
                    ) : data ? (
                        <div className="p-6 space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <SummaryCard
                                    icon={CheckCircle2}
                                    label="Ready to Export"
                                    count={data.summary.ready_count}
                                    amount={data.summary.ready_amount}
                                    color="green"
                                    isDark={isDark}
                                />
                                <SummaryCard
                                    icon={AlertTriangle}
                                    label="Warnings"
                                    count={data.summary.warning_count}
                                    amount={data.summary.warning_amount}
                                    color="yellow"
                                    isDark={isDark}
                                />
                                <SummaryCard
                                    icon={AlertCircle}
                                    label="Errors"
                                    count={data.summary.error_count}
                                    amount={0}
                                    color="red"
                                    isDark={isDark}
                                />
                            </div>

                            {/* GST Export Configuration */}
                            <div className={`p-4 rounded-xl border ${isDark
                                ? 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30'
                                : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        🏢 Tally Company Configuration
                                    </h3>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            GST Export
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={useGstExport}
                                            onChange={(e) => setUseGstExport(e.target.checked)}
                                            className="w-4 h-4 accent-blue-500"
                                        />
                                    </label>
                                </div>

                                {useGstExport && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Company Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                placeholder="Exact Tally company name"
                                                className={`w-full px-3 py-2 rounded-lg text-sm ${isDark
                                                    ? 'bg-white/10 border border-white/20 text-white placeholder-gray-500'
                                                    : 'bg-white border border-gray-200 text-gray-900'}`}
                                            />
                                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Must match exactly (case-sensitive)
                                            </p>
                                        </div>

                                        <div>
                                            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Company State
                                            </label>
                                            <select
                                                value={companyState}
                                                onChange={(e) => setCompanyState(e.target.value)}
                                                className={`w-full px-3 py-2 rounded-lg text-sm ${isDark
                                                    ? 'bg-white/10 border border-white/20 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-900'}`}
                                            >
                                                {INDIAN_STATES.map(state => (
                                                    <option key={state} value={state} className="text-gray-900">
                                                        {state}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                For CGST+SGST vs IGST
                                            </p>
                                        </div>

                                        <div>
                                            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Voucher Type
                                            </label>
                                            <select
                                                value={voucherType}
                                                onChange={(e) => setVoucherType(e.target.value)}
                                                className={`w-full px-3 py-2 rounded-lg text-sm ${isDark
                                                    ? 'bg-white/10 border border-white/20 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-900'}`}
                                            >
                                                <option value="Purchase" className="text-gray-900">Purchase</option>
                                                <option value="Sales" className="text-gray-900">Sales</option>
                                            </select>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Sales or Purchase vouchers
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {useGstExport && (
                                    <div className={`mt-3 p-2 rounded-lg text-xs ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'}`}>
                                        ✅ GST-compliant XML with GSTR-1/3B support • HSN details • GST Summary
                                    </div>
                                )}
                            </div>

                            {/* Errors Section */}

                            {data.errors.length > 0 && (
                                <IssueSection
                                    title="Errors - Cannot Export"
                                    items={data.errors}
                                    icon={AlertCircle}
                                    color="red"
                                    isExpanded={expandedSection === 'errors'}
                                    onToggle={() => setExpandedSection(expandedSection === 'errors' ? null : 'errors')}
                                    isDark={isDark}
                                />
                            )}

                            {/* Warnings Section */}
                            {data.warnings.length > 0 && (
                                <IssueSection
                                    title="Warnings - Will Export with Defaults"
                                    items={data.warnings}
                                    icon={AlertTriangle}
                                    color="yellow"
                                    isExpanded={expandedSection === 'warnings'}
                                    onToggle={() => setExpandedSection(expandedSection === 'warnings' ? null : 'warnings')}
                                    isDark={isDark}
                                />
                            )}

                            {/* Ready Section */}
                            {data.ready.length > 0 && (
                                <IssueSection
                                    title="Ready to Export"
                                    items={data.ready}
                                    icon={CheckCircle2}
                                    color="green"
                                    isExpanded={expandedSection === 'ready'}
                                    onToggle={() => setExpandedSection(expandedSection === 'ready' ? null : 'ready')}
                                    isDark={isDark}
                                    showIssues={false}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                            <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Failed to run simulation</p>
                            <button onClick={runSimulation} className="mt-4 text-blue-500 hover:underline flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Try again
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {data?.summary.error_count > 0
                                ? `⚠️ Fix ${data.summary.error_count} errors before exporting`
                                : `✅ ${data?.summary.ready_count || 0} bills ready to export`
                            }
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={runSimulation}
                                className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${isDark
                                    ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <RefreshCw className="w-4 h-4" />
                                Re-check
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleExport}
                                disabled={exporting || validating || (data?.summary.error_count > 0 && data?.summary.ready_count === 0)}
                                className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex items-center gap-2 disabled:opacity-50"
                            >
                                {validating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Validating...
                                    </>
                                ) : exporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Export XML ({data?.summary.ready_count || 0})
                                    </>
                                )}
                            </motion.button>

                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Validation Error Modal */}
            <ValidationErrorModal />
        </motion.div>
    );
};


// Summary card component
const SummaryCard = ({ icon: Icon, label, count, amount, color, isDark }) => (
    <div className={`p-4 rounded-xl border ${isDark
        ? `bg-${color === 'green' ? 'green' : color === 'yellow' ? 'yellow' : 'red'}-500/10 border-${color}-500/30`
        : `bg-${color}-50 border-${color}-200`
        }`}>
        <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-5 h-5 text-${color}-500`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
        </div>
        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{count}</p>
        {amount > 0 && (
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                ₹{amount.toLocaleString('en-IN')}
            </p>
        )}
    </div>
);

// Issue section component
const IssueSection = ({ title, items, icon: Icon, color, isExpanded, onToggle, isDark, showIssues = true }) => (
    <div className={`rounded-xl border overflow-hidden ${isDark
        ? 'bg-white/[0.02] border-white/10'
        : 'bg-white border-gray-100'
        }`}>
        <button
            onClick={onToggle}
            className={`w-full p-4 flex items-center justify-between ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color === 'green' ? 'text-green-500' :
                    color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                    {items.length}
                </span>
            </div>
            {isExpanded ? (
                <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            ) : (
                <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            )}
        </button>

        <AnimatePresence>
            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                        {items.slice(0, 10).map((item, i) => (
                            <div key={item.id} className={`p-3 flex items-center justify-between ${i !== items.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-gray-50') : ''
                                }`}>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.vendor_name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            #{item.invoice_no}
                                        </span>
                                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            ₹{(item.grand_total || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    {showIssues && item.issues?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {item.issues.map((issue, j) => (
                                                <span key={j} className={`text-xs px-2 py-0.5 rounded ${color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {issue}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {items.length > 10 && (
                            <div className={`p-3 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm`}>
                                + {items.length - 10} more
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

export default TallySimulation;
