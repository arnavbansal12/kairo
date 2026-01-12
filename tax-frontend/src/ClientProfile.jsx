import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Phone, Mail, MapPin, FileText, Calendar, Edit2, Save, X,
    CheckCircle2, AlertCircle, User, Globe, Hash, Briefcase, MessageSquare,
    TrendingUp, Clock, ArrowLeft, Link2, Copy, Share2
} from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

// ============================================================================
// CLIENT PROFILE PAGE - Detailed Client Information & Management
// ============================================================================

export const ClientProfile = ({ client, onClose, onUpdate, isDark }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedClient, setEditedClient] = useState(client);
    const [notes, setNotes] = useState(client?.notes || '');
    const [stats, setStats] = useState({ totalBills: 0, pending: 0, lastActivity: null });
    const [saving, setSaving] = useState(false);
    const [portalLink, setPortalLink] = useState(null);

    // Fetch client stats
    useEffect(() => {
        if (client?.id) {
            fetchStats();
        }
    }, [client?.id]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/clients/${client.id}/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch client stats:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/clients/${client.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editedClient, notes })
            });

            if (res.ok) {
                const updated = await res.json();
                onUpdate?.(updated);
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Failed to save client:', err);
        } finally {
            setSaving(false);
        }
    };

    const generatePortalLink = async () => {
        try {
            const res = await fetch(`${API_URL}/clients/${client.id}/generate-invite`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                setPortalLink(data.link);
            }
        } catch (err) {
            console.error('Failed to generate portal link:', err);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    if (!client) return null;

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
                className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl ${isDark
                    ? 'bg-[#0f0f15] border border-white/10'
                    : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-gradient-to-r from-purple-900/20 to-blue-900/20' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${isDark
                                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                                : 'bg-purple-100 text-purple-600'
                                }`}>
                                {client.company_name?.charAt(0) || 'C'}
                            </div>

                            <div>
                                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {client.company_name}
                                </h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.status === 'Active'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {client.status || 'Active'}
                                    </span>
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {client.client_type || 'Business'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsEditing(false)}
                                        className={`px-4 py-2 rounded-xl ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 rounded-xl bg-purple-600 text-white font-medium flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsEditing(true)}
                                        className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Edit
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onClose}
                                        className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column - Info Cards */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <InfoCard
                                    icon={FileText}
                                    label="Total Bills"
                                    value={stats.totalBills || 0}
                                    isDark={isDark}
                                />
                                <InfoCard
                                    icon={AlertCircle}
                                    label="Pending Review"
                                    value={stats.pending || 0}
                                    color="orange"
                                    isDark={isDark}
                                />
                                <InfoCard
                                    icon={Clock}
                                    label="Last Activity"
                                    value={stats.lastActivity || 'N/A'}
                                    isDark={isDark}
                                />
                            </div>

                            {/* Contact Information */}
                            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <EditableField
                                        icon={Hash}
                                        label="GSTIN"
                                        value={isEditing ? editedClient.gstin : client.gstin}
                                        onChange={(v) => setEditedClient({ ...editedClient, gstin: v })}
                                        isEditing={isEditing}
                                        isDark={isDark}
                                    />
                                    <EditableField
                                        icon={Hash}
                                        label="PAN"
                                        value={isEditing ? editedClient.pan : client.pan}
                                        onChange={(v) => setEditedClient({ ...editedClient, pan: v })}
                                        isEditing={isEditing}
                                        isDark={isDark}
                                    />
                                    <EditableField
                                        icon={User}
                                        label="Contact Person"
                                        value={isEditing ? editedClient.contact_person : client.contact_person}
                                        onChange={(v) => setEditedClient({ ...editedClient, contact_person: v })}
                                        isEditing={isEditing}
                                        isDark={isDark}
                                    />
                                    <EditableField
                                        icon={Phone}
                                        label="Phone"
                                        value={isEditing ? editedClient.phone : client.phone}
                                        onChange={(v) => setEditedClient({ ...editedClient, phone: v })}
                                        isEditing={isEditing}
                                        isDark={isDark}
                                    />
                                    <EditableField
                                        icon={Mail}
                                        label="Email"
                                        value={isEditing ? editedClient.email : client.email}
                                        onChange={(v) => setEditedClient({ ...editedClient, email: v })}
                                        isEditing={isEditing}
                                        isDark={isDark}
                                        colSpan={2}
                                    />
                                    <EditableField
                                        icon={MapPin}
                                        label="Address"
                                        value={isEditing ? editedClient.address : client.address}
                                        onChange={(v) => setEditedClient({ ...editedClient, address: v })}
                                        isEditing={isEditing}
                                        isDark={isDark}
                                        colSpan={2}
                                    />
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <MessageSquare className="w-4 h-4" />
                                    Notes & Reminders
                                </h3>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes about this client... e.g., 'Call only after 4 PM', 'Prefers WhatsApp'"
                                    className={`w-full h-32 p-4 rounded-xl border resize-none ${isDark
                                        ? 'bg-black/30 border-white/10 text-white placeholder-gray-500 focus:border-purple-500'
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'
                                        } outline-none transition-colors`}
                                />
                                {notes !== (client?.notes || '') && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={handleSave}
                                        className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Notes
                                    </motion.button>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Actions & Portal */}
                        <div className="space-y-6">

                            {/* Portal Link Generator */}
                            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-white/10' : 'bg-purple-50 border-purple-100'}`}>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                                    <Link2 className="w-4 h-4" />
                                    Client Self-Service
                                </h3>
                                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Send a link to your client so they can update their own details.
                                </p>

                                {portalLink ? (
                                    <div className="space-y-3">
                                        <div className={`p-3 rounded-xl ${isDark ? 'bg-black/30 border border-white/10' : 'bg-white border border-gray-200'}`}>
                                            <p className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{portalLink}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => copyToClipboard(portalLink)}
                                                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${isDark
                                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Please update your details here: ${portalLink}`)}`)}
                                                className="flex-1 px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-500"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                WhatsApp
                                            </motion.button>
                                        </div>
                                    </div>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={generatePortalLink}
                                        className="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-purple-500 transition-colors"
                                    >
                                        <Link2 className="w-4 h-4" />
                                        Generate Invite Link
                                    </motion.button>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Quick Actions
                                </h3>
                                <div className="space-y-2">
                                    <ActionButton icon={FileText} label="View All Bills" isDark={isDark} />
                                    <ActionButton icon={TrendingUp} label="Generate Report" isDark={isDark} />
                                    <ActionButton icon={Mail} label="Send Statement" isDark={isDark} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// Sub-components
const InfoCard = ({ icon: Icon, label, value, color = 'purple', isDark }) => (
    <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-4 h-4 ${color === 'orange' ? 'text-orange-400' : 'text-purple-400'}`} />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
        </div>
        <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
);

const EditableField = ({ icon: Icon, label, value, onChange, isEditing, isDark, colSpan = 1 }) => (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
        <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
        </div>
        {isEditing ? (
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark
                    ? 'bg-black/30 border-white/10 text-white focus:border-purple-500'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-purple-500'
                    } outline-none text-sm`}
            />
        ) : (
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {value || '-'}
            </p>
        )}
    </div>
);

const ActionButton = ({ icon: Icon, label, isDark, onClick }) => (
    <motion.button
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isDark
            ? 'hover:bg-white/5 text-gray-300'
            : 'hover:bg-gray-100 text-gray-700'
            }`}
    >
        <Icon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        <span className="text-sm font-medium">{label}</span>
    </motion.button>
);

export default ClientProfile;
