/**
 * Manage Team Route Component
 * 
 * Provides administrative controls and general directory for practice staff members.
 * Supports:
 * - Tabbed navigation split: Staff Directory list & User Access control.
 * - Full CRUD capability on clinic staff profiles (Admins only).
 * - System access management: Admins can promote/demote logins (Viewer vs Admin) with self-demotion blocks.
 * - Live document synchronization via Firestore streams.
 */

import { useState, useEffect } from "react";
import { onSnapshot, setDoc, doc, deleteDoc, updateDoc, collection } from "firebase/firestore";
import { Plus, Pencil, Trash2, X, Briefcase, User, ChevronRight, Shield, BadgeCheck, Lock } from "lucide-react";
import { collections } from "../services/firestore";
import { db } from "../services/firebase";
import { DEPARTMENTS, JOB_ROLES, OWNER_EMAIL, type Department } from "../utils/constants";
import type { StaffMember } from "../services/firestore";
import { formatCurrency } from "../utils/calculations";
import { useAuth, type UserRole } from "../context/AuthContext";

interface AppUserData {
    uid: string;
    email: string;
    role: UserRole;
    displayName?: string;
}

export default function TeamPage() {
    const { isAdmin, user: currentUser } = useAuth();
    
    // Tab toggling state: 'staff' (employee directory) vs 'access' (system login permissions)
    const [activeTab, setActiveTab] = useState<'staff' | 'access'>('staff');

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [appUsers, setAppUsers] = useState<AppUserData[]>([]);

    // ==========================================
    // --- Real-Time Sync Subscriptions ---
    // ==========================================
    useEffect(() => {
        // Staff collection observer, sorted alphabetically by employee name
        const unsubStaff = onSnapshot(collections.staff, (snapshot) => {
            const loadedStaff = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as StaffMember[];
            setStaff(loadedStaff.sort((a, b) => a.name.localeCompare(b.name)));
        }, (error) => {
            console.error("Error fetching staff:", error);
        });

        // App access user records observer:
        // Only queries the database if the active user session is an Admin.
        let unsubUsers = () => { };
        if (isAdmin) {
            unsubUsers = onSnapshot(collection(db, "users"), (s) => {
                setAppUsers(s.docs.map(d => {
                    const data = d.data();
                    return {
                        ...data,
                        uid: data.uid || d.id, // Resolve document identifiers
                        email: data.email || "No Email"
                    } as AppUserData;
                }));
            });
        }

        // Unmount teardown
        return () => { unsubStaff(); unsubUsers(); };
    }, [isAdmin]);

    // ==========================================
    // --- Staff Management CRUD Actions ---
    // ==========================================
    const [isEditing, setIsEditing] = useState<StaffMember | null>(null);
    const [name, setName] = useState("");
    const [dept, setDept] = useState<Department>("General");
    const [role, setRole] = useState("");
    const [rate, setRate] = useState("");

    /**
     * Handles both Insertions and Updates of Staff records.
     */
    const handleSaveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const memberData = {
            name,
            department: dept,
            role,
            rate: parseFloat(rate) || 0,
        };

        try {
            if (isEditing) {
                // UPDATE: overwrite specific document properties
                await updateDoc(doc(db, "staff", isEditing.id), memberData);
            } else {
                // INSERT: create a new document with unique timestamp string ID
                await setDoc(doc(db, "staff", Date.now().toString()), memberData);
            }
            resetForm();
        } catch (err) {
            console.error("Error saving staff:", err);
            alert("Failed to save.");
        }
    };

    /**
     * Deletes a staff member document from Firestore.
     */
    const handleDeleteStaff = async (id: string) => {
        if (confirm("Remove this staff member?")) {
            await deleteDoc(doc(db, "staff", id));
        }
    };

    const resetForm = () => {
        setIsEditing(null);
        setName("");
        setDept("General");
        setRole("");
        setRate("");
    };

    // Fills input forms with clicked staff details to prepare updates
    const startEdit = (member: StaffMember) => {
        setIsEditing(member);
        setName(member.name);
        setDept(member.department as Department);
        setRole(member.role);
        setRate(member.rate.toString());
        // Smooth scroll to top of page to make form visible on small screens
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ==========================================
    // --- Authorization / Access Controls ---
    // ==========================================

    /**
     * Toggles users access roles in Firestore between Admin and Viewer.
     * Prevents self-demotion safety violations.
     */
    const toggleAdmin = async (targetUid: string, currentRole: UserRole) => {
        // Self-Demotion Block: Protect active user from lockouts
        if (targetUid === currentUser?.uid) return;
        const newRole = currentRole === 'admin' ? 'viewer' : 'admin';
        await updateDoc(doc(db, "users", targetUid), { role: newRole });
    };

    // Group staff list dynamically by department names
    const groupedStaff = staff.reduce((acc, member) => {
        const d = member.department || 'Other';
        acc[d] = acc[d] || [];
        acc[d].push(member);
        return acc;
    }, {} as Record<string, StaffMember[]>);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Tabs */}
            <header className="bg-white/80 backdrop-blur-md border border-white/50 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-heading">Manage Team</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Directory and Access Control
                    </p>
                </div>
                {/* Render Tab switches if user is Admin. Viewers are locked to Staff directory */}
                {isAdmin && (
                    <div className="bg-slate-100/50 p-1.5 rounded-2xl flex border border-slate-200/50">
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'staff' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                            Staff List
                        </button>
                        <button
                            onClick={() => setActiveTab('access')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'access' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                            <Shield size={16} /> App Access
                        </button>
                    </div>
                )}
            </header>

            {/* ======================================================== */}
            {/* TAB: STAFF LIST DIRECTORY                                */}
            {/* ======================================================== */}
            {activeTab === 'staff' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add / Edit Form Panel - Enforced: Rendered only for Admins */}
                    {isAdmin && (
                        <div className="lg:col-span-1">
                            <form onSubmit={handleSaveStaff} className="bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white/50 space-y-6 sticky top-6">
                                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-4 text-lg font-heading">
                                    {isEditing ? "Edit Member" : "Add New Member"}
                                </h3>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 pl-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400" placeholder="Full Name" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                                    <div className="relative group">
                                        <Briefcase className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <select value={dept} onChange={e => setDept(e.target.value as Department)} className="w-full p-3 pl-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none transition-all font-medium text-slate-800 cursor-pointer">
                                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-4 text-slate-400 rotate-90 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                                    <div className="relative">
                                        <select value={role} onChange={e => setRole(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none transition-all font-medium text-slate-800 cursor-pointer">
                                            <option value="" disabled>Select Role</option>
                                            {Object.entries(JOB_ROLES).map(([cat, roles]) => (
                                                <optgroup key={cat} label={cat}>{roles.map(r => <option key={r} value={r}>{r}</option>)}</optgroup>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-4 text-slate-400 rotate-90 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hourly Rate</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold group-focus-within:text-emerald-500 transition-colors">$</span>
                                        <input type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} required className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-800 placeholder-slate-300" placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    {isEditing && <button type="button" onClick={resetForm} className="w-1/3 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors"><X size={20} className="mx-auto" /></button>}
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {isEditing ? "Update Staff" : <><Plus size={20} /> Add Member</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Directory Listings panel */}
                    <div className={isAdmin ? "lg:col-span-2 space-y-8" : "lg:col-span-3 space-y-8"}>
                        {Object.entries(groupedStaff).map(([groupName, members]) => (
                            <div key={groupName} className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/60 overflow-hidden">
                                <div className="bg-slate-50/80 px-8 py-4 border-b border-slate-100 flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{groupName}</span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {members.map(member => (
                                        <div key={member.id} className="p-6 flex items-center justify-between hover:bg-white transition-colors group">
                                            <div>
                                                <div className="font-bold text-slate-800 text-lg mb-1">{member.name}</div>
                                                <div className="text-sm text-slate-500 flex items-center gap-3">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">{member.role}</span>
                                                    {/* Rate details are strictly guarded. Visible only to Admins. */}
                                                    {isAdmin && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-xs">
                                                                {formatCurrency(member.rate)}/hr
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Action triggers: rendering edit/delete options solely for Admins */}
                                            {isAdmin && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                    <button onClick={() => startEdit(member)} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><Pencil size={18} /></button>
                                                    <button onClick={() => handleDeleteStaff(member.id)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB: SYSTEM USER ACCESS ROLES CONTROL                    */}
            {/* ======================================================== */}
            {activeTab === 'access' && isAdmin && (
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/60 overflow-hidden max-w-4xl mx-auto">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100/50">
                        <h3 className="font-bold text-blue-900 flex items-center gap-3 text-lg">
                            <Shield size={22} className="text-blue-500" /> System Users
                        </h3>
                        <p className="text-blue-700/60 text-sm mt-1 ml-9">Manage who can login and access financial data.</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {appUsers.map(u => (
                            <div key={u.uid} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-md ${u.role === 'admin' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-slate-300'}`}>
                                        {u.email?.[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg font-heading">{u.email}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                            <span className="font-mono bg-slate-100 px-1.5 rounded">{u.uid.slice(0, 8)}...</span>
                                            {u.uid === currentUser?.uid && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">YOU</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className={`text-xs font-bold px-4 py-1.5 rounded-full border ${u.role === 'admin' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                        {u.role.toUpperCase()}
                                    </div>

                                    {/* Action Toggles with Safety Blocks (can't demote yourself, or demote Owner email) */}
                                    {u.uid !== currentUser?.uid && u.email !== OWNER_EMAIL && (
                                        <button
                                            onClick={() => toggleAdmin(u.uid, u.role)}
                                            className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {u.role === 'admin' ? 'Demote to Viewer' : 'Promote to Admin'}
                                        </button>
                                    )}
                                    {u.uid === currentUser?.uid && (
                                        <div className="text-slate-300 p-2"><Lock size={20} /></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

