import { NavLink } from "react-router";
import { Calculator, Calendar, Users, Home, Settings } from "lucide-react";
import { type ComponentProps } from "react";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/financials", icon: Calculator, label: "Financials" },
    { to: "/schedule", icon: Calendar, label: "Schedule" },
    { to: "/team", icon: Users, label: "Manage Team" },
];

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
    const { isAdmin } = useAuth();

    const visibleItems = NAV_ITEMS.filter(item => {
        if (item.label === "Financials") return isAdmin;
        return true;
    });

    return (
        <>
            {/* Mobile Nav */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-2xl flex justify-around p-3 shadow-lg z-50">
                {visibleItems.map((item) => (
                    <MobileNavButton key={item.to} {...item} />
                ))}
                <button
                    onClick={async () => {
                        try {
                            const { signOut } = await import("firebase/auth");
                            const { auth } = await import("../../services/firebase");
                            await signOut(auth);
                            window.location.href = "/login";
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

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-4 top-4 bottom-4 w-72 bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl flex-col p-6 z-50">
                <div className="mb-10 px-2 mt-2">
                    <div className="flex items-center gap-4 mb-2">
                        {/* Logo */}
                        <img src="/logo.jpg" alt="FDS" className="w-16 h-16 object-contain rounded-xl shadow-md rotate-[-3deg]" />
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

                <div className="space-y-2">
                    {visibleItems.map((item) => (
                        <SidebarButton key={item.to} {...item} />
                    ))}
                </div>

                <div className="mt-auto px-2 space-y-4">
                    <button
                        onClick={async () => {
                            try {
                                const { signOut } = await import("firebase/auth");
                                const { auth } = await import("../../services/firebase");
                                await signOut(auth);
                                window.location.href = "/login";
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
