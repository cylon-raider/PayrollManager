/**
 * Weekly Schedule Route Component
 * 
 * Renders an interactive spreadsheet-like grid tracking the planned hours for all staff members.
 * Supports:
 * - Real-time synchronization of schedule changes via Firestore active subscriptions.
 * - Auto-formatting smart time inputs (e.g., converts raw "9" -> "9:00 AM", "5p" -> "5:00 PM").
 * - Bulk operations (copying schedule from the previous week).
 * - Interactive week boundaries navigation.
 */

import { useState, useEffect, useMemo } from "react";
import { onSnapshot, setDoc, doc, updateDoc, deleteField } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Copy, Calendar, Save, Trash2, Plus, X, CalendarDays, Users, Printer } from "lucide-react";
import { collections } from "../services/firestore";
import { db } from "../services/firebase";
import { getWeekDays, formatWeekRange, formatDate } from "../utils/date";
import { calculateHoursFromTimes, formatSmartTime } from "../utils/calculations";
import { type StaffMember, type DaySchedule, type DailyLog } from "../services/firestore";
import { useAuth } from "../context/AuthContext";
import { JOB_ROLES } from "../utils/constants";

// ==========================================
// --- Helper: Monthly Calendar Week Generator ---
// ==========================================

const getMonthCalendarWeeks = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const weeks = [];
    const curr = new Date(firstDay);
    
    // Adjust to nearest preceding Monday (Monday = 1)
    let dayDiff = curr.getDay() - 1;
    if (curr.getDay() === 0) {
        dayDiff = 6;
    }
    curr.setDate(curr.getDate() - dayDiff);
    
    while (curr <= lastDay || curr.getDay() !== 1) {
        const week = [];
        for (let i = 0; i < 6; i++) { // Monday to Saturday
            week.push(new Date(curr).toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        weeks.push(week);
        curr.setDate(curr.getDate() + 1); // Skip Sunday
    }
    return weeks;
};

// Short label mappings for roles to save calendar space
const getShortRole = (role: string) => {
    if (role === 'Hygienist') return 'RDH';
    if (role === 'Hygiene Assistant') return 'RDH Asst';
    if (role === 'OS Assistant') return 'OS Asst';
    if (role === 'Sterilization Tech') return 'Steril Tech';
    return role;
};

// Shorthand time parser (e.g., "9:00 AM-5:00 PM" -> "9a-5p")
const formatShiftTimeShorthand = (timeRange: any) => {
    const str = typeof timeRange === 'string' ? timeRange : String(timeRange || '');
    if (!str || !str.includes('-')) return str;
    const [start, end] = str.split('-');
    
    const formatSingleTime = (t: string) => {
        let clean = t.trim();
        const isPM = clean.toUpperCase().includes('PM');
        const isAM = clean.toUpperCase().includes('AM');
        let timePart = clean.replace(/[ap]m/i, '').trim();
        let [hours, minutes] = timePart.split(':');
        let h = parseInt(hours, 10);
        let m = minutes ? parseInt(minutes, 10) : 0;
        
        let mStr = m > 0 ? `:${m.toString().padStart(2, '0')}` : '';
        let suffix = isPM ? 'p' : (isAM ? 'a' : '');
        return `${h}${mStr}${suffix}`;
    };
    
    return `${formatSingleTime(start)}-${formatSingleTime(end)}`;
};

// Tab selection filter logic
const isShiftInTab = (key: string, val: any, tab: string, staffList: StaffMember[]) => {
    if (tab === 'all') return true;
    
    const valStr = typeof val === 'string' ? val : String(val || '');
    const isNeed = key.startsWith('need_') || valStr.toLowerCase().startsWith('need');
    
    if (isNeed) {
        const text = valStr.toLowerCase();
        if (tab === 'rdh') {
            return text.includes('rdh') || text.includes('hygiene') || text.includes('hygienist');
        }
        if (tab === 'assistants') {
            return text.includes('assistant') || text.includes('tech') || text.includes('float') || text.includes('efda');
        }
        if (tab === 'front') {
            return text.includes('front') || text.includes('desk') || text.includes('receptionist') || text.includes('scheduler') || text.includes('concierge');
        }
        if (tab === 'doctor') {
            return text.includes('dr') || text.includes('doctor') || text.includes('dentist');
        }
        return false;
    } else {
        const member = staffList.find(s => s.id === key);
        if (!member) return false;
        
        const role = member.role;
        const dept = member.department;
        
        if (tab === 'rdh') {
            return JOB_ROLES.Hygiene.includes(role as any);
        }
        if (tab === 'assistants') {
            return JOB_ROLES.Assistants.includes(role as any);
        }
        if (tab === 'front') {
            return JOB_ROLES['Front Desk'].includes(role as any) || dept === 'Front Desk';
        }
        if (tab === 'doctor') {
            return JOB_ROLES.Doctor.includes(role as any) || dept === 'Dr';
        }
        return false;
    }
};

// ==========================================
// --- Sub-Component: Schedule Grid Cell ---
// ==========================================

const ScheduleCell = ({ date, memberId, schedule, onUpdate }: any) => {
    const { isAdmin } = useAuth();
    const rawValue = schedule[date]?.[memberId] || '';
    const [dbStart, dbEnd] = rawValue.includes('-') ? rawValue.split('-') : ['', ''];

    const [start, setStart] = useState(dbStart);
    const [end, setEnd] = useState(dbEnd);

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
        if (!isAdmin) return;
        const formattedStart = formatSmartTime(start);
        const formattedEnd = formatSmartTime(end, true);

        setStart(formattedStart);
        setEnd(formattedEnd);

        if (formattedStart && formattedEnd) {
            onUpdate(date, memberId, `${formattedStart}-${formattedEnd}`);
        } else if (formattedStart || formattedEnd) {
            onUpdate(date, memberId, `${formattedStart}-${formattedEnd}`);
        } else {
            onUpdate(date, memberId, '');
        }
    };

    const hours = calculateHoursFromTimes(start, end);

    return (
        <div className="flex flex-col bg-gray-50 rounded-xl p-1.5 h-auto border border-gray-100 shadow-sm items-center justify-center min-w-[100px] transition-colors hover:border-emerald-200/50 group/cell">
            <div className="flex flex-col items-center gap-0.5 w-full mb-1">
                <input
                    disabled={!isAdmin}
                    data-nav="schedule-start"
                    type="text"
                    className={`w-full text-center text-[11px] font-bold text-gray-700 bg-transparent outline-none placeholder:text-gray-300 p-0 focus:text-emerald-700 ${!isAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
                    placeholder="Start"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    onBlur={handleBlur}
                />
                <div className="w-8 h-[1px] bg-gray-200 group-hover/cell:bg-emerald-200/50 transition-colors" />
                <input
                    disabled={!isAdmin}
                    data-nav="schedule-end"
                    type="text"
                    className={`w-full text-center text-[11px] font-bold text-gray-700 bg-transparent outline-none placeholder:text-gray-300 p-0 focus:text-emerald-700 ${!isAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
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

// ==========================================
// --- Main Component: Schedule Page ---
// ==========================================

export default function SchedulePage() {
    const { isAdmin } = useAuth();
    const [viewMode, setViewMode] = useState<'employee' | 'calendar'>('calendar');
    
    // Employee View Date state
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Calendar View States
    const [calendarTab, setCalendarTab] = useState<'all' | 'rdh' | 'assistants' | 'front' | 'doctor'>('all');
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
    
    // Database states
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({});

    // Modal state for schedule updates
    const [selectedDayForModal, setSelectedDayForModal] = useState<string | null>(null);
    const [newShiftType, setNewShiftType] = useState<'employee' | 'need'>('employee');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');
    const [vacantRole, setVacantRole] = useState('RDH');
    const [vacantTime, setVacantTime] = useState('9-5');

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
        if (!isAdmin) return;
        const dayData = schedule[date] || {};
        await setDoc(doc(db, 'schedule', date), { ...dayData, [staffId]: val }, { merge: true });
    };

    const handleDeleteShift = async (date: string, key: string) => {
        if (!isAdmin) return;
        try {
            await updateDoc(doc(db, 'schedule', date), {
                [key]: deleteField()
            });
        } catch (error) {
            console.error("Error deleting shift:", error);
        }
    };

    const handleAddShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin || !selectedDayForModal) return;

        const dayData = schedule[selectedDayForModal] || {};

        if (newShiftType === 'employee') {
            if (!selectedStaffId) return;
            const formattedStart = formatSmartTime(shiftStart);
            const formattedEnd = formatSmartTime(shiftEnd, true);

            if (formattedStart && formattedEnd) {
                await setDoc(doc(db, 'schedule', selectedDayForModal), {
                    ...dayData,
                    [selectedStaffId]: `${formattedStart}-${formattedEnd}`
                }, { merge: true });
                setSelectedStaffId('');
                setShiftStart('');
                setShiftEnd('');
            } else {
                alert("Please enter a valid start and end time (e.g. 9a-5p).");
            }
        } else {
            // Vacant Slot Need
            const uniqueId = `need_${Date.now()}`;
            const timeText = vacantTime.trim() || '9-5';
            const val = `need ${vacantRole} ${timeText}`;
            await setDoc(doc(db, 'schedule', selectedDayForModal), {
                ...dayData,
                [uniqueId]: val
            }, { merge: true });
            setVacantTime('9-5');
        }
    };

    const copyLastWeek = async () => {
        if (!isAdmin) return;
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

    const copyWeekRow = async (rowDays: string[]) => {
        if (!isAdmin) return;
        if (!confirm("Copy schedule from the previous week for this week? This will overwrite existing shifts for these dates.")) return;
        
        for (let i = 0; i < 6; i++) {
            const targetStr = rowDays[i];
            const targetDate = new Date(targetStr);
            const srcDate = new Date(targetDate);
            srcDate.setDate(srcDate.getDate() - 7);
            const srcStr = srcDate.toISOString().split('T')[0];
            
            const srcData = schedule[srcStr];
            if (srcData) {
                const currentData = schedule[targetStr] || {};
                await setDoc(doc(db, 'schedule', targetStr), { ...currentData, ...srcData }, { merge: true });
            }
        }
        alert("Week schedule copied successfully!");
    };

    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const shiftMonth = (dir: number) => {
        const d = new Date(currentMonthDate);
        d.setMonth(d.getMonth() + dir);
        setCurrentMonthDate(d);
    };

    const groupedStaff = staff.reduce((acc, member) => {
        const d = member.department || 'Other';
        acc[d] = acc[d] || [];
        acc[d].push(member);
        return acc;
    }, {} as Record<string, StaffMember[]>);

    // Compute active weeks for monthly calendar view
    const calendarYear = currentMonthDate.getFullYear();
    const calendarMonth = currentMonthDate.getMonth();
    const calendarWeeks = useMemo(() => getMonthCalendarWeeks(calendarYear, calendarMonth), [calendarYear, calendarMonth]);
    const monthLabel = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Navigators */}
            <header className="bg-white/80 backdrop-blur-md border border-white/50 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-heading">
                        {viewMode === 'employee' ? 'Weekly Schedule' : 'Schedule Grid'}
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        {viewMode === 'employee' ? (
                            <>
                                <button onClick={() => shiftDate(-7)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronLeft size={22} className="text-slate-600" /></button>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-200/50">
                                    <Calendar size={18} className="text-emerald-600" />
                                    {formatWeekRange(selectedDate)}
                                </div>
                                <button onClick={() => shiftDate(7)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronRight size={22} className="text-slate-600" /></button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronLeft size={22} className="text-slate-600" /></button>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-200/50">
                                    <Calendar size={18} className="text-emerald-600" />
                                    {monthLabel}
                                </div>
                                <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronRight size={22} className="text-slate-600" /></button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* View Mode Toggle Switch */}
                    <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner no-print">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarDays size={14} /> Calendar Grid
                        </button>
                        <button
                            onClick={() => setViewMode('employee')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'employee' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={14} /> Employee View
                        </button>
                    </div>

                    {/* Print Button */}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-6 py-3 rounded-xl transition-all border border-slate-200 shadow-sm hover:shadow active:scale-[0.98] no-print"
                    >
                        <Printer size={18} /> Print
                    </button>

                    {/* Bulk Action Copy Button (Only Admin, Only Employee View) */}
                    {isAdmin && viewMode === 'employee' && (
                        <button onClick={copyLastWeek} className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-6 py-3 rounded-xl transition-all border border-emerald-100 shadow-sm hover:shadow-md active:scale-[0.98] no-print">
                            <Copy size={18} /> Copy Last Week
                        </button>
                    )}
                </div>
            </header>

            {/* ======================================================== */}
            {/* VIEW MODE: CALENDAR GRID                                 */}
            {/* ======================================================== */}
            {viewMode === 'calendar' && (
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/60 p-6 space-y-6">
                    {/* Department Filtering Tabs */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4 overflow-x-auto no-print">
                        {[
                            { id: 'all', label: 'All Staff' },
                            { id: 'rdh', label: 'RDH (Hygiene)' },
                            { id: 'assistants', label: 'Assistants' },
                            { id: 'front', label: 'Front Desk' },
                            { id: 'doctor', label: 'Doctors' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setCalendarTab(tab.id as any)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${calendarTab === tab.id ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Calendar grid container */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <div className="min-w-[900px] print:min-w-0 print:w-full bg-slate-50/50">
                            {/* Grid Days Header */}
                            <div className="grid grid-cols-[repeat(6,1fr)_100px] print:grid-cols-6 gap-[1px] bg-slate-200 border-b border-slate-200">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                    <div key={day} className="bg-slate-50 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                                <div className="bg-slate-50 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider print:hidden">
                                    Copy Week
                                </div>
                            </div>

                            {/* Calendar Rows */}
                            <div className="space-y-[1px] bg-slate-200">
                                {calendarWeeks.map((week, wIndex) => (
                                    <div key={wIndex} className="grid grid-cols-[repeat(6,1fr)_100px] print:grid-cols-6 gap-[1px]">
                                        {week.map(dayStr => {
                                            const d = new Date(dayStr);
                                            const isCurrMonth = d.getMonth() === calendarMonth;
                                            const isToday = dayStr === new Date().toISOString().split('T')[0];
                                            const dayData = schedule[dayStr] || {};
                                            const dayShifts = Object.entries(dayData).filter(([k, v]) => v && isShiftInTab(k, v, calendarTab, staff));

                                            return (
                                                <div
                                                    key={dayStr}
                                                    onClick={() => setSelectedDayForModal(dayStr)}
                                                    className={`min-h-[160px] bg-white p-3.5 flex flex-col gap-2 cursor-pointer transition-colors relative hover:bg-slate-50/70 select-none group/cell ${!isCurrMonth ? 'opacity-40' : ''}`}
                                                >
                                                    {/* Day number */}
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`text-sm font-bold tracking-tight ${isToday ? 'w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow' : 'text-slate-700'}`}>
                                                            {d.getDate()}
                                                        </span>
                                                        {!isCurrMonth && (
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                                                {d.toLocaleDateString('en-US', { month: 'short' })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* List of Shifts */}
                                                    <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto max-h-[110px]">
                                                        {dayShifts.map(([key, val]) => {
                                                            const isNeed = key.startsWith('need_') || val.toLowerCase().startsWith('need');
                                                            if (isNeed) {
                                                                return (
                                                                    <div
                                                                        key={key}
                                                                        className="relative group/shift flex items-center justify-between text-[10px] font-black tracking-tight text-white bg-red-500 border border-red-600 rounded-lg py-1 px-2 shadow-sm transition-all hover:bg-red-600"
                                                                    >
                                                                        <span className="uppercase">{val}</span>
                                                                        {isAdmin && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteShift(dayStr, key);
                                                                                }}
                                                                                className="opacity-0 group-hover/shift:opacity-100 p-0.5 hover:bg-red-800 rounded transition-opacity print:hidden"
                                                                                title="Delete slot"
                                                                            >
                                                                                <Trash2 size={10} className="text-white" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            } else {
                                                                const member = staff.find(s => s.id === key);
                                                                if (!member) return null;
                                                                return (
                                                                    <div
                                                                        key={key}
                                                                        className="relative group/shift flex items-center justify-between text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200/50 rounded-lg py-1 px-2 shadow-sm transition-all hover:border-emerald-200 hover:bg-white"
                                                                    >
                                                                        <div className="flex flex-col leading-tight">
                                                                            <span className="font-bold text-slate-800 text-[10px] truncate max-w-[90px]">{member.name}</span>
                                                                            <span className="text-[9px] text-slate-500 font-medium">
                                                                                {getShortRole(member.role)} {formatShiftTimeShorthand(val)}
                                                                            </span>
                                                                        </div>
                                                                        {isAdmin && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteShift(dayStr, key);
                                                                                }}
                                                                                className="opacity-0 group-hover/shift:opacity-100 p-0.5 text-slate-400 hover:text-red-500 rounded transition-opacity print:hidden"
                                                                                title="Delete shift"
                                                                            >
                                                                                <Trash2 size={10} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                        })}
                                                    </div>

                                                    {/* Hover inline edit indicator */}
                                                    {isAdmin && (
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover/cell:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg shadow-sm border border-emerald-200 print:hidden">
                                                            <Plus size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {/* Copy Previous Week button */}
                                        <div className="bg-white flex items-center justify-center border-l border-slate-100 min-h-[160px] print:hidden">
                                            {isAdmin ? (
                                                <button
                                                    onClick={() => copyWeekRow(week)}
                                                    className="p-3 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded-xl transition-all shadow-sm active:scale-95 flex flex-col items-center gap-1"
                                                    title="Copy schedule from previous week for this row"
                                                >
                                                    <Copy size={16} />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">Copy</span>
                                                </button>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE: EMPLOYEE VIEW                                 */}
            {/* ======================================================== */}
            {viewMode === 'employee' && (
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/60 overflow-hidden p-2">
                    <div className="overflow-x-auto pb-4">
                        <div className="min-w-[1200px] p-6">
                            
                            {/* Grid Header Labels */}
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

                            {/* Grid Department Rows */}
                            <div className="space-y-8">
                                {Object.entries(groupedStaff).map(([dept, members]) => (
                                    <div key={dept}>
                                        <div className="flex items-center gap-3 mb-4 px-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dept}</span>
                                        </div>

                                        {members.map((member) => {
                                            let totalSched = 0;
                                            weekDays.forEach(day => {
                                                const dbVal = schedule[day]?.[member.id] || '';
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
                                                    
                                                    {weekDays.map((day) => (
                                                        <ScheduleCell
                                                            key={day}
                                                            date={day}
                                                            memberId={member.id}
                                                            schedule={schedule}
                                                            onUpdate={handleUpdate}
                                                        />
                                                    ))}
                                                    
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
            )}

            {/* ======================================================== */}
            {/* DIALOG/MODAL: SHIFT DETAIL MANAGER                       */}
            {/* ======================================================== */}
            {selectedDayForModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 font-heading">
                                    {isAdmin ? 'Manage Shifts' : 'Day Shifts'}
                                </h3>
                                <p className="text-slate-500 text-xs mt-1 font-semibold">
                                    {new Date(selectedDayForModal + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedDayForModal(null);
                                    setSelectedStaffId('');
                                }}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            {/* Current Shifts list */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Shifts</h4>
                                <div className="space-y-2">
                                    {Object.entries(schedule[selectedDayForModal] || {}).filter(([_, v]) => v).map(([key, val]) => {
                                        const isNeed = key.startsWith('need_') || val.toLowerCase().startsWith('need');
                                        if (isNeed) {
                                            return (
                                                <div key={key} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-xl">
                                                    <span className="text-xs font-black tracking-tight text-red-600 uppercase">{val}</span>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleDeleteShift(selectedDayForModal, key)}
                                                            className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        } else {
                                            const member = staff.find(s => s.id === key);
                                            if (!member) return null;
                                            return (
                                                <div key={key} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{member.name}</div>
                                                        <div className="text-xs text-slate-500 font-medium">
                                                            {member.role} ({val})
                                                        </div>
                                                    </div>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleDeleteShift(selectedDayForModal, key)}
                                                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }
                                    })}
                                    {Object.keys(schedule[selectedDayForModal] || {}).filter(k => schedule[selectedDayForModal][k]).length === 0 && (
                                        <div className="text-slate-400 text-xs italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            No shifts scheduled for this day.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add New Shift Section (Admin Only) */}
                            {isAdmin && (
                                <div className="border-t border-slate-100 pt-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Add Shift</h4>
                                    
                                    {/* Type Toggle */}
                                    <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setNewShiftType('employee')}
                                            className={`flex-1 py-2 text-center rounded-lg transition-all ${newShiftType === 'employee' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Staff Shift
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewShiftType('need')}
                                            className={`flex-1 py-2 text-center rounded-lg transition-all ${newShiftType === 'need' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Vacant Slot (Need)
                                        </button>
                                    </div>

                                    <form onSubmit={handleAddShift} className="space-y-4">
                                        {newShiftType === 'employee' ? (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Staff</label>
                                                    <select
                                                        required
                                                        value={selectedStaffId}
                                                        onChange={(e) => setSelectedStaffId(e.target.value)}
                                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer text-sm"
                                                    >
                                                        <option value="" disabled>Choose Employee</option>
                                                        {staff
                                                            // Filter out staff members already scheduled on this day
                                                            .filter(s => !(schedule[selectedDayForModal] || {})[s.id])
                                                            .map(s => (
                                                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Time</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. 9a"
                                                            value={shiftStart}
                                                            onChange={(e) => setShiftStart(e.target.value)}
                                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Time</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. 5p"
                                                            value={shiftEnd}
                                                            onChange={(e) => setShiftEnd(e.target.value)}
                                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role/Label</label>
                                                        <select
                                                            value={vacantRole}
                                                            onChange={(e) => setVacantRole(e.target.value)}
                                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer text-sm"
                                                        >
                                                            <option value="RDH">RDH</option>
                                                            <option value="Assistant">Assistant</option>
                                                            <option value="Front Desk">Front Desk</option>
                                                            <option value="Doctor">Doctor</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time Range</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. 4-8p"
                                                            value={vacantTime}
                                                            onChange={(e) => setVacantTime(e.target.value)}
                                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        <button
                                            type="submit"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5"
                                        >
                                            <Plus size={18} /> Add Shift to Schedule
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

