
export const DEPARTMENTS = [
    'General',
    'Oral Surgery',
    'Ortho',
    'Front Desk',
    'Dr'
] as const;

export type Department = typeof DEPARTMENTS[number];

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

// Flattened list for validation if needed
export const ALL_ROLES = Object.values(JOB_ROLES).flat();

export const TARGETS = {
    STAFF_OVERHEAD: 0.25,
    DOCTOR_OVERHEAD: 0.28,
    CLINIC_HOURS: 59
};

export const OWNER_EMAIL = "cmarkel@gmail.com";
