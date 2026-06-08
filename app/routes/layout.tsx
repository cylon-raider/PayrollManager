/**
 * App Layout Component
 * 
 * Functions as the top-level route wrapper for authenticated routes.
 * Wraps all matching child pages inside the global `AuthProvider` context.
 * Enforces a frontend navigation guard: if no authenticated session exists,
 * the client is automatically redirected to the `/login` route.
 */

import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { AuthProvider, useAuth } from "../context/AuthContext";

/**
 * Renders the protected application shell containing the sidebar and the main content viewport.
 * Uses the custom React Hook `useAuth` to inspect the user's login state.
 */
function LayoutContent() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    // Authentication Guard effect
    useEffect(() => {
        // Once auth initialized, check if a valid user exists.
        // If not, redirect immediately to login.
        if (!loading && !user) {
            navigate("/login");
        }
    }, [user, loading, navigate]);

    // Renders an emerald spinner during Firebase auth handshake / role retrieval
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    // Fallback UI to prevent screen flash while navigation redirect is executing.
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
                Redirecting to login...
            </div>
        );
    }

    // Authenticated Layout Shell
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
            {/* Sidebar navigation (dynamically shows routes based on user role) */}
            <Sidebar />
            
            {/* Main content grid area (indents on desktop to make room for absolute-positioned sidebar) */}
            <main className="pb-24 md:pb-8 md:pl-80 min-h-screen transition-all duration-300">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    {/* Nested child routes are mounted and rendered here */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

/**
 * Main Layout Entry Point.
 * Wraps the protected layout tree inside the AuthProvider to make authorization state globally available.
 */
export default function AppLayout() {
    return (
        <AuthProvider>
            <LayoutContent />
        </AuthProvider>
    );
}
