import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Trash2, Download, Lock, AlertTriangle } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

/**
 * Security Settings Tab Component
 * Password change, API keys, sessions
 */
const SecurityTab = ({ isDark, currentUser }) => {
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [apiKeys, setApiKeys] = useState([]);
    const [showNewKey, setShowNewKey] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwords.new !== passwords.confirm) {
            alert('⚠️ New passwords do not match');
            return;
        }

        if (passwords.new.length < 8) {
            alert('⚠️ Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: passwords.current,
                    new_password: passwords.new
                })
            });

            if (response.ok) {
                alert('✅ Password changed successfully!');
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                const error = await response.json();
                alert(`❌ ${error.detail || 'Failed to change password'}`);
            }
        } catch (err) {
            alert('❌ Error changing password');
        } finally {
            setLoading(false);
        }
    };

    const generateApiKey = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/api-keys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: 'Generated Key' })
            });

            if (response.ok) {
                const data = await response.json();
                setShowNewKey(data.key);
                setApiKeys(prev => [...prev, data]);
            } else {
                alert('❌ Failed to generate API key');
            }
        } catch (err) {
            alert('❌ Error generating API key');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Change Password */}
            <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Lock className="w-5 h-5 inline mr-2" />
                    Change Password
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Current Password
                        </label>
                        <input
                            type="password"
                            value={passwords.current}
                            onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark
                                ? 'bg-black/30 border-white/10 text-white'
                                : 'bg-white border-gray-200 text-gray-900'
                                }`}
                            required
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            New Password
                        </label>
                        <input
                            type="password"
                            value={passwords.new}
                            onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark
                                ? 'bg-black/30 border-white/10 text-white'
                                : 'bg-white border-gray-200 text-gray-900'
                                }`}
                            minLength={8}
                            required
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark
                                ? 'bg-black/30 border-white/10 text-white'
                                : 'bg-white border-gray-200 text-gray-900'
                                }`}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* API Keys */}
            <div className={`pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Key className="w-5 h-5 inline mr-2" />
                    API Keys
                </h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Use API keys to access Tax AI programmatically
                </p>

                <button
                    onClick={generateApiKey}
                    disabled={loading}
                    className={`mb-4 px-4 py-2 rounded-lg border-2 transition-colors ${isDark
                        ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10'
                        : 'border-purple-300 text-purple-600 hover:bg-purple-50'
                        } disabled:opacity-50`}
                >
                    Generate New API Key
                </button>

                {showNewKey && (
                    <div className={`p-4 rounded-lg border mb-4 ${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                        }`}>
                        <p className={`text-sm font-medium mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                            ✅ New API Key Generated
                        </p>
                        <code className={`block p-2 rounded text-xs font-mono ${isDark ? 'bg-black/40 text-green-300' : 'bg-white text-green-800'
                            }`}>
                            {showNewKey}
                        </code>
                        <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            ⚠️ Save this key now. You won't be able to see it again!
                        </p>
                    </div>
                )}

                {apiKeys.length === 0 && !showNewKey && (
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No API keys generated yet
                    </p>
                )}
            </div>
        </div>
    );
};

/**
 * Data & Privacy Tab Component
 * Export data, delete account
 */
const DataPrivacyTab = ({ isDark, currentUser, onLogout }) => {
    const [exportLoading, setExportLoading] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    const handleExportData = async () => {
        setExportLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/export-data`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tax-ai-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                alert('✅ Data exported successfully!');
            } else {
                alert('❌ Failed to export data');
            }
        } catch (err) {
            alert('❌ Error exporting data');
        } finally {
            setExportLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'DELETE') {
            alert('⚠️ Please type DELETE to confirm');
            return;
        }

        if (!window.confirm('⚠️ This action cannot be undone. Your account and all data will be permanently deleted. Continue?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/delete-account`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                alert('✅ Account deleted successfully');
                onLogout();
            } else {
                alert('❌ Failed to delete account');
            }
        } catch (err) {
            alert('❌ Error deleting account');
        }
    };

    return (
        <div className="space-y-6">
            {/* Export Data */}
            <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Download className="w-5 h-5 inline mr-2" />
                    Export Your Data
                </h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Download all your data including clients, invoices, and documents in JSON format
                </p>
                <button
                    onClick={handleExportData}
                    disabled={exportLoading}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    {exportLoading ? 'Exporting...' : 'Export All Data'}
                </button>
            </div>

            {/* Danger Zone */}
            <div className={`pt-6 border-2 rounded-xl p-6 ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'
                }`}>
                <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                </h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                    Once you delete your account, there is no going back. Please be certain.
                </p>

                <div className="space-y-3">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Type <code className="bg-black/20 px-1 rounded">DELETE</code> to confirm
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="Type DELETE here"
                            className={`w-full px-3 py-2 rounded-lg border ${isDark
                                ? 'bg-black/30 border-red-500/30 text-white'
                                : 'bg-white border-red-300 text-gray-900'
                                }`}
                        />
                    </div>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== 'DELETE'}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${deleteConfirmation === 'DELETE'
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete My Account Permanently
                    </button>
                </div>
            </div>
        </div>
    );
};

export { SecurityTab, DataPrivacyTab };
