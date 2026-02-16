import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, Scale, FileText, Clock, AlertTriangle, AlertCircle,
    CheckCircle2, Loader2, X, ChevronRight, Download, Printer,
    Calendar, DollarSign, User, FileWarning, Send
} from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

// ============================================================================
// LEGAL EAGLE - GST Notice Responder System
// ============================================================================

export const LegalNotices = ({ clientId, isDark }) => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [summary, setSummary] = useState({ total: 0, pending: 0, urgent: 0 });

    useEffect(() => {
        fetchNotices();
    }, [clientId]);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('taxai_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const url = clientId
                ? `${API_URL}/legal/notices?client_id=${clientId}`
                : `${API_URL}/legal/notices`;
            const res = await fetch(url, { headers });
            const data = await res.json();
            setNotices(data.notices || []);
            setSummary(data.summary || { total: 0, pending: 0, urgent: 0 });
        } catch (err) {
            console.error('Failed to fetch notices:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (clientId) formData.append('client_id', clientId);

        try {
            const token = localStorage.getItem('taxai_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/legal/analyze-notice`, {
                method: 'POST',
                headers,
                body: formData
            });
            const result = await res.json();

            if (result.status === 'analyzed') {
                // Refresh list and open the new notice
                await fetchNotices();
                setSelectedNotice(result);
            } else {
                alert('Failed to analyze notice: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                        <Scale className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Legal Eagle
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            GST Notice Analysis & Reply Drafting
                        </p>
                    </div>
                </div>

                {/* Upload Button */}
                <label className={`px-4 py-2.5 rounded-xl font-medium cursor-pointer flex items-center gap-2 transition-all ${uploading
                    ? 'bg-gray-500/20 text-gray-400 cursor-wait'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500'
                    }`}>
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Upload Notice
                        </>
                    )}
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleUpload}
                        disabled={uploading}
                        className="hidden"
                    />
                </label>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Notices</span>
                    </div>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{summary.total}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-yellow-500" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</span>
                    </div>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{summary.pending}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Urgent</span>
                    </div>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{summary.urgent}</p>
                </div>
            </div>

            {/* Notices List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : notices.length === 0 ? (
                <div className={`text-center py-12 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                    <Scale className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    <h3 className={`font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No Notices Yet</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Upload a GST notice to get AI analysis and draft reply
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notices.map((notice, index) => (
                        <motion.div
                            key={notice.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setSelectedNotice(notice)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${isDark
                                ? 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                                : 'bg-white border-gray-100 hover:border-purple-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(notice.severity)}`}>
                                        {notice.severity === 'critical' ? (
                                            <AlertCircle className="w-5 h-5" />
                                        ) : notice.severity === 'high' ? (
                                            <AlertTriangle className="w-5 h-5" />
                                        ) : (
                                            <FileWarning className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {notice.notice_type}
                                            </h4>
                                            <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(notice.severity)}`}>
                                                {notice.severity}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {notice.notice_name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        {notice.due_date && (
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Due: {notice.due_date}
                                            </p>
                                        )}
                                        {notice.demand_amount && (
                                            <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                                ₹{Number(notice.demand_amount).toLocaleString('en-IN')}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${notice.status === 'submitted' ? 'bg-green-500/20 text-green-400' :
                                        notice.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {notice.status}
                                    </span>
                                    <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                </div>
                            </div>
                            {notice.issue_summary && (
                                <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'} line-clamp-2`}>
                                    {notice.issue_summary}
                                </p>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Notice Detail Modal */}
            <AnimatePresence>
                {selectedNotice && (
                    <NoticeDetailModal
                        notice={selectedNotice}
                        onClose={() => setSelectedNotice(null)}
                        onUpdate={fetchNotices}
                        isDark={isDark}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Notice Detail Modal
const NoticeDetailModal = ({ notice, onClose, onUpdate, isDark }) => {
    const [loading, setLoading] = useState(false);
    const [fullNotice, setFullNotice] = useState(null);
    const [editedReply, setEditedReply] = useState('');

    useEffect(() => {
        fetchDetail();
    }, [notice.id]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('taxai_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/legal/notice/${notice.id}`, { headers });
            const data = await res.json();
            setFullNotice(data);
            setEditedReply(data.final_reply || data.draft_reply || '');
        } catch (err) {
            console.error('Failed to fetch notice detail:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkSubmitted = async () => {
        try {
            const token = localStorage.getItem('taxai_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            await fetch(`${API_URL}/legal/notice/${notice.id}?status=submitted&final_reply=${encodeURIComponent(editedReply)}`, {
                method: 'PUT',
                headers
            });
            onUpdate();
            onClose();
        } catch (err) {
            console.error('Failed to update notice:', err);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
      <html>
        <head>
          <title>Reply to ${notice.notice_type}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <pre>${editedReply}</pre>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    if (loading || !fullNotice) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            >
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl ${isDark
                    ? 'bg-[#0f0f15] border border-white/10'
                    : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-gradient-to-r from-purple-900/20 to-red-900/20' : 'border-gray-100 bg-purple-50'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {fullNotice.notice_type} - {fullNotice.notice_name}
                            </h2>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {fullNotice.section} | Due: {fullNotice.due_date || 'Not specified'}
                            </p>
                        </div>
                        <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
                    {/* Notice Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Issue Summary</span>
                            <p className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {fullNotice.issue_summary || 'Not specified'}
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Demand Amount</span>
                            <p className={`mt-1 text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                {fullNotice.demand_amount ? `₹${Number(fullNotice.demand_amount).toLocaleString('en-IN')}` : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Draft Reply */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                AI-Generated Reply Draft
                            </h3>
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Edit as needed before submitting
                            </span>
                        </div>
                        <textarea
                            value={editedReply}
                            onChange={(e) => setEditedReply(e.target.value)}
                            rows={15}
                            className={`w-full p-4 rounded-xl border outline-none font-mono text-sm ${isDark
                                ? 'bg-black/30 border-white/10 text-gray-300 focus:border-purple-500'
                                : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-purple-500'
                                }`}
                            placeholder="AI-generated reply will appear here..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrint}
                            className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${isDark
                                ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Printer className="w-4 h-4" />
                            Print Reply
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className={`px-4 py-2.5 rounded-xl font-medium ${isDark
                                    ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Close
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleMarkSubmitted}
                                className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Mark as Submitted
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default LegalNotices;
