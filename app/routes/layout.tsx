import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { AuthProvider, useAuth } from "../context/AuthContext";

function LayoutContent() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            navigate("/login");
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    // If not loading and no user, the useEffect will redirect. 
    // We render a fallback instead of null to prevent black screen if redirect is slow/fails.
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
                Redirecting to login...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
            <Sidebar />
            <main className="pb-24 md:pb-8 md:pl-80 min-h-screen transition-all duration-300">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default function AppLayout() {
    return (
        <AuthProvider>
            <LayoutContent />
        </AuthProvider>
    );
}
