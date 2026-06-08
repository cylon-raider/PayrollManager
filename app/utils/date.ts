
/**
 * Date Manipulation & Formatting Utilities
 * 
 * Provides math helpers to construct date arrays matching calendar weeks and months,
 * as well as custom formatters for clean UX labels.
 */

/**
 * Generates an array of "YYYY-MM-DD" string dates for the week containing `dateStr`.
 * The week boundary is adjusted to start on Sunday.
 * 
 * @param dateStr - Anchor date string (e.g. "2026-06-08")
 * @returns Array of 7 date strings (Sunday through Saturday)
 */
export const getWeekDays = (dateStr: string) => {
    const curr = new Date(dateStr);
    const week = [];
    
    // Shift current date back to the nearest preceding Sunday (Sunday is 0 in JS Date)
    curr.setDate(curr.getDate() - curr.getDay());
    
    // Compile the 7 weekdays chronologically
    for (let i = 0; i < 7; i++) {
        week.push(new Date(curr).toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    return week;
};

/**
 * Generates an array of string dates from the first day of the month containing
 * `dateStr` up to `dateStr` itself. Used for monthly payroll calculations.
 * 
 * @param dateStr - Target date string
 */
export const getMonthDays = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    
    const firstDay = new Date(year, month, 1); // 1st of the month
    const targetDate = new Date(dateStr);

    // Loop from the 1st of the month up to the target anchor date
    for (let d = new Date(firstDay); d <= targetDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toISOString().split('T')[0]);
    }
    return days;
};

/**
 * Standard Date Formatter.
 * Converts "YYYY-MM-DD" dates to readable format (defaults to MM/DD/YY).
 */
export const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
    return new Date(dateStr).toLocaleDateString('en-US', options || { month: 'numeric', day: 'numeric', year: '2-digit' });
};

/**
 * Constructs a week range string label (e.g. "6/7/26 - 6/13/26").
 */
export const formatWeekRange = (dateStr: string) => {
    const week = getWeekDays(dateStr);
    const start = formatDate(week[0]);
    const end = formatDate(week[6]);
    return `${start} - ${end}`;
};
