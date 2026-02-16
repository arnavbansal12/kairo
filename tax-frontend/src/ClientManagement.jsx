import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Search, X, Edit2, Trash2, Phone, MessageCircle,
    Plus, Mail, MapPin, User, FileText, Check, AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

// Client Form Modal Component
const ClientFormModal = ({ isOpen, onClose, client, onSave, isDark }) => {
    const [formData, setFormData] = useState({
        company_name: '',
        gstin: '',
        pan: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        client_type: 'Trader',
        status: 'Active'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (client) {
            setFormData({
                company_name: client.company_name || '',
                gstin: client.gstin || '',
                pan: client.pan || '',
                contact_person: client.contact_person || '',
                phone: client.phone || '',
                email: client.email || '',
                address: client.address || '',
                city: client.city || '',
                state: client.state || '',
                client_type: client.client_type || 'Trader',
                status: client.status || 'Active'
            });
        } else {
            setFormData({
                company_name: '',
                gstin: '',
                pan: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                state: '',
                client_type: 'Trader',
                status: 'Active'
            });
        }
        setError('');
    }, [client, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.company_name.trim()) {
            setError('Company name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const url = client
                ? `${API_BASE}/clients/${client.id}`
                : `${API_BASE}/clients`;

            const token = localStorage.getItem('taxai_token');
            const response = await fetch(url, {
                method: client ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to save client');
            }

            const savedClient = await response.json();
            onSave(savedClient);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = `w-full px-4 py-3 rounded-xl border transition-all focus:outline-none ${isDark
        ? 'bg-black/30 border-white/10 text-white focus:border-purple-500'
        : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
        }`;

    const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border ${isDark
                    ? 'bg-gradient-to-br from-gray-900 to-black border-white/10'
                    : 'bg-white border-gray-200'
                    }`}
            >
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-blue-100'}`}>
                                <Building2 className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-blue-600'}`} />
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {client ? 'Edit Client' : 'Add New Client'}
                                </h3>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {client ? 'Update client details' : 'Fill in the client information'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        >
                            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-400">{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Company Name */}
                        <div className="md:col-span-2">
                            <label className={labelClass}>Company Name *</label>
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                placeholder="Enter company name"
                                className={inputClass}
                                required
                            />
                        </div>

                        {/* GSTIN */}
                        <div>
                            <label className={labelClass}>GSTIN</label>
                            <input
                                type="text"
                                value={formData.gstin}
                                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                placeholder="22AAAAA0000A1Z5"
                                maxLength={15}
                                className={inputClass}
                            />
                        </div>

                        {/* PAN */}
                        <div>
                            <label className={labelClass}>PAN</label>
                            <input
                                type="text"
                                value={formData.pan}
                                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                                placeholder="AAAAA0000A"
                                maxLength={10}
                                className={inputClass}
                            />
                        </div>

                        {/* Phone - IMPORTANT FIELD */}
                        <div>
                            <label className={labelClass}>
                                <span className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Phone Number
                                </span>
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+91 98765 43210"
                                className={inputClass}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className={labelClass}>
                                <span className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email
                                </span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="client@company.com"
                                className={inputClass}
                            />
                        </div>

                        {/* Contact Person */}
                        <div>
                            <label className={labelClass}>
                                <span className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Contact Person
                                </span>
                            </label>
                            <input
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                placeholder="Mr. Sharma"
                                className={inputClass}
                            />
                        </div>

                        {/* Client Type */}
                        <div>
                            <label className={labelClass}>Client Type</label>
                            <select
                                value={formData.client_type}
                                onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                                className={inputClass}
                            >
                                <option value="Trader">Trader</option>
                                <option value="Manufacturer">Manufacturer</option>
                                <option value="Service Provider">Service Provider</option>
                                <option value="Retailer">Retailer</option>
                                <option value="Wholesaler">Wholesaler</option>
                            </select>
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label className={labelClass}>
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Address
                                </span>
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Street address"
                                className={inputClass}
                            />
                        </div>

                        {/* City */}
                        <div>
                            <label className={labelClass}>City</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Mumbai"
                                className={inputClass}
                            />
                        </div>

                        {/* State */}
                        <div>
                            <label className={labelClass}>State</label>
                            <input
                                type="text"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                placeholder="Maharashtra"
                                className={inputClass}
                            />
                        </div>

                        {/* Status (only for edit) */}
                        {client && (
                            <div>
                                <label className={labelClass}>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className={inputClass}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className={`p-6 border-t ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-6 py-3 rounded-xl font-medium transition-colors ${isDark
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 ${isDark
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    {client ? 'Update Client' : 'Add Client'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Main Client Management Component
export const ClientManagement = ({ isDark }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    // Fetch clients
    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('taxai_token');
            const response = await fetch(`${API_BASE}/clients`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch clients:', response.status);
                setClients([]); // Set empty array instead of crashing
                return;
            }

            const data = await response.json();
            setClients(Array.isArray(data) ? data : []); // Ensure data is always an array
        } catch (err) {
            console.error('Error fetching clients:', err);
            setClients([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    // Filter clients
    const filteredClients = clients.filter(client => {
        const matchesSearch =
            (client.company_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (client.gstin?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (client.phone || '').includes(search) ||
            (client.contact_person?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Handle save (add/update)
    const handleSave = (savedClient) => {
        if (editingClient) {
            setClients(prev => prev.map(c => c.id === savedClient.id ? savedClient : c));
        } else {
            setClients(prev => [...prev, savedClient]);
        }
        setEditingClient(null);
        fetchClients(); // Refresh to get latest data
    };

    // Handle delete
    const handleDelete = async (clientId) => {
        if (!confirm('Are you sure you want to deactivate this client?')) return;

        try {
            const token = localStorage.getItem('taxai_token');
            await fetch(`${API_BASE}/clients/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchClients();
        } catch (err) {
            console.error('Error deleting client:', err);
            alert('Failed to delete client');
        }
    };

    // Open WhatsApp
    const openWhatsApp = (phone) => {
        if (!phone) {
            alert('No phone number available for this client');
            return;
        }
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
        window.open(`https://wa.me/${formattedPhone}`, '_blank');
    };

    // Call client
    const callClient = (phone) => {
        if (!phone) {
            alert('No phone number available for this client');
            return;
        }
        window.open(`tel:${phone}`, '_self');
    };

    return (
        <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {/* Header */}
            <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Building2 className={`w-7 h-7 ${isDark ? 'text-purple-400' : 'text-blue-600'}`} />
                            Client Management
                        </h1>
                        <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Manage your clients, their contact details, and communication
                        </p>
                    </div>

                    <button
                        onClick={() => { setEditingClient(null); setShowForm(true); }}
                        className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${isDark
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                            }`}
                    >
                        <Plus className="w-5 h-5" />
                        Add New Client
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mt-6">
                    <div className="relative flex-1">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Search by name, GSTIN, phone, or contact person..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:outline-none ${isDark
                                ? 'bg-black/30 border-white/10 text-white placeholder-gray-500 focus:border-purple-500'
                                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                                }`}
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-4 py-3 rounded-xl border transition-all focus:outline-none ${isDark
                            ? 'bg-black/30 border-white/10 text-white focus:border-purple-500'
                            : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                            }`}
                    >
                        <option value="all">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className={`w-8 h-8 border-4 ${isDark ? 'border-purple-500/30 border-t-purple-500' : 'border-blue-500/30 border-t-blue-500'} rounded-full animate-spin`} />
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No clients found</p>
                        <p className="mt-2">
                            {search ? 'Try adjusting your search' : 'Click "Add New Client" to get started'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredClients.map((client) => (
                            <motion.div
                                key={client.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-5 rounded-2xl border transition-all hover:shadow-lg ${isDark
                                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                    : 'bg-white border-gray-200 hover:shadow-gray-200/50'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Client Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-xl ${client.status === 'Active'
                                                ? (isDark ? 'bg-green-500/20' : 'bg-green-100')
                                                : (isDark ? 'bg-gray-500/20' : 'bg-gray-100')
                                                }`}>
                                                <Building2 className={`w-6 h-6 ${client.status === 'Active'
                                                    ? (isDark ? 'text-green-400' : 'text-green-600')
                                                    : (isDark ? 'text-gray-400' : 'text-gray-500')
                                                    }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {client.company_name}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.status === 'Active'
                                                        ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                                                        : (isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-500')
                                                        }`}>
                                                        {client.status}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-100 text-blue-700'}`}>
                                                        {client.client_type || 'Trader'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                                                    {client.gstin && (
                                                        <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            <FileText className="w-4 h-4" />
                                                            {client.gstin}
                                                        </span>
                                                    )}
                                                    {client.phone && (
                                                        <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                                            <Phone className="w-4 h-4" />
                                                            {client.phone}
                                                        </span>
                                                    )}
                                                    {client.email && (
                                                        <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            <Mail className="w-4 h-4" />
                                                            {client.email}
                                                        </span>
                                                    )}
                                                    {client.contact_person && (
                                                        <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            <User className="w-4 h-4" />
                                                            {client.contact_person}
                                                        </span>
                                                    )}
                                                    {(client.city || client.state) && (
                                                        <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                            <MapPin className="w-4 h-4" />
                                                            {[client.city, client.state].filter(Boolean).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => callClient(client.phone)}
                                            className={`p-3 rounded-xl transition-colors ${client.phone
                                                ? (isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-600 hover:bg-green-200')
                                                : (isDark ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')
                                                }`}
                                            title={client.phone ? `Call ${client.phone}` : 'No phone number'}
                                        >
                                            <Phone className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => openWhatsApp(client.phone)}
                                            className={`p-3 rounded-xl transition-colors ${client.phone
                                                ? (isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-600 hover:bg-green-200')
                                                : (isDark ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')
                                                }`}
                                            title={client.phone ? `WhatsApp ${client.phone}` : 'No phone number'}
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => { setEditingClient(client); setShowForm(true); }}
                                            className={`p-3 rounded-xl transition-colors ${isDark
                                                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                }`}
                                            title="Edit client"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(client.id)}
                                            className={`p-3 rounded-xl transition-colors ${isDark
                                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                }`}
                                            title="Deactivate client"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        Showing {filteredClients.length} of {clients.length} clients
                    </span>
                    <div className="flex gap-6">
                        <span className={`flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            {clients.filter(c => c.status === 'Active').length} Active
                        </span>
                        <span className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            {clients.filter(c => c.status === 'Inactive').length} Inactive
                        </span>
                    </div>
                </div>
            </div>

            {/* Client Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <ClientFormModal
                        isOpen={showForm}
                        onClose={() => { setShowForm(false); setEditingClient(null); }}
                        client={editingClient}
                        onSave={handleSave}
                        isDark={isDark}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientManagement;
