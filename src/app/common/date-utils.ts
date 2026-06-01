import {MongoDate} from "./model/school.model";

/** DepEd school-year rollover uses Philippines civil date (UTC+8). */
export const PHILIPPINES_TIME_ZONE = 'Asia/Manila';

function getYearMonthInTimeZone(
  now: Date,
  timeZone: string = PHILIPPINES_TIME_ZONE,
): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? '0'),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? '1'),
  };
}

/** School years run June 1 (startYear) through May 31 (endYear). */
export function getSchoolYear(
  offset: number = 0,
  now: Date = new Date(),
  timeZone: string = PHILIPPINES_TIME_ZONE,
): string {
  const { year, month } = getYearMonthInTimeZone(now, timeZone);
  const baseYear = month >= 6 ? year : year - 1;
  const startYear = baseYear + offset;
  return `${startYear}-${startYear + 1}`;
}

export const getCurrentSchoolYear = (now: Date = new Date()) => getSchoolYear(0, now);

/** Default selection for school-year widget dropdowns (always the current school year). */
export function getDefaultSchoolYear(now: Date = new Date()): string {
  return getCurrentSchoolYear(now);
}

export const SCHOOL_YEAR_MIN_START = 2025;

/**
 * School year labels from min(start floor, current start year) through `(calendarYear + 3)`.
 * Always includes the current school year so widget dropdowns can default to it.
 */
export function getSchoolYearOptions(now: Date = new Date()): string[] {
  const current = getCurrentSchoolYear(now);
  const currentStartYear = Number(current.slice(0, 4));
  const { year: calendarYear } = getYearMonthInTimeZone(now);
  const maxStartYear = calendarYear + 3;
  const minStartYear = Math.min(SCHOOL_YEAR_MIN_START, currentStartYear);
  const out: string[] = [];
  for (let y = minStartYear; y <= maxStartYear; y++) {
    out.push(`${y}-${y + 1}`);
  }
  if (!out.includes(current)) {
    out.push(current);
    out.sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)));
  }
  return out;
}

const SCHOOL_YEAR_LABEL = /^\d{4}-\d{4}$/;

/**
 * Normalize AIP `schoolYear` from the API (`YYYY-YYYY` string, array of those, or legacy numeric start year) into labels.
 */
export function aipSchoolYearsAsArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => aipSchoolYearsAsArray(item));
  }
  const s = String(raw).trim();
  if (!s) return [];
  if (SCHOOL_YEAR_LABEL.test(s)) return [s];
  const n = Number(s);
  if (!Number.isNaN(n) && String(n) === s) return [`${n}-${n + 1}`];
  return [s];
}

/** Comma-separated school years for tables and dialogs. */
export function formatAipSchoolYearsDisplay(raw: unknown): string {
  const labels = aipSchoolYearsAsArray(raw);
  return labels.length ? labels.join(', ') : '—';
}

/**
 * Payload value for create/update: backend accepts one `YYYY-YYYY` or a non-empty array.
 * Call only when at least one year is selected (validated by the form).
 */
export function aipSchoolYearPayloadFromSelection(selected: string[]): string | string[] {
  const years = [...new Set(selected.map((y) => y.trim()).filter(Boolean))];
  if (years.length === 0) return '';
  if (years.length === 1) return years[0];
  return years;
}

export function formatDateString(value: string | MongoDate | undefined) {
  if (value == null) return '—';
  const str = typeof value === 'string' ? value : (value as { $date?: string })?.$date;
  if (!str) return '—';
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, {dateStyle: 'medium'});
  } catch {
    return str;
  }
}

export function formatDateTimeString(value: string | MongoDate | undefined) {
  if (value == null) return '—';
  const str = typeof value === 'string' ? value : (value as { $date?: string })?.$date;
  if (!str) return '—';
  try {
    const d = new Date(str);
    return isNaN(d.getTime())
      ? str
      : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return str;
  }
}

export function formatTimeString(value: string | MongoDate | undefined) {
  if (value == null) return '—';
  const str = typeof value === 'string' ? value : (value as { $date?: string })?.$date;
  if (!str) return '—';
  try {
    const d = new Date(str);
    return isNaN(d.getTime())
      ? str
      : d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  } catch {
    return str;
  }
}

/** Format Date to YYYY-MM-DD for API */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type DateRangePeriod =
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'last3Months'
  | 'last6Months';

/** Get start and end dates for a period, relative to `now` */
export function getDateRangeForPeriod(period: DateRangePeriod, now: Date): { start: Date; end: Date } {
  let start: Date;
  let end: Date = new Date(now);

  switch (period) {
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'thisQuarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), quarter * 3 + 3, 0); // last day of quarter
      break;
    }
    case 'lastQuarter': {
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
      start = new Date(lastQuarterYear, lastQuarterMonth, 1);
      end = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
      break;
    }
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31); // Dec 31
      break;
    case 'lastYear':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    case 'last3Months':
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case 'last6Months':
      start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Convert date range to API params for overlap filter (endDateFrom, startDateTo) */
export function getDateRangeParamsForAPI(
  start: Date | null,
  end: Date | null
): { startDateFrom?: string; endDateTo?: string } {
  const result: { startDateFrom?: string; endDateTo?: string } = {};
  if (start) result.startDateFrom = formatDateForAPI(start);
  if (end) result.endDateTo = formatDateForAPI(end);
  return result;
}
