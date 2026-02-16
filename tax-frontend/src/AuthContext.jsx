// AuthContext.jsx
// -----------------------------------------------------------------------------
// AUTHENTICATION CONTEXT - Global auth state management
// Handles login state, user data, and token persistence
// -----------------------------------------------------------------------------

import { createContext, useContext, useState, useEffect } from 'react';

const API_URL = "http://127.0.0.1:8000";

// Create the context
const AuthContext = createContext(null);

// Hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState({
        darkMode: true,
        notifications: {
            email: true,
            desktop: false
        }
    });

    // Load saved auth state on mount
    useEffect(() => {
        const loadAuthState = async () => {
            try {
                const savedToken = localStorage.getItem('taxai_token');
                const savedUser = localStorage.getItem('taxai_user');
                const savedPrefs = localStorage.getItem('taxai_preferences');

                if (savedToken && savedUser) {
                    // Verify token is still valid
                    try {
                        const response = await fetch(`${API_URL}/auth/me`, {
                            headers: { 'Authorization': `Bearer ${savedToken}` }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            setUser(data.user);
                            setToken(savedToken);

                            // Load preferences
                            if (data.user.preferences) {
                                setPreferences(data.user.preferences);
                                localStorage.setItem('taxai_preferences', JSON.stringify(data.user.preferences));
                            }
                        } else {
                            // Token invalid, clear storage
                            clearAuth();
                        }
                    } catch (e) {
                        // If API is down, still use cached user for better UX
                        setUser(JSON.parse(savedUser));
                        setToken(savedToken);
                    }
                }

                if (savedPrefs) {
                    setPreferences(JSON.parse(savedPrefs));
                }
            } catch (e) {
                console.error('Failed to load auth state:', e);
            } finally {
                setLoading(false);
            }
        };

        loadAuthState();
    }, []);

    // Login handler
    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);

        localStorage.setItem('taxai_token', authToken);
        localStorage.setItem('taxai_user', JSON.stringify(userData));

        if (userData.preferences) {
            setPreferences(userData.preferences);
            localStorage.setItem('taxai_preferences', JSON.stringify(userData.preferences));
        }
    };

    // Logout handler
    const logout = () => {
        clearAuth();
    };

    // Clear auth state
    const clearAuth = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('taxai_token');
        localStorage.removeItem('taxai_user');
        // Keep preferences for better UX
    };

    // Update preferences
    const updatePreferences = async (newPrefs) => {
        const merged = { ...preferences, ...newPrefs };
        setPreferences(merged);
        localStorage.setItem('taxai_preferences', JSON.stringify(merged));

        // Sync to backend if logged in
        if (token) {
            try {
                await fetch(`${API_URL}/auth/preferences`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ preferences: merged })
                });
            } catch (e) {
                console.error('Failed to sync preferences:', e);
            }
        }
    };

    // Toggle dark mode
    const toggleDarkMode = () => {
        const newDarkMode = !preferences.darkMode;
        updatePreferences({ darkMode: newDarkMode });
    };

    // Context value
    const value = {
        // State
        user,
        token,
        loading,
        isAuthenticated: !!user,
        preferences,

        // User info shortcuts
        username: user?.display_name || user?.username || 'User',
        email: user?.email || '',
        avatarUrl: user?.avatar_url,

        // Actions
        login,
        logout,
        updatePreferences,
        toggleDarkMode,

        // Helpers
        isDark: preferences.darkMode !== false, // Default to dark
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
