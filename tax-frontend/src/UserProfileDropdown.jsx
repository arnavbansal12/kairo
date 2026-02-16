import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Settings, Bell, HelpCircle, Keyboard,
    LogOut, ChevronDown, Shield, Moon, Sun
} from 'lucide-react';

/**
 * User Profile Dropdown - Enterprise grade user menu
 * Accessible from top-right corner of app
 */
const UserProfileDropdown = ({
    isOpen,
    onClose,
    currentUser,
    isDark,
    onOpenSettings,
    onOpenNotifications,
    onLogout
}) => {
    const [showShortcuts, setShowShortcuts] = useState(false);

    const getUserInitials = () => {
        if (!currentUser) return 'U';
        const name = currentUser.display_name || currentUser.username || 'User';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to sign out?')) {
            onLogout();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60]"
                onClick={onClose}
            />

            {/* Dropdown Menu */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-14 right-0 z-[70] w-72 rounded-2xl shadow-2xl overflow-hidden border ${isDark
                        ? 'bg-[#1a1a24]/95 backdrop-blur-xl border-white/10'
                        : 'bg-white border-gray-100'
                    }`}
            >
                {/* User Info Header */}
                <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">{getUserInitials()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {currentUser?.display_name || currentUser?.username || 'User'}
                            </p>
                            <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {currentUser?.email || 'user@example.com'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                    <button
                        onClick={() => {
                            onOpenSettings();
                            onClose();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        <span>Profile Settings</span>
                    </button>

                    <button
                        onClick={() => {
                            onOpenSettings();
                            onClose();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                    </button>

                    <button
                        onClick={() => {
                            onOpenNotifications?.();
                            onClose();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Bell className="w-4 h-4" />
                        <span>Notifications</span>
                    </button>

                    <div className={`my-2 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`} />

                    <button
                        onClick={() => setShowShortcuts(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Keyboard className="w-4 h-4" />
                        <span>Keyboard Shortcuts</span>
                    </button>

                    <button
                        onClick={() => window.open('https://taxai.help', '_blank')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span>Help & Support</span>
                    </button>
                </div>

                {/* Sign Out */}
                <div className={`p-2 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${isDark
                                ? 'text-red-400 hover:bg-red-500/10'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </motion.div>

            {/* Keyboard Shortcuts Modal */}
            <AnimatePresence>
                {showShortcuts && (
                    <KeyboardShortcutsModal
                        isOpen={showShortcuts}
                        onClose={() => setShowShortcuts(false)}
                        isDark={isDark}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

/**
 * Keyboard Shortcuts Modal
 */
const KeyboardShortcutsModal = ({ isOpen, onClose, isDark }) => {
    if (!isOpen) return null;

    const shortcuts = [
        { key: 'Cmd/Ctrl + K', desc: 'Open command palette' },
        { key: 'Cmd/Ctrl + U', desc: 'Upload invoice' },
        { key: 'Cmd/Ctrl + ,', desc: 'Open settings' },
        { key: 'Cmd/Ctrl + /', desc: 'Search with AI' },
        { key: 'Esc', desc: 'Close modals' },
        { key: '?', desc: 'Show keyboard shortcuts' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-[#1a1a24] border border-white/10' : 'bg-white'
                    }`}
            >
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ⌨️ Keyboard Shortcuts
                </h2>

                <div className="space-y-2">
                    {shortcuts.map((shortcut, i) => (
                        <div
                            key={i}
                            className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'
                                }`}
                        >
                            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {shortcut.desc}
                            </span>
                            <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark
                                    ? 'bg-black/40 text-gray-300 border border-white/10'
                                    : 'bg-white text-gray-700 border border-gray-200 shadow-sm'
                                }`}>
                                {shortcut.key}
                            </kbd>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-4 py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                >
                    Got it!
                </button>
            </motion.div>
        </motion.div>
    );
};

export { UserProfileDropdown, KeyboardShortcutsModal };
