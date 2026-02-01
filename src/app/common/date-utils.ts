import {MongoDate} from "./model/school.model";

export function getSchoolYear(offset: number = 0): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 = January

  // Determine the base school year
  const baseYear = currentMonth >= 5 ? currentYear : currentYear - 1;

  // Apply the optional offset
  const startYear = baseYear + offset;
  const endYear = startYear + 1;

  return `${startYear}-${endYear}`;
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
