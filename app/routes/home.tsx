
import { NavLink } from "react-router";
import { Users, Calculator, Calendar, ArrowRight } from "lucide-react";

const QuickLink = ({ to, icon: Icon, title, desc, color }: any) => (
  <NavLink to={to} className="group block p-6 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all hover:-translate-y-1 relative overflow-hidden">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
      <Icon className="text-white" size={26} />
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors font-heading tracking-tight">{title}</h3>
    <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">{desc}</p>
    <div className="flex items-center text-sm font-bold text-emerald-600 gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
      Open Module <ArrowRight size={16} />
    </div>
  </NavLink>
);

import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-heading mb-2">
          Welcome back
        </h1>
        <p className="text-slate-500 text-lg">Here is your practice overview for today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {isAdmin && (
          <QuickLink
            to="/financials"
            icon={Calculator}
            title="Financials & Payroll"
            desc="Track daily production, staff costs, and EBITDA projections."
            color="bg-gradient-to-br from-indigo-500 to-violet-600"
          />
        )}
        <QuickLink
          to="/schedule"
          icon={Calendar}
          title="Weekly Schedule"
          desc="Manage staff shifts, compare scheduled vs actual hours."
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        {isAdmin && (
          <QuickLink
            to="/team"
            icon={Users}
            title="Manage Team"
            desc="Add employee profiles, set roles and hourly rates."
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
          />
        )}
        {!isAdmin && (
          <QuickLink
            to="/team"
            icon={Users}
            title="Team Directory"
            desc="View staff contact info and roles."
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
          />
        )}
      </div>

      {isAdmin && (
        <div className="mt-16 p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
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
