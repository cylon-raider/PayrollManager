
/**
 * Application Constants & Business Target Registries
 * 
 * Declares system configurations, organization structures, role dictionaries,
 * and key operational metric targets.
 */

// Active Practice Departments
export const DEPARTMENTS = [
    'General',
    'Oral Surgery',
    'Ortho',
    'Front Desk',
    'Dr'
] as const;

export type Department = typeof DEPARTMENTS[number];

// Job Roles structured by category groupings
export const JOB_ROLES = {
    'Front Desk': [
        'Concierge',
        'Receptionist',
        'Scheduler',
        'Supervisor',
        'General',
        'Treatment Coordinator'
    ],
    'Hygiene': [
        'Hygiene Assistant',
        'Hygienist'
    ],
    'Assistants': [
        'Assistant',
        'OS Assistant',
        'Ortho Tech',
        'Sterilization Tech',
        'Float',
        'EFDA',
        'Supervisor',
        'Treatment Coordinator'
    ],
    'Doctor': [
        'Doctor',
        'Associate Doctor',
        'Partner'
    ]
} as const;

// Flattened list for directory role selection validation
export const ALL_ROLES = Object.values(JOB_ROLES).flat();

// Operating Financial Targets
export const TARGETS = {
    STAFF_OVERHEAD: 0.25,  // Staff costs target limit (25%)
    DOCTOR_OVERHEAD: 0.28, // Doctor costs target limit (28%)
    CLINIC_HOURS: 59       // Standard scheduled clinic operating hours
};

// Global System Owner Override:
// Users with this email cannot be demoted or have their permissions modified
// in the App Access admin dashboard.
export const OWNER_EMAIL = "cmarkel@gmail.com";
