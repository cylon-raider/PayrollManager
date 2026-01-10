import { collection, type CollectionReference, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';

// --- Types ---

export interface StaffMember {
    id: string;
    name: string;
    role: string;
    department: string;
    rate: number;
}

export interface DaySchedule {
    // Key is staffId, Value is "HH:MM AM-HH:MM PM" string
    [staffId: string]: string;
}

export interface DailyLog {
    // Key is staffId, Value is total hours (number)
    // Also stores start/end times as `${staffId}_start` and `${staffId}_end`
    [key: string]: string | number | undefined;
}

// --- Collections ---

// Helper to create a typesafe collection reference
const createCollection = <T = DocumentData>(collectionName: string) => {
    return collection(db, collectionName) as CollectionReference<T>;
};

export const collections = {
    staff: createCollection<StaffMember>('staff'),
    schedule: createCollection<DaySchedule>('schedule'),
    dailyLogs: createCollection<DailyLog>('daily_logs'), // Changed from camelCase to snake_case for collection name convention if preferred, but keeping logs simple
};
