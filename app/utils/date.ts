
export const getWeekDays = (dateStr: string) => {
    const curr = new Date(dateStr);
    const week = [];
    // Adjust to start of week (Sunday)
    curr.setDate(curr.getDate() - curr.getDay());
    for (let i = 0; i < 7; i++) {
        week.push(new Date(curr).toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    return week;
};

export const getMonthDays = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const firstDay = new Date(year, month, 1);
    // Calculate up to "today" or end of month? snippet said "to targetDate" (selectedDate)
    // But usually monthly payroll implies the whole month so far?
    // Let's stick to snippet logic: from 1st to selectedDate
    const targetDate = new Date(dateStr);

    for (let d = new Date(firstDay); d <= targetDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toISOString().split('T')[0]);
    }
    return days;
};

export const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
    return new Date(dateStr).toLocaleDateString('en-US', options || { month: 'numeric', day: 'numeric', year: '2-digit' });
};

export const formatWeekRange = (dateStr: string) => {
    const week = getWeekDays(dateStr);
    const start = formatDate(week[0]);
    const end = formatDate(week[6]);
    return `${start} - ${end}`;
};
