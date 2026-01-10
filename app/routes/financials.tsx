import { useState, useEffect, useMemo } from "react";
import { onSnapshot, doc, setDoc } from "firebase/firestore";
import { Calculator, Clock, DollarSign, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { collections } from "../services/firestore";
import { db } from "../services/firebase";
import { getWeekDays, getMonthDays, formatWeekRange, formatDate } from "../utils/date";
import { calculateStaffCost, calculateProductionNeeded, formatCurrency, PAYROLL_TAX_RATE, calculateHoursFromTimes } from "../utils/calculations";
import { TARGETS, DEPARTMENTS, type Department } from "../utils/constants";
import type { StaffMember, DailyLog } from "../services/firestore";

type Timeframe = 'daily' | 'weekly' | 'monthly';

import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function FinancialsPage() {
    const { isAdmin, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !isAdmin) {
            navigate("/schedule");
        }
    }, [isAdmin, loading, navigate]);

    // --- State ---
    const [timeframe, setTimeframe] = useState<Timeframe>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [schedule, setSchedule] = useState<Record<string, Record<string, string>>>({});
    const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});

    // Collections Input State (Persisted in DailyLog)
    const [localCollections, setLocalCollections] = useState("");

    // --- Data Fetching ---
    useEffect(() => {
        const unsubStaff = onSnapshot(collections.staff, s =>
            setStaff(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember)).sort((a, b) => a.name.localeCompare(b.name)))
        );

        // Fetch Schedule
        const unsubSched = onSnapshot(collections.schedule, s => {
            const data: Record<string, Record<string, string>> = {};
            s.docs.forEach(d => data[d.id] = d.data() as any);
            setSchedule(data);
        });

        // Fetch Logs (Only for Collections now)
        const unsubLogs = onSnapshot(collections.dailyLogs, s => {
            const data: Record<string, DailyLog> = {};
            s.docs.forEach(d => data[d.id] = d.data());
            setDailyLogs(data);
        });
        return () => { unsubStaff(); unsubSched(); unsubLogs(); };
    }, []);

    // Sync collections input
    useEffect(() => {
        if (timeframe === 'daily') {
            const val = dailyLogs[selectedDate]?.collections || "";
            setLocalCollections(val.toString());
        } else {
            setLocalCollections("");
        }
    }, [selectedDate, dailyLogs, timeframe]);

    const handleCollectionsChange = async (val: string) => {
        setLocalCollections(val);
        if (timeframe === 'daily') {
            const num = parseFloat(val);
            await setDoc(doc(db, 'daily_logs', selectedDate), { collections: isNaN(num) ? 0 : num }, { merge: true });
        }
    };

    // Helper to parse hours (supports "9-5" and "8")
    const parseHours = (val: string | undefined) => {
        if (!val) return 0;
        if (val.includes('-')) {
            // Basic parsing for legacy range if needed, reusing logic or simplified
            // Given we don't import calculateHoursFromTimes here, let's keep it simple or import it.
            // Ideally we should import it. But for now, let's assume the new "8" format is dominant or just handle simple parsing.
            // Actually, let's import it from calculations if possible. It IS imported.
            const [s, e] = val.split('-');
            return calculateHoursFromTimes(s, e);
        }
        return parseFloat(val) || 0;
    };

    // --- Calculations ---
    const financials = useMemo(() => {
        let dates: string[] = [];
        if (timeframe === 'daily') dates = [selectedDate];
        else if (timeframe === 'weekly') dates = getWeekDays(selectedDate);
        else if (timeframe === 'monthly') dates = getMonthDays(selectedDate);

        let staffCost = 0;
        let drCost = 0;
        const deptCosts: Record<string, number> = {};

        // Store breakdown for UI
        const staffHours: Record<string, number> = {};

        staff.forEach(member => {
            let totalH = 0;
            dates.forEach(d => {
                const val = schedule[d]?.[member.id]; // Read from Schedule
                totalH += parseHours(val);
            });

            staffHours[member.id] = totalH;

            const cost = calculateStaffCost(totalH, member.rate);

            if (member.department === 'Dr' || member.role.toLowerCase().includes('doctor')) {
                drCost += cost;
            } else {
                staffCost += cost;
            }

            const dept = member.department || 'Other';
            deptCosts[dept] = (deptCosts[dept] || 0) + cost;
        });

        const staffProdNeeded = calculateProductionNeeded(staffCost, TARGETS.STAFF_OVERHEAD);
        const drProdNeeded = calculateProductionNeeded(drCost, TARGETS.DOCTOR_OVERHEAD);

        return { staffCost, drCost, staffProdNeeded, drProdNeeded, deptCosts, staffHours };
    }, [staff, schedule, selectedDate, timeframe]);

    const collectionsVal = parseFloat(localCollections) || 0;
    const ebitda = collectionsVal - (financials.staffCost + financials.drCost);
    const ebitdaPercent = collectionsVal > 0 ? (ebitda / collectionsVal) * 100 : 0;

    const shiftDate = (dir: number) => {
        const d = new Date(selectedDate);
        if (timeframe === 'monthly') d.setMonth(d.getMonth() + dir);
        else if (timeframe === 'weekly') d.setDate(d.getDate() + (dir * 7));
        else d.setDate(d.getDate() + dir);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const getDateLabel = () => {
        if (timeframe === 'daily') return formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' });
        if (timeframe === 'weekly') return formatWeekRange(selectedDate);
        if (timeframe === 'monthly') return formatDate(selectedDate, { month: 'long', year: 'numeric' });
        return selectedDate;
    };

    const getShiftLabel = (dir: number) => {
        if (timeframe === 'daily') return dir > 0 ? 'Next Day' : 'Prev Day';
        if (timeframe === 'weekly') return dir > 0 ? 'Next Week' : 'Prev Week';
        return dir > 0 ? 'Next Month' : 'Prev Month';
    };

    // --- Render ---

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-8 rounded-[2rem] shadow-2xl shadow-emerald-900/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full mix-blend-overlay filter blur-3xl opacity-30 -mr-16 -mt-16"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold font-heading mb-1">Financials & Payroll</h1>
                        <p className="text-emerald-50 text-base opacity-90 font-medium tracking-wide">
                            Overview & Projections (Based on Schedule)
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl w-fit backdrop-blur-sm border border-white/10">
                        {(['daily', 'weekly', 'monthly'] as Timeframe[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all duration-300 ${timeframe === t ? 'bg-white text-teal-700 shadow-lg scale-105' : 'text-emerald-100 hover:bg-white/10 hover:text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Nav */}
                <div className="mt-8 flex items-center justify-center relative z-10">
                    <div className="flex items-center gap-6 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/15 transition-colors">
                        <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-white/20 rounded-xl transition-all hover:scale-110 active:scale-95" title={getShiftLabel(-1)}><ChevronLeft size={20} /></button>
                        <span className="font-bold text-xl min-w-[220px] text-center font-heading tracking-wide">{getDateLabel()}</span>
                        <button onClick={() => shiftDate(1)} className="p-2 hover:bg-white/20 rounded-xl transition-all hover:scale-110 active:scale-95" title={getShiftLabel(1)}><ChevronRight size={20} /></button>
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-sm border border-white/50 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Staff Cost</div>
                            <div className="text-4xl font-bold text-slate-800 tracking-tight font-heading">{formatCurrency(financials.staffCost)}</div>
                            <div className="text-xs text-emerald-700 mt-2 font-bold bg-emerald-50 border border-emerald-100 w-fit px-3 py-1 rounded-full">Target: 25%</div>
                        </div>
                        <div className="text-right">
                            <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">Production Needed</div>
                            <div className="text-2xl font-bold text-indigo-600 font-heading">{formatCurrency(financials.staffProdNeeded)}</div>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full mt-6 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full shadow-lg shadow-emerald-500/30" style={{ width: '25%' }}></div>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl shadow-slate-200 text-white flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-700 rounded-full -mr-16 -mt-16 opacity-30 blur-3xl group-hover:bg-indigo-900 transition-colors duration-500"></div>
                    <div className="relative flex justify-between items-start z-10">
                        <div>
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Doctor Cost</div>
                            <div className="text-4xl font-bold tracking-tight font-heading">{formatCurrency(financials.drCost)}</div>
                            <div className="text-xs text-indigo-200 mt-2 font-bold bg-indigo-500/20 border border-indigo-500/30 w-fit px-3 py-1 rounded-full">Target: 28%</div>
                        </div>
                        <div className="text-right">
                            <div className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">Production Needed</div>
                            <div className="text-2xl font-bold text-blue-100 font-heading">{formatCurrency(financials.drProdNeeded)}</div>
                        </div>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full mt-6 overflow-hidden relative z-10">
                        <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full shadow-lg shadow-indigo-500/30" style={{ width: '28%' }}></div>
                    </div>
                </div>
            </div>

            {/* EBITDA & Collections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[2rem] p-8 shadow-xl shadow-indigo-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-3 mb-6 opacity-90">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <Calculator size={20} className="text-indigo-100" />
                        </div>
                        <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-100">EBITDA Calculator</h3>
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-indigo-100 text-base font-medium">Collections</span>
                            <div className="relative w-48">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200 font-bold">$</span>
                                <input
                                    type="number"
                                    disabled={timeframe !== 'daily'}
                                    placeholder="0.00"
                                    value={localCollections}
                                    onChange={(e) => handleCollectionsChange(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-right font-bold text-xl text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-white/30 focus:bg-black/30 outline-none disabled:opacity-50 transition-all font-heading"
                                />
                            </div>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-indigo-100 text-base font-medium">Payroll Expense</span>
                            <span className="font-medium text-white/90 text-lg">- {formatCurrency(financials.staffCost + financials.drCost)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                            <span className="font-bold text-lg">EBITDA</span>
                            <div className="text-right">
                                <div className="text-3xl font-bold font-heading">{formatCurrency(ebitda)}</div>
                                <div className={`text-sm font-bold mt-1 ${ebitdaPercent > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{ebitdaPercent.toFixed(1)}% Margin</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dept Breakdown */}
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-8 shadow-sm border border-white/60">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-slate-400" /> Department Breakdown
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(financials.deptCosts).map(([dept, cost]) => (
                            <div key={dept} className="flex items-center justify-between group hover:bg-slate-50 p-2 rounded-lg transition-colors -mx-2 px-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 group-hover:scale-125 transition-transform"></div>
                                    <span className="text-base font-medium text-slate-600">{dept}</span>
                                </div>
                                <span className="text-base font-bold text-slate-900 font-heading">{formatCurrency(cost)}</span>
                            </div>
                        ))}
                        {Object.keys(financials.deptCosts).length === 0 && <div className="text-slate-400 text-sm italic text-center py-8">No payroll data for this period.</div>}
                    </div>
                </div>
            </div>

            {/* Scheduled Hours Breakdown (Visible for Daily and Weekly) */}
            {(timeframe === 'daily' || timeframe === 'weekly') && (
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/60 overflow-hidden">
                    <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={20} className="text-emerald-600" /> Scheduled Hours Breakdown</h3>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-100/50 px-3 py-1.5 rounded-full border border-emerald-200/50">
                            {timeframe === 'weekly' ? 'Weekly Totals' : 'Daily Totals'}
                        </span>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staff.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-emerald-100 group">
                                <div>
                                    <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-700 transition-colors">{member.name}</div>
                                    <div className="text-xs text-slate-500 font-medium">{member.role}</div>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                                    <div className="text-lg font-bold text-slate-800 font-heading">
                                        {financials.staffHours[member.id]?.toFixed(1) || '0.0'}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">hrs</span>
                                </div>
                            </div>
                        ))}
                        {staff.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">No staff found.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
