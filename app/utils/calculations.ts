
/**
 * Calculations & Business Logic Utilities
 * 
 * Provides centralized mathematical formulas and formatting utilities for:
 * - Time conversion: Parsing time strings to calculate total decimal hours.
 * - Input heuristics: Intelligent formatting of shorthand user time inputs.
 * - Business formulas: Labor overhead cost (with tax loadings), target production thresholds, and EBITDA calculations.
 */

// ==========================================
// --- Constants & Target Overheads ---
// ==========================================

// Employer Payroll Tax Multiplier:
// Enforces a 1.17 multiplier (representing a 17% overhead load to account for 
// employer-paid FICA, FUTA, SUTA, workers' comp, and employee benefits).
export const PAYROLL_TAX_RATE = 1.17;
export const STAFF_OVERHEAD_TARGET = 0.25; // 25% target staff labor overhead
export const DR_OVERHEAD_TARGET = 0.28;    // 28% target doctor labor overhead

// ==========================================
// --- Time Parsing & Formatting Math ---
// ==========================================

/**
 * Calculates total decimal hours between a start time and end time.
 * Supports overnight shifts and standard AM/PM formats.
 * 
 * @param start - Start time string (e.g. "9:00 AM")
 * @param end - End time string (e.g. "5:00 PM")
 * @returns Total decimal hours (e.g., 8.5)
 */
export const calculateHoursFromTimes = (start?: string, end?: string): number => {
    if (!start || !end) return 0;

    // Parses string structures to JS Dates
    const parseTime = (timeStr: string) => {
        const cleanStr = timeStr.trim();
        const modifierMatch = cleanStr.match(/[ap]m/i);
        const modifier = modifierMatch ? modifierMatch[0].toUpperCase() : null;

        let timePart = cleanStr.replace(/[ap]m/i, '').trim();
        let [hours, minutes] = timePart.split(':').map(Number);

        if (isNaN(hours)) return new Date(0, 0, 0, 0, 0);
        if (isNaN(minutes)) minutes = 0;

        // Convert 12-hour format to 24-hour military format
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;

        return new Date(0, 0, 0, hours, minutes);
    };

    const startDate = parseTime(start);
    const endDate = parseTime(end);

    // Overnight shift correction:
    // If end date is chronologically before start date, assume it rolls into the next day.
    if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHrs = diffMs / 1000 / 60 / 60; // Milliseconds -> Hours

    return Math.max(0, parseFloat(diffHrs.toFixed(2)));
};

/**
 * Intelligent Time Input Formatter
 * 
 * Standardizes shorthand user inputs into standard "HH:MM AM/PM" strings.
 * Examples:
 * - "9" -> "9:00 AM"
 * - "5p" -> "5:00 PM"
 * - "830" -> "8:30 AM"
 * - "12" -> "12:00 PM"
 * 
 * @param val - Raw input text
 * @param isEnd - True if formatting a shift end time, changes AM/PM heuristics
 */
export const formatSmartTime = (val: string, isEnd = false): string => {
    if (!val) return '';
    // Strip everything except digits, colon, 'a' (AM), and 'p' (PM)
    let clean = val.toLowerCase().replace(/[^0-9ap:]/g, '');
    if (!clean) return '';

    let isPM = clean.includes('p');
    let isAM = clean.includes('a');
    let numericPart = clean.replace(/[ap]/g, '');

    // Inject colons if user entered shorthand numbers (e.g. "830" -> "8:30")
    if (!numericPart.includes(':')) {
        if (numericPart.length === 3) {
            numericPart = numericPart[0] + ':' + numericPart.slice(1);
        } else if (numericPart.length === 4) {
            numericPart = numericPart.slice(0, 2) + ':' + numericPart.slice(2);
        } else if (numericPart.length <= 2) {
            numericPart = numericPart + ':00'; // Default to top of the hour
        }
    }

    let [hStr, mStr] = numericPart.split(':');
    let h = parseInt(hStr, 10);
    let m = mStr ? parseInt(mStr, 10) : 0;

    if (isNaN(h)) return val;

    // AM/PM Heuristic Engine:
    // If the user did not specify AM/PM, dynamically infer it based on standard clinical shifts
    if (!isPM && !isAM) {
        if (isEnd && h >= 1 && h <= 11) {
            // End times between 1:00 and 11:00 default to PM (e.g., shifts ending at 5:00 PM)
            isPM = true;
        } else if (!isEnd && h >= 1 && h <= 6) {
            // Start times between 1:00 and 6:00 default to PM (e.g., afternoon half-shifts starting at 1:00 PM)
            isPM = true;
        } else if (h === 12) {
            // 12 defaults to noon PM
            isPM = true;
        } else {
            // All other hours default to AM
            isAM = true;
        }
    }

    const suffix = isPM ? 'PM' : 'AM';
    const mDisplay = m.toString().padStart(2, '0');

    return `${h}:${mDisplay} ${suffix}`;
};

/**
 * Localizes number values to USD currency strings.
 */
export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// ==========================================
// --- Business Overhead Logic Formulas ---
// ==========================================

/**
 * Computes the fully loaded cost of employee shifts, including employer taxes/benefits load.
 */
export const calculateStaffCost = (hours: number, rate: number) => {
    return hours * rate * PAYROLL_TAX_RATE;
};

/**
 * Calculates the required clinical production/revenue needed to balance a labor cost
 * at a specific target percentage.
 * Formula: Cost / Target Overhead Percentage
 */
export const calculateProductionNeeded = (cost: number, targetPercentage: number) => {
    if (targetPercentage === 0) return 0;
    return cost / targetPercentage;
};

/**
 * Calculates EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization).
 * EBITDA = Collections Revenue - Payroll expenses.
 */
export const calculateProjectedEBITDA = (collections: number, expenses: number) => {
    return collections - expenses;
};
