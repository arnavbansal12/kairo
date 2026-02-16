// LoginPage.jsx
// -----------------------------------------------------------------------------
// ENTERPRISE LOGIN PAGE - Beautiful Animated Authentication
// Modern design with glassmorphism, gradients, and micro-animations
// Inspired by Apple, Google, and top accounting software UIs
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles,
    CheckCircle, AlertCircle, Loader2, Building2, Shield,
    TrendingUp, FileText, Calculator, BarChart3
} from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

// =============================================================================
// FLOATING ELEMENTS - Animated background decorations
// =============================================================================

const FloatingIcon = ({ icon: Icon, delay, duration, className }) => (
    <motion.div
        className={`absolute opacity-10 ${className}`}
        initial={{ y: 0, rotate: 0 }}
        animate={{
            y: [-20, 20, -20],
            rotate: [-5, 5, -5],
        }}
        transition={{
            duration: duration || 6,
            delay: delay || 0,
            repeat: Infinity,
            ease: "easeInOut"
        }}
    >
        <Icon className="w-16 h-16 text-white" />
    </motion.div>
);

const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white/10"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                }}
                animate={{
                    y: [-30, 30],
                    x: [-10, 10],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 4 + Math.random() * 4,
                    delay: Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);

// =============================================================================
// FEATURE CARDS - Animated showcase
// =============================================================================

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.6 }}
        className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
    >
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <Icon className="w-6 h-6 text-purple-400" />
        </div>
        <div>
            <h3 className="font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
    </motion.div>
);

// =============================================================================
// MAIN LOGIN PAGE COMPONENT
// =============================================================================

const LoginPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    // Pre-fill with test credentials for demo
    useEffect(() => {
        const savedEmail = localStorage.getItem('taxai_remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const body = isLogin
                ? { email, password }
                : { username, email, password, display_name: displayName || username };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            // Save to localStorage
            localStorage.setItem('taxai_token', data.token);
            localStorage.setItem('taxai_user', JSON.stringify(data.user));

            if (rememberMe) {
                localStorage.setItem('taxai_remembered_email', email);
            }

            // Apply user preferences (like dark mode)
            if (data.user.preferences) {
                localStorage.setItem('taxai_preferences', JSON.stringify(data.user.preferences));
            }

            setSuccess(isLogin ? 'Login successful! Redirecting...' : 'Account created! Redirecting...');

            // Callback to parent
            setTimeout(() => {
                onLogin(data.user, data.token);
            }, 1000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fillTestCredentials = () => {
        setEmail('rahul@example.com');
        setPassword('password123');
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Left Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <FloatingParticles />

                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Logo & Branding */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center mb-8"
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <Calculator className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Tax<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">.AI</span>
                        </h1>
                        <p className="text-gray-400">Enterprise GST Management Platform</p>
                    </motion.div>

                    {/* Glass Card Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl"
                    >
                        {/* Toggle Login/Signup */}
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isLogin
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isLogin
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Create Account
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <AnimatePresence mode="wait">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        {/* Username */}
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="Username"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                                required={!isLogin}
                                            />
                                        </div>

                                        {/* Display Name */}
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Full Name (optional)"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email address"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Remember Me & Forgot Password */}
                            {isLogin && (
                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 bg-white/5 text-purple-500 focus:ring-purple-500"
                                        />
                                        <span className="text-gray-400">Remember me</span>
                                    </label>
                                    <button type="button" className="text-purple-400 hover:text-purple-300">
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Success Message */}
                            <AnimatePresence>
                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm"
                                    >
                                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                        {success}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.02 }}
                                whileTap={{ scale: loading ? 1 : 0.98 }}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {isLogin ? 'Signing in...' : 'Creating account...'}
                                    </>
                                ) : (
                                    <>
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Demo Credentials */}
                        {isLogin && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <p className="text-center text-gray-500 text-sm mb-3">Demo credentials:</p>
                                <button
                                    onClick={fillTestCredentials}
                                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 text-sm transition-colors"
                                >
                                    📧 rahul@example.com / password123
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Footer */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center text-gray-500 text-sm mt-6"
                    >
                        By continuing, you agree to our{' '}
                        <a href="#" className="text-purple-400 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
                    </motion.p>
                </motion.div>
            </div>

            {/* Right Side - Visual Showcase */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-emerald-600/10" />

                {/* Mesh Pattern */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }}
                />

                {/* Floating Icons */}
                <FloatingIcon icon={Calculator} delay={0} className="top-20 left-20" />
                <FloatingIcon icon={FileText} delay={1} className="top-40 right-24" />
                <FloatingIcon icon={BarChart3} delay={2} className="bottom-40 left-32" />
                <FloatingIcon icon={Shield} delay={1.5} className="bottom-20 right-20" />
                <FloatingIcon icon={TrendingUp} delay={0.5} className="top-1/2 left-1/2" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-16">
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                            Simplify Your
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400">
                                GST Compliance
                            </span>
                        </h2>
                        <p className="text-xl text-gray-300 mb-10">
                            AI-powered invoice processing, automatic ledger mapping, and seamless Tally integration.
                        </p>
                    </motion.div>

                    {/* Feature Cards */}
                    <div className="space-y-4">
                        <FeatureCard
                            icon={Sparkles}
                            title="AI-Powered OCR"
                            description="Extract invoice data in seconds with 99% accuracy"
                            delay={0.5}
                        />
                        <FeatureCard
                            icon={Shield}
                            title="ITC Safe-Guard"
                            description="Automatic compliance checks for input tax credit"
                            delay={0.6}
                        />
                        <FeatureCard
                            icon={TrendingUp}
                            title="Real-Time Analytics"
                            description="Track GST trends and optimize your workflow"
                            delay={0.7}
                        />
                    </div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="mt-10 flex gap-8"
                    >
                        <div>
                            <p className="text-3xl font-bold text-white">10,000+</p>
                            <p className="text-sm text-gray-400">CAs Trust Us</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">₹500Cr+</p>
                            <p className="text-sm text-gray-400">Invoices Processed</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">99.9%</p>
                            <p className="text-sm text-gray-400">Accuracy Rate</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
