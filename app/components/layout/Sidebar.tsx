/**
 * Sidebar Navigation Component
 * 
 * Provides navigation layout for both mobile views (bottom navigation bar) and
 * desktop screens (fixed absolute-positioned left panel). Renders links conditionally
 * depending on user roles (admins see financial controls; viewers only see directories).
 * Implements lazy loading / code splitting for the sign-out functionality.
 */

import { NavLink } from "react-router";
import { Calculator, Calendar, Users, Home, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Declares static metadata registry of system sections
const NAV_ITEMS = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/financials", icon: Calculator, label: "Financials" },
    { to: "/schedule", icon: Calendar, label: "Schedule" },
    { to: "/team", icon: Users, label: "Manage Team" },
];

/**
 * Sub-component for rendering a standard desktop sidebar hyperlink.
 * Integrates React Router's `NavLink` to dynamically highlight the active route.
 */
const SidebarButton = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isActive
                ? "bg-emerald-50 text-emerald-800 font-bold shadow-sm ring-1 ring-emerald-100"
                : "text-gray-500 hover:bg-gray-50 font-medium hover:text-gray-700"
            }`
        }
    >
        <Icon size={20} />
        {label}
    </NavLink>
);

/**
 * Sub-component for rendering a mobile bottom navigation bar icon link.
 * Integrates React Router's `NavLink` to dynamically colorize the active route.
 */
const MobileNavButton = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center transition-colors ${isActive ? "text-emerald-600" : "text-gray-400"
            }`
        }
    >
        <Icon size={24} />
        <span className="text-[10px] uppercase font-bold mt-1">{label}</span>
    </NavLink>
);

export const Sidebar = () => {
    // Retrieve authentication authorization role
    const { isAdmin } = useAuth();

    /**
     * ROLE-BASED VISIBILITY FILTERING
     * Dynamic menu logic: If a module requires administrative privilege (e.g. Financials),
     * only add it to the visible list if the logged-in user is an admin.
     */
    const visibleItems = NAV_ITEMS.filter(item => {
        if (item.label === "Financials") return isAdmin;
        return true;
    });

    return (
        <>
            {/* ======================================================== */}
            {/* Mobile Bottom Navigation Bar (Hidden on md screens up) */}
            {/* ======================================================== */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-2xl flex justify-around p-3 shadow-lg z-50">
                {visibleItems.map((item) => (
                    <MobileNavButton key={item.to} {...item} />
                ))}
                
                {/* Logout Button (Mobile) */}
                <button
                    onClick={async () => {
                        try {
                            /**
                             * CODE-SPLITTING OPTIMIZATION
                             * Lazy-loads heavy Firebase authentication modules only when the user
                             * triggers a logout action. Minimizes initial frontend JavaScript bundle.
                             */
                            const { signOut } = await import("firebase/auth");
                            const { auth } = await import("../../services/firebase");
                            await signOut(auth);
                            window.location.href = "/login"; // Force full browser redirect to clean state
                        } catch (error) {
                            console.error("Logout failed", error);
                        }
                    }}
                    className="flex flex-col items-center text-gray-400 active:text-red-500 transition-colors"
                >
                    <Settings size={22} />
                    <span className="text-[10px] uppercase font-bold mt-1">Logout</span>
                </button>
            </nav>

            {/* ======================================================== */}
            {/* Desktop Left Sidebar Panel (Hidden on screens below md) */}
            {/* ======================================================== */}
            <aside className="hidden md:flex fixed left-4 top-4 bottom-4 w-72 bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl flex-col p-6 z-50">
                
                {/* Brand / Logo Header */}
                <div className="mb-10 px-2 mt-2">
                    <div className="flex items-center gap-4 mb-2">
                        <img src="/logo.jpg" alt="FDS" className="w-16 h-16 object-contain rounded-xl shadow-md scale-110" />
                        <div>
                            <span className="text-xl font-bold text-slate-800 tracking-tight block leading-none font-heading">
                                Family
                            </span>
                            <span className="text-sm font-medium text-slate-500 tracking-wide uppercase">
                                Dental Station
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Navigation Items */}
                <div className="space-y-2">
                    {visibleItems.map((item) => (
                        <SidebarButton key={item.to} {...item} />
                    ))}
                </div>

                {/* Bottom Footer Section */}
                <div className="mt-auto px-2 space-y-4">
                    {/* Logout Button (Desktop) */}
                    <button
                        onClick={async () => {
                            try {
                                // Lazy load Firebase imports on trigger
                                const { signOut } = await import("firebase/auth");
                                const { auth } = await import("../../services/firebase");
                                await signOut(auth);
                                window.location.href = "/login"; // Clear browser caches / states
                            } catch (error) {
                                console.error("Logout failed", error);
                            }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 font-medium transition-all group"
                    >
                        <Settings size={20} className="group-hover:rotate-90 transition-transform" />
                        Logout
                    </button>

                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-xs text-slate-400 font-medium text-center">© 2026 Markel Enterprises</p>
                    </div>
                </div>
            </aside>
        </>
    );
};
