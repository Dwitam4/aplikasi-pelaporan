// Date formatting and calendar helper utilities for Indonesian locale

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export const INDONESIAN_DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Format a Date object into Indonesian formal format: "Kamis, 27 Agustus 2026"
 */
export function formatIndonesianDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    d = parseIndonesianDate(date);
  } else if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = new Date(date as any);
  }

  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';
  const dayName = INDONESIAN_DAYS[d.getDay()];
  const day = d.getDate();
  const monthName = INDONESIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Format a Date object into ISO format "YYYY-MM-DD" for HTML date inputs
 */
export function toIsoDateString(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    d = parseIndonesianDate(date);
  } else if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = new Date(date as any);
  }

  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

/**
 * Parse any date representation (ISO YYYY-MM-DD, standard string, or Indonesian text) into a valid Date object
 */
export function parseIndonesianDate(value: string | Date | number | undefined | null): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    return !isNaN(value.getTime()) ? value : new Date();
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return !isNaN(d.getTime()) ? d : new Date();
  }
  if (typeof value !== 'string') return new Date();

  const trimmed = value.trim();
  if (!trimmed) return new Date();

  // Try standard Date.parse (works for ISO YYYY-MM-DD or standard RFC)
  const standardDate = new Date(trimmed);
  if (!isNaN(standardDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return standardDate;
  }

  // Check for Indonesian month name
  for (let i = 0; i < INDONESIAN_MONTHS.length; i++) {
    const monthName = INDONESIAN_MONTHS[i];
    if (new RegExp(monthName, 'i').test(trimmed)) {
      // Extract numbers: day and year
      const numbers = trimmed.match(/\d+/g);
      if (numbers && numbers.length >= 1) {
        const day = parseInt(numbers[0], 10);
        const year = numbers.length >= 2 ? parseInt(numbers[1], 10) : new Date().getFullYear();
        const candidate = new Date(year, i, day);
        if (!isNaN(candidate.getTime())) {
          return candidate;
        }
      }
    }
  }

  // Try parsing DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10);
    const m = parseInt(ddmmyyyy[2], 10) - 1;
    let y = parseInt(ddmmyyyy[3], 10);
    if (y < 100) y += 2000;
    const candidate = new Date(y, m, d);
    if (!isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  // Fallback to today if unparseable
  return !isNaN(standardDate.getTime()) ? standardDate : new Date();
}

/**
 * Generate calendar matrix for given year and month (0-indexed)
 */
export function getCalendarMonthMatrix(year: number, month: number): Array<{
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
}> {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const daysInMonth = lastDayOfMonth.getDate();

  const today = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const matrix: Array<{
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    dayNumber: number;
  }> = [];

  // Days from previous month to fill the first row
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    matrix.push({
      date: d,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      dayNumber: d.getDate(),
    });
  }

  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    matrix.push({
      date: d,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      dayNumber: day,
    });
  }

  // Days from next month to complete 35 or 42 grid cells
  const remaining = (7 - (matrix.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day);
    matrix.push({
      date: d,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      dayNumber: day,
    });
  }

  return matrix;
}
