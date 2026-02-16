import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, Upload, Users, Settings, Moon, Download, FileText, LayoutDashboard } from 'lucide-react';

/**
 * Command Palette - Cmd/Ctrl + K
 * Quick access to all app functions
 */
const CommandPalette = ({ isOpen, onClose, isDark, onCommand }) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef(null);

    const commands = [
        {
            id: 'upload',
            label: 'Upload Invoice',
            icon: Upload,
            shortcut: 'Cmd+U',
            action: () => onCommand({ type: 'navigate', tab: 'upload' })
        },
        {
            id: 'dashboard',
            label: 'Go to Dashboard',
            icon: LayoutDashboard,
            action: () => onCommand({ type: 'navigate', tab: 'dashboard' })
        },
        {
            id: 'clients',
            label: 'Manage Clients',
            icon: Users,
            action: () => onCommand({ type: 'navigate', tab: 'clients' })
        },
        {
            id: 'settings',
            label: 'Open Settings',
            icon: Settings,
            shortcut: 'Cmd+,',
            action: () => onCommand({ type: 'open_modal', modal: 'settings' })
        },
        {
            id: 'dark-mode',
            label: 'Toggle Dark Mode',
            icon: Moon,
            action: () => onCommand({ type: 'toggle_theme' })
        },
        {
            id: 'export',
            label: 'Export Data',
            icon: Download,
            action: () => onCommand({ type: 'export_data' })
        },
        {
            id: 'tally',
            label: 'Open Tally Simulation',
            icon: FileText,
            action: () => onCommand({ type: 'open_modal', modal: 'tally' })
        },
    ];

    // Filter commands based on query
    const filteredCommands = query
        ? commands.filter(cmd =>
            cmd.label.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected(prev => prev === 0 ? filteredCommands.length - 1 : prev - 1);
            } else if (e.key === 'Enter' && filteredCommands[selected]) {
                e.preventDefault();
                executeCommand(filteredCommands[selected]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selected]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelected(0);
        }
    }, [isOpen]);

    const executeCommand = (cmd) => {
        cmd.action();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -20 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#1a1a24] border border-white/10' : 'bg-white border border-gray-100'
                    }`}
            >
                {/* Search Input */}
                <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <Search className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type a command or search..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelected(0);
                            }}
                            className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                                }`}
                        />
                        <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark
                                ? 'bg-white/5 text-gray-400 border border-white/10'
                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                            }`}>
                            ESC
                        </kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {filteredCommands.length === 0 ? (
                        <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <p className="text-sm">No commands found</p>
                        </div>
                    ) : (
                        filteredCommands.map((cmd, index) => (
                            <button
                                key={cmd.id}
                                onClick={() => executeCommand(cmd)}
                                onMouseEnter={() => setSelected(index)}
                                className={`w-full flex items-center justify-between gap-3 p-3 transition-colors ${index === selected
                                        ? isDark
                                            ? 'bg-purple-500/20 border-l-2 border-purple-500'
                                            : 'bg-purple-50 border-l-2 border-purple-600'
                                        : isDark
                                            ? 'hover:bg-white/5'
                                            : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <cmd.icon className={`w-5 h-5 ${index === selected
                                            ? 'text-purple-400'
                                            : isDark ? 'text-gray-400' : 'text-gray-500'
                                        }`} />
                                    <span className={`text-sm font-medium ${index === selected
                                            ? isDark ? 'text-white' : 'text-gray-900'
                                            : isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        {cmd.label}
                                    </span>
                                </div>
                                {cmd.shortcut && (
                                    <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark
                                            ? 'bg-white/5 text-gray-400 border border-white/10'
                                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                                        }`}>
                                        {cmd.shortcut}
                                    </kbd>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className={`p-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-white/5 text-gray-500' : 'border-gray-100 text-gray-400'
                    }`}>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Navigate with ↑↓
                        </span>
                        <span>↵ to select</span>
                    </div>
                    <span>ESC to close</span>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CommandPalette;
