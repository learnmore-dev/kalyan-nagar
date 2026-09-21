import { Holiday } from './types';

// ─── 2026 Optional Holiday List (Default 5 Curated) ───
export const OPTIONAL_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-14', name: 'Makar Sankranti', type: 'optional' },
  { date: '2026-03-04', name: 'Holi Festival', type: 'optional' },
  { date: '2026-08-28', name: 'Raksha Bandhan', type: 'optional' },
  { date: '2026-10-12', name: 'Diwali Deepawali', type: 'optional' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'optional' },
];

// ─── 2026 Mandatory Holiday List (5 Configured) ───
export const MANDATORY_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-26', name: 'Republic Day', type: 'mandatory' },
  { date: '2026-05-01', name: 'Labour Day', type: 'mandatory' },
  { date: '2026-08-15', name: 'Independence Day', type: 'mandatory' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'mandatory' },
  { date: '2026-11-01', name: 'Karnataka Rajyotsava', type: 'mandatory' },
];

export const OPTIONAL_HOLIDAY_LIMIT_PER_YEAR = 5;
export const MANDATORY_HOLIDAY_LIMIT_PER_YEAR = 5;
export const CASUAL_SICK_LEAVE_ANNUAL_QUOTA = 12;
export const CASUAL_LEAVE_LIMIT_PER_MONTH = 1;

/**
 * Checks if a given date string (YYYY-MM-DD) is a week-off according to the configured rule
 */
export function isDateWeekOff(
  dateStr: string,
  pattern: 'sunday' | 'sat_sun' | 'alternate_sat_sun' = 'sunday'
): boolean {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday

  if (day === 0) return true; // Sunday is always off

  if (pattern === 'sat_sun' && day === 6) return true;

  if (pattern === 'alternate_sat_sun' && day === 6) {
    // 2nd and 4th Saturday of the month
    const dateNum = d.getDate();
    const satIndex = Math.ceil(dateNum / 7);
    return satIndex === 2 || satIndex === 4;
  }

  return false;
}

/**
 * Checks if a date falls on a mandatory or approved optional holiday
 */
export function isDateHoliday(
  dateStr: string,
  holidays: Holiday[] = []
): Holiday | undefined {
  if (!Array.isArray(holidays)) return undefined;
  return holidays.find((h) => h && h.date === dateStr);
}

/**
 * Computes monthly working days, week-offs, and holidays
 */
export function calculateMonthlyWorkingDays(
  year: number,
  month: number, // 1 - 12
  mandatoryHolidays: Holiday[] = MANDATORY_HOLIDAYS_2026,
  weekOffPattern: 'sunday' | 'sat_sun' | 'alternate_sat_sun' = 'sunday'
) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekOffCount = 0;
  let mandatoryHolidayCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isDateWeekOff(dayStr, weekOffPattern)) {
      weekOffCount++;
    } else if (mandatoryHolidays.some((h) => h.date === dayStr)) {
      mandatoryHolidayCount++;
    }
  }

  const netWorkingDays = daysInMonth - weekOffCount - mandatoryHolidayCount;

  return {
    totalDays: daysInMonth,
    weekOffDays: weekOffCount,
    mandatoryHolidayDays: mandatoryHolidayCount,
    netWorkingDays,
  };
}
