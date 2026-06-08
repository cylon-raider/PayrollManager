/**
 * Login / Authentication Route Component
 * 
 * Handles email & password authentication workflows (sign-in and sign-up).
 * Communicates directly with the Firebase Authentication SDK client-side,
 * displaying reactive error messages and utilizing ambient backdrop blur aesthetics.
 */

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router";
import { auth } from "../services/firebase";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function Login() {
    // Toggles between Sign In (false) and Account Creation (true) forms
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    /**
     * Orchestrates form submission to Firebase Auth.
     * Triggers account creation or session sign-in based on `isRegister`.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Clear previous errors
        try {
            if (isRegister) {
                // Sign-up flow
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                // Sign-in flow
                await signInWithEmailAndPassword(auth, email, password);
            }
            // Upon successful session creation, redirect to protected home layout
            navigate("/");
        } catch (err: any) {
            console.error(err);
            // Translate Firebase Auth errors to human-readable strings
            setError(err.message || "Authentication failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
            {/* Ambient background visual effects using blurred absolute divs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 -ml-20 -mt-20"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 -mr-20 -mb-20"></div>

            {/* Glassmorphism card container */}
            <div className="bg-white/90 backdrop-blur-xl max-w-md w-full rounded-[2.5rem] shadow-2xl shadow-black/20 p-8 md:p-10 border border-white/20 relative z-10">
                <div className="text-center mb-10">
                    <img src="/logo.jpg" alt="FDS" className="w-24 h-24 object-contain rounded-xl shadow-md mx-auto mb-6 bg-white p-2" />
                    <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">{isRegister ? "Create Account" : "Welcome Back"}</h1>
                    <p className="text-slate-500 mt-2 text-base font-medium">Dental Payroll Manager</p>
                </div>

                {/* Error Banner feedback */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold mb-6 text-center border border-red-100 flex items-center justify-center gap-2 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email Input Field */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-800 placeholder-slate-400 transition-all"
                                placeholder="doctor@clinic.com"
                            />
                        </div>
                    </div>
                    
                    {/* Password Input Field */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-800 placeholder-slate-400 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 text-lg">
                        {isRegister ? "Sign Up" : "Sign In"} <ArrowRight size={20} />
                    </button>
                </form>

                {/* Switcher button to toggle register/login state without navigation reload */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-sm font-bold text-slate-500 hover:text-emerald-600 hover:underline transition-colors"
                    >
                        {isRegister ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </button>
                </div>
            </div>

            <div className="absolute bottom-6 text-slate-500 text-xs font-medium opacity-60">
                © 2026 Markel Enterprises
            </div>
        </div>
    );
}
