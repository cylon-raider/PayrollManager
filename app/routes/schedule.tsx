import { useState, useEffect } from "react";
import { onSnapshot, setDoc, doc } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Copy, Calendar, Save } from "lucide-react"; // Import Save just in case
import { collections } from "../services/firestore";
import { db } from "../services/firebase";
import { getWeekDays, formatWeekRange } from "../utils/date";
import { calculateHoursFromTimes, formatSmartTime } from "../utils/calculations";
import { type StaffMember, type DaySchedule, type DailyLog } from "../services/firestore";

// --- Sub-Component: Schedule Cell ---
const ScheduleCell = ({ date, memberId, schedule, onUpdate, dayIndex, weekDays, memberIndex, totalMembers }: any) => {
    const rawValue = schedule[date]?.[memberId] || '';

    // Parse DB value
    const [dbStart, dbEnd] = rawValue.includes('-') ? rawValue.split('-') : ['', ''];

    const [start, setStart] = useState(dbStart);
    const [end, setEnd] = useState(dbEnd);

    // Sync with DB changes
    useEffect(() => {
        const val = schedule[date]?.[memberId] || '';
        if (val.includes('-')) {
            const [s, e] = val.split('-');
            setStart(s);
            setEnd(e);
        } else {
            setStart('');
            setEnd('');
        }
    }, [schedule, date, memberId]);

    const handleBlur = () => {
        const formattedStart = formatSmartTime(start);
        const formattedEnd = formatSmartTime(end, true);

        // Update local mostly for visual feedback immediately
        setStart(formattedStart);
        setEnd(formattedEnd);

        if (formattedStart && formattedEnd) {
            onUpdate(date, memberId, `${formattedStart}-${formattedEnd}`);
        } else if (formattedStart || formattedEnd) {
            // Save partial if needed, or clear. Let's save partial to allow coming back.
            onUpdate(date, memberId, `${formattedStart}-${formattedEnd}`);
        } else {
            // Both empty
            onUpdate(date, memberId, '');
        }
    };

    const hours = calculateHoursFromTimes(start, end);

    return (
        <div className="flex flex-col bg-gray-50 rounded-xl p-1.5 h-auto border border-gray-100 shadow-sm items-center justify-center min-w-[100px] transition-colors hover:border-emerald-200/50 group/cell">
            <div className="flex flex-col items-center gap-0.5 w-full mb-1">
                <input
                    data-nav="schedule-start"
                    type="text"
                    className="w-full text-center text-[11px] font-bold text-gray-700 bg-transparent outline-none placeholder:text-gray-300 p-0 focus:text-emerald-700"
                    placeholder="Start"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    onBlur={handleBlur}
                />
                <div className="w-8 h-[1px] bg-gray-200 group-hover/cell:bg-emerald-200/50 transition-colors" />
                <input
                    data-nav="schedule-end"
                    type="text"
                    className="w-full text-center text-[11px] font-bold text-gray-700 bg-transparent outline-none placeholder:text-gray-300 p-0 focus:text-emerald-700"
                    placeholder="End"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    onBlur={handleBlur}
                />
            </div>
            <div className={`text-xs font-bold px-3 py-1 rounded-md mt-1 ${hours > 0 ? 'bg-emerald-100 text-emerald-700' : 'text-gray-300'}`}>
                {hours > 0 ? hours : '-'}
            </div>
        </div>
    );
};

export default function SchedulePage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({});

    useEffect(() => {
        const unsubStaff = onSnapshot(collections.staff, (s) =>
            setStaff(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember)).sort((a, b) => {
                if (a.role !== b.role) return a.role.localeCompare(b.role);
                return a.name.localeCompare(b.name);
            }))
        );
        const unsubSched = onSnapshot(collections.schedule, (s) => {
            const data: Record<string, DaySchedule> = {};
            s.forEach(d => data[d.id] = d.data());
            setSchedule(data);
        });
        return () => { unsubStaff(); unsubSched(); };
    }, []);

    const weekDays = getWeekDays(selectedDate);

    const handleUpdate = async (date: string, staffId: string, val: string) => {
        const dayData = schedule[date] || {};
        await setDoc(doc(db, 'schedule', date), { ...dayData, [staffId]: val }, { merge: true });
    };

    const copyLastWeek = async () => {
        if (!confirm("Copy schedule from the previous week? This will overwrite the current week's schedule.")) return;

        const currentWeekStart = new Date(weekDays[0]);
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        for (let i = 0; i < 7; i++) {
            const srcDate = new Date(lastWeekStart);
            srcDate.setDate(srcDate.getDate() + i);
            const targetDate = new Date(currentWeekStart);
            targetDate.setDate(targetDate.getDate() + i);

            const srcStr = srcDate.toISOString().split('T')[0];
            const targetStr = targetDate.toISOString().split('T')[0];

            const srcData = schedule[srcStr];
            if (srcData) {
                const currentData = schedule[targetStr] || {};
                await setDoc(doc(db, 'schedule', targetStr), { ...currentData, ...srcData }, { merge: true });
            }
        }
        alert("Schedule copied successfully!");
    };

    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // Flatten logic for navigation calc? 
    // Actually we iterate grouped.
    const groupedStaff = staff.reduce((acc, member) => {
        const d = member.department || 'Other';
        acc[d] = acc[d] || [];
        acc[d].push(member);
        return acc;
    }, {} as Record<string, StaffMember[]>);

    // Calculate total input count for nav awareness if needed, 
    // but the querySelector approach is dynamic and safer for grouped lists.

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="bg-white/80 backdrop-blur-md border border-white/50 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-heading">Weekly Schedule</h1>
                    <div className="flex items-center gap-3 mt-3">
                        <button onClick={() => shiftDate(-7)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronLeft size={22} className="text-slate-600" /></button>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-200/50">
                            <Calendar size={18} className="text-emerald-600" />
                            {formatWeekRange(selectedDate)}
                        </div>
                        <button onClick={() => shiftDate(7)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronRight size={22} className="text-slate-600" /></button>
                    </div>
                </div>
                <button onClick={copyLastWeek} className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-6 py-3 rounded-xl transition-all border border-emerald-100 shadow-sm hover:shadow-md active:scale-[0.98]">
                    <Copy size={18} /> Copy Last Week
                </button>
            </header>

            <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/60 overflow-hidden p-2">
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-[1200px] p-6">
                        {/* Header Row */}
                        <div className="grid grid-cols-[220px_repeat(7,1fr)_100px] gap-4 mb-6">
                            <div className="font-bold text-slate-400 text-xs uppercase p-2 flex items-end tracking-wider">Employee</div>
                            {weekDays.map(day => {
                                const d = new Date(day);
                                const isToday = day === new Date().toISOString().split('T')[0];
                                return (
                                    <div key={day} className={`text-center p-4 rounded-2xl transition-all ${isToday ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105' : 'bg-slate-50/50 text-slate-500'}`}>
                                        <div className={`text-[10px] font-bold uppercase mb-1 ${isToday ? 'opacity-90' : 'opacity-70'}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                        <div className="text-xl font-bold leading-none font-heading">{d.getDate()}</div>
                                    </div>
                                );
                            })}
                            <div className="font-bold text-slate-400 text-xs uppercase p-2 flex items-end justify-center tracking-wider text-center">Totals</div>
                        </div>

                        {/* Rows */}
                        <div className="space-y-8">
                            {Object.entries(groupedStaff).map(([dept, members]) => (
                                <div key={dept}>
                                    {/* Dept Header */}
                                    <div className="flex items-center gap-3 mb-4 px-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dept}</span>
                                    </div>

                                    {members.map((member, mIndex) => {
                                        // Calculate Weekly Totals
                                        let totalSched = 0;
                                        weekDays.forEach(day => {
                                            const dbVal = schedule[day]?.[member.id] || '';
                                            // Handle legacy numeric + range
                                            let hrs = 0;
                                            if (dbVal.includes('-')) {
                                                hrs = calculateHoursFromTimes(...dbVal.split('-') as [string, string]);
                                            } else {
                                                hrs = parseFloat(dbVal || '0');
                                            }
                                            totalSched += hrs;
                                        });

                                        return (
                                            <div key={member.id} className="grid grid-cols-[220px_repeat(7,1fr)_100px] gap-4 items-stretch mb-3 group">
                                                <div className="bg-white/70 rounded-2xl p-4 flex flex-col justify-center shadow-sm border border-slate-100 group-hover:border-emerald-200/50 group-hover:bg-white transition-all">
                                                    <div className="font-bold text-sm text-slate-800 truncate mb-0.5">{member.name}</div>
                                                    <div className="text-xs text-slate-500 font-medium truncate">{member.role}</div>
                                                </div>
                                                {weekDays.map((day, dIndex) => (
                                                    <ScheduleCell
                                                        key={day}
                                                        date={day}
                                                        memberId={member.id}
                                                        schedule={schedule}
                                                        onUpdate={handleUpdate}
                                                        dayIndex={dIndex}
                                                        weekDays={weekDays}
                                                        memberIndex={mIndex}
                                                        totalMembers={members.length}
                                                    />
                                                ))}
                                                {/* Weekly Totals Cell */}
                                                <div className="flex flex-col justify-center items-center bg-slate-50 rounded-2xl border border-slate-100 p-2 shadow-inner">
                                                    <div className="text-lg font-bold text-slate-700 font-heading">{parseFloat(totalSched.toFixed(2))}</div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">hrs</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
