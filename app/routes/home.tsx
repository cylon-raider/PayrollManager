
/**
 * Home Route Component (Landing Page / Dashboard)
 * 
 * Provides an entry point to the application's core modules.
 * Renders distinct features depending on whether the user has 'admin' or 'viewer' role:
 * - Admin: Sees quick links to financials, scheduling, team administration, and a "Practice Goals" banner.
 * - Viewer: Sees directory-only layout options.
 */

import { NavLink } from "react-router";
import { Users, Calculator, Calendar, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Sub-component for rendering high-fidelity interactive navigation cards.
 * Implements modern CSS gradients, hover animations (scaling and translations),
 * and dynamic action indicators.
 */
const QuickLink = ({ to, icon: Icon, title, desc, color }: any) => (
  <NavLink to={to} className="group block p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] border border-white/20 dark:border-slate-800/40 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all hover:-translate-y-1 relative overflow-hidden">
    {/* Dynamic Background Gradient Indicator */}
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
      <Icon className="text-white" size={26} />
    </div>
    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors font-heading tracking-tight">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">{desc}</p>
    {/* Micro-animation: link prompt slides in and fades on hover */}
    <div className="flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-400 gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
      Open Module <ArrowRight size={16} />
    </div>
  </NavLink>
);

export default function Home() {
  // Pull role-based flags from the global Auth Context
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header greeting */}
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading mb-2">
          Welcome back
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Here is your practice overview for today.</p>
      </header>

      {/* Grid mapping modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Financial reports are strictly guarded. Visible only to Admin. */}
        {isAdmin && (
          <QuickLink
            to="/financials"
            icon={Calculator}
            title="Financials & Payroll"
            desc="Track daily production, staff costs, and EBITDA projections."
            color="bg-gradient-to-br from-indigo-500 to-violet-600"
          />
        )}
        
        {/* Weekly schedules are visible to all authenticated roles. */}
        <QuickLink
          to="/schedule"
          icon={Calendar}
          title="Weekly Schedule"
          desc="Manage staff shifts, compare scheduled vs actual hours."
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        
        {/* Dynamic Card rendering depending on authorization levels */}
        {isAdmin ? (
          <QuickLink
            to="/team"
            icon={Users}
            title="Manage Team"
            desc="Add employee profiles, set roles and hourly rates."
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
          />
        ) : (
          <QuickLink
            to="/team"
            icon={Users}
            title="Team Directory"
            desc="View staff contact info and roles."
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
          />
        )}
      </div>

      {/* Practice Goals Banner - Restrict to Admins */}
      {isAdmin && (
        <div className="mt-16 p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          {/* Decorative ambient blobs that grow/lighten on hover */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 -mr-20 -mt-20 group-hover:opacity-30 transition-opacity duration-700"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 -ml-20 -mb-20 group-hover:opacity-30 transition-opacity duration-700"></div>

          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold mb-4 font-heading">Practice Goals</h2>
            <p className="text-slate-300 mb-8 text-lg leading-relaxed">Keep staff overhead below <span className="text-emerald-400 font-bold">25%</span> and doctor overhead below <span className="text-emerald-400 font-bold">28%</span> to maximize profitability.</p>
            <NavLink to="/financials" className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all transform hover:-translate-y-0.5">
              View Reports <ArrowRight size={18} />
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}
