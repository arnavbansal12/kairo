import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, AlertTriangle, Edit2, Save, ZoomIn, ZoomOut,
    RotateCw, ChevronLeft, ChevronRight, FileText, Eye,
    AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

// ============================================================================
// SPLIT SCREEN VERIFY MODE - Document vs Extracted Data
// ============================================================================

export const VerifyModal = ({ invoice, onApprove, onReject, onUpdate, onClose, isDark }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState(invoice || {});
    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [saving, setSaving] = useState(false);

    // Calculate confidence based on extracted fields
    const calculateConfidence = () => {
        const fields = ['vendor_name', 'invoice_no', 'grand_total', 'invoice_date', 'gst_no'];
        const filled = fields.filter(f => editedData[f] && editedData[f] !== 'Unknown' && editedData[f] !== 'AI Fail');
        const percentage = Math.round((filled.length / fields.length) * 100);

        if (percentage >= 80) return { level: 'high', color: 'green', label: 'High Confidence' };
        if (percentage >= 50) return { level: 'medium', color: 'yellow', label: 'Needs Review' };
        return { level: 'low', color: 'red', label: 'Low Confidence' };
    };

    const confidence = calculateConfidence();

    const handleFieldChange = (field, value) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/invoice/${invoice.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editedData)
            });
            if (res.ok) {
                const updated = await res.json();
                onUpdate?.(updated);
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = () => {
        onApprove?.(editedData);
        onClose();
    };

    const handleReject = () => {
        onReject?.(invoice);
        onClose();
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'a' && !isEditing) handleApprove();
            if (e.key === 'r' && !isEditing) handleReject();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isEditing]);

    if (!invoice) return null;

    // Get file path for preview
    const filePath = invoice.file_path || invoice.original_file;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-sm"
        >
            {/* Left Panel - Document Preview */}
            <div className="flex-1 flex flex-col border-r border-white/10">
                {/* Preview Header */}
                <div className={`p-4 border-b ${isDark ? 'border-white/10 bg-black/50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Original Document</span>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setZoom(z => Math.max(50, z - 25))}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                            >
                                <ZoomOut className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                            </button>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{zoom}%</span>
                            <button
                                onClick={() => setZoom(z => Math.min(200, z + 25))}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                            >
                                <ZoomIn className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                            </button>
                            <button
                                onClick={() => setRotation(r => (r + 90) % 360)}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                            >
                                <RotateCw className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Document Preview Area */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-900">
                    {filePath ? (
                        <div
                            style={{
                                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                                transition: 'transform 0.2s ease'
                            }}
                        >
                            {filePath.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={`${API_URL}/static/${filePath}`}
                                    className="w-[600px] h-[800px] bg-white rounded-lg shadow-2xl"
                                />
                            ) : (
                                <img
                                    src={`${API_URL}/static/${filePath}`}
                                    alt="Invoice"
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            )}
                            <div className="hidden flex-col items-center justify-center p-8 bg-gray-800 rounded-lg">
                                <FileText className="w-16 h-16 text-gray-600 mb-4" />
                                <p className="text-gray-400 text-center">Document preview unavailable</p>
                                <p className="text-gray-500 text-sm mt-2">{filePath}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8">
                            <FileText className="w-16 h-16 text-gray-600 mb-4" />
                            <p className="text-gray-400">No document attached</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Extracted Data */}
            <div className={`w-[480px] flex flex-col ${isDark ? 'bg-[#0f0f15]' : 'bg-white'}`}>
                {/* Data Header */}
                <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Eye className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Extracted Data</span>
                        </div>
                        <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>

                    {/* Confidence Meter */}
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${confidence.level === 'high' ? (isDark ? 'bg-green-500/10' : 'bg-green-50') :
                            confidence.level === 'medium' ? (isDark ? 'bg-yellow-500/10' : 'bg-yellow-50') :
                                (isDark ? 'bg-red-500/10' : 'bg-red-50')
                        }`}>
                        {confidence.level === 'high' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : confidence.level === 'medium' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${confidence.level === 'high' ? 'text-green-500' :
                                confidence.level === 'medium' ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                            {confidence.label}
                        </span>
                    </div>
                </div>

                {/* Data Fields */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <DataField
                        label="Vendor Name"
                        value={editedData.vendor_name}
                        onChange={(v) => handleFieldChange('vendor_name', v)}
                        isEditing={isEditing}
                        isDark={isDark}
                        required
                    />
                    <DataField
                        label="Invoice Number"
                        value={editedData.invoice_no}
                        onChange={(v) => handleFieldChange('invoice_no', v)}
                        isEditing={isEditing}
                        isDark={isDark}
                        required
                    />
                    <DataField
                        label="Invoice Date"
                        value={editedData.invoice_date}
                        onChange={(v) => handleFieldChange('invoice_date', v)}
                        isEditing={isEditing}
                        isDark={isDark}
                        type="date"
                    />
                    <DataField
                        label="GSTIN"
                        value={editedData.gst_no}
                        onChange={(v) => handleFieldChange('gst_no', v)}
                        isEditing={isEditing}
                        isDark={isDark}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <DataField
                            label="Taxable Amount"
                            value={editedData.taxable_value}
                            onChange={(v) => handleFieldChange('taxable_value', parseFloat(v) || 0)}
                            isEditing={isEditing}
                            isDark={isDark}
                            type="number"
                        />
                        <DataField
                            label="Grand Total"
                            value={editedData.grand_total}
                            onChange={(v) => handleFieldChange('grand_total', parseFloat(v) || 0)}
                            isEditing={isEditing}
                            isDark={isDark}
                            type="number"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <DataField
                            label="CGST"
                            value={editedData.cgst_amount}
                            onChange={(v) => handleFieldChange('cgst_amount', parseFloat(v) || 0)}
                            isEditing={isEditing}
                            isDark={isDark}
                            type="number"
                        />
                        <DataField
                            label="SGST"
                            value={editedData.sgst_amount}
                            onChange={(v) => handleFieldChange('sgst_amount', parseFloat(v) || 0)}
                            isEditing={isEditing}
                            isDark={isDark}
                            type="number"
                        />
                        <DataField
                            label="IGST"
                            value={editedData.igst_amount}
                            onChange={(v) => handleFieldChange('igst_amount', parseFloat(v) || 0)}
                            isEditing={isEditing}
                            isDark={isDark}
                            type="number"
                        />
                    </div>

                    <DataField
                        label="Ledger Name"
                        value={editedData.ledger_name}
                        onChange={(v) => handleFieldChange('ledger_name', v)}
                        isEditing={isEditing}
                        isDark={isDark}
                    />
                </div>

                {/* Action Buttons */}
                <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                    {isEditing ? (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className={`flex-1 py-3 rounded-xl font-medium ${isDark
                                    ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-3 rounded-xl font-medium bg-blue-600 text-white flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-3 mb-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleReject}
                                    className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Reject (R)
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleApprove}
                                    className="flex-1 py-3 rounded-xl font-medium bg-green-600 text-white hover:bg-green-500 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Approve (A)
                                </motion.button>
                            </div>
                            <button
                                onClick={() => setIsEditing(true)}
                                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${isDark
                                    ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Fields
                            </button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Data field component
const DataField = ({ label, value, onChange, isEditing, isDark, type = 'text', required }) => {
    const isEmpty = !value && value !== 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
                {required && isEmpty && (
                    <span className="text-xs text-red-400">Required</span>
                )}
            </div>
            {isEditing ? (
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${isDark
                        ? `bg-white/5 border-white/10 text-white focus:border-purple-500 ${isEmpty && required ? 'border-red-500/50' : ''}`
                        : `bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 ${isEmpty && required ? 'border-red-300' : ''}`
                        }`}
                />
            ) : (
                <div className={`px-3 py-2 rounded-lg ${isDark
                    ? `bg-white/5 ${isEmpty ? 'text-gray-500 italic' : 'text-white'}`
                    : `bg-gray-50 ${isEmpty ? 'text-gray-400 italic' : 'text-gray-900'}`
                    }`}>
                    {type === 'number' && typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : (value || 'Not extracted')}
                </div>
            )}
        </div>
    );
};

export default VerifyModal;
