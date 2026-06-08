/**
 * Cloud Firestore Database Service & Types
 * 
 * Defines the TypeScript data models (entities) stored in Cloud Firestore collections.
 * Establishes strongly-typed collection references using a custom generic builder.
 * Enforces schema compliance at compile time across the codebase.
 */

import { collection, type CollectionReference, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';

// ==========================================
// --- Type Definitions / Database Schema ---
// ==========================================

/**
 * Represents a clinic staff member profile.
 */
export interface StaffMember {
    id: string;          // Firestore Document ID
    name: string;        // Employee Full Name
    role: string;        // Specific Job Role (matching constants.ts)
    department: string;  // Active Department (e.g. 'General', 'Oral Surgery', 'Dr')
    rate: number;        // Hourly billing/wage rate in USD
}

/**
 * Represents the schedule entries for a specific day document.
 * The document ID is a date string in "YYYY-MM-DD" format.
 */
export interface DaySchedule {
    // Key: Staff member ID string
    // Value: Shift range (e.g. "9:00 AM-5:00 PM") or empty string
    [staffId: string]: string;
}

/**
 * Represents daily clinical logging data (collections, actual hours).
 * The document ID is a date string in "YYYY-MM-DD" format.
 */
export interface DailyLog {
    // Key: Represents 'collections' (total revenue made on that day)
    // Also captures actual start/end details (e.g. "${staffId}_start", "${staffId}_end")
    [key: string]: string | number | undefined;
}

// ==========================================
// --- Typed Firestore Collection Helpers ---
// ==========================================

/**
 * Generic Helper to instantiate a type-safe collection reference.
 * Prevents accidentally saving wrong data schemas or querying fields that do not exist.
 * 
 * @template T - The schema interface (extends DocumentData implicitly)
 * @param collectionName - The path name of the Firestore collection
 * @returns A typed collection reference handler
 */
const createCollection = <T = DocumentData>(collectionName: string) => {
    return collection(db, collectionName) as CollectionReference<T>;
};

/**
 * Centralized Collections Registry
 * Components import this object to execute real-time operations or compile queries.
 */
export const collections = {
    // Staff employee directory details
    staff: createCollection<StaffMember>('staff'),
    // Planned scheduling shifts
    schedule: createCollection<DaySchedule>('schedule'),
    // Historical actual logs and financial collections
    dailyLogs: createCollection<DailyLog>('daily_logs'),
};
