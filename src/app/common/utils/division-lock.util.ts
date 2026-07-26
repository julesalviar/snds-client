import { isPhilippinesLockDateReached } from '../date-utils';
import { getHttpErrorMessage } from './http-error-message.util';

export interface DivisionLockSettingValue {
  schoolYears: Record<string, string>;
}

export const DEFAULT_DIVISION_LOCK_SETTING: DivisionLockSettingValue = {
  schoolYears: {},
};

const SCHOOL_YEAR_PATTERN = /^\d{4}-\d{4}$/;

function normalizeSchoolYearMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!SCHOOL_YEAR_PATTERN.test(key)) {
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      result[key] = value.trim();
    }
  }

  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function normalizeDivisionLockSetting(
  raw: unknown,
): DivisionLockSettingValue {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_DIVISION_LOCK_SETTING };
  }

  const value = raw as { schoolYears?: unknown };
  if (
    value.schoolYears &&
    typeof value.schoolYears === 'object' &&
    !Array.isArray(value.schoolYears)
  ) {
    return { schoolYears: normalizeSchoolYearMap(value.schoolYears) };
  }

  return { ...DEFAULT_DIVISION_LOCK_SETTING };
}

export function listSchoolYears(setting: DivisionLockSettingValue): string[] {
  return Object.keys(normalizeDivisionLockSetting(setting).schoolYears).sort();
}

export function getSchoolYearLockAt(
  setting: DivisionLockSettingValue,
  schoolYear: string,
): string | null {
  const year = schoolYear?.trim();
  if (!year) {
    return null;
  }
  return normalizeDivisionLockSetting(setting).schoolYears[year] ?? null;
}

export function isSchoolYearLocked(
  setting: DivisionLockSettingValue,
  schoolYear: string,
  now: Date = new Date(),
): boolean {
  const lockAt = getSchoolYearLockAt(setting, schoolYear);
  if (!lockAt) {
    return false;
  }
  return isPhilippinesLockDateReached(lockAt, now);
}

export function isSchoolYearScheduled(
  setting: DivisionLockSettingValue,
  schoolYear: string,
  now: Date = new Date(),
): boolean {
  const lockAt = getSchoolYearLockAt(setting, schoolYear);
  if (!lockAt) {
    return false;
  }
  return !isPhilippinesLockDateReached(lockAt, now);
}

export function getScheduledSchoolYears(
  setting: DivisionLockSettingValue,
  now: Date = new Date(),
): string[] {
  return listSchoolYears(setting).filter((year) =>
    isSchoolYearScheduled(setting, year, now),
  );
}

export function getLockStatusLabel(
  setting: DivisionLockSettingValue,
  now: Date = new Date(),
): 'unlocked' | 'locked' | 'scheduled' {
  const normalized = normalizeDivisionLockSetting(setting);
  const anyLocked = listSchoolYears(normalized).some((year) =>
    isSchoolYearLocked(normalized, year, now),
  );
  if (anyLocked) {
    return 'locked';
  }
  const scheduledYears = getScheduledSchoolYears(normalized, now);
  if (scheduledYears.length > 0) {
    return 'scheduled';
  }
  return 'unlocked';
}

export function buildDivisionLockSetting(input: {
  schoolYears: Record<string, string>;
}): DivisionLockSettingValue {
  return normalizeDivisionLockSetting({ schoolYears: input.schoolYears });
}

export function removeYearFromLockSetting(
  setting: DivisionLockSettingValue,
  schoolYear: string,
): DivisionLockSettingValue {
  const year = schoolYear?.trim();
  if (!year) {
    return normalizeDivisionLockSetting(setting);
  }

  const current = normalizeDivisionLockSetting(setting);
  const schoolYears = { ...current.schoolYears };
  delete schoolYears[year];
  return buildDivisionLockSetting({ schoolYears });
}

export const SCHOOL_MUTATION_ROLES = ['schoolAdmin', 'schoolStaff'] as const;

export function isSchoolMutationRole(role: string | null | undefined): boolean {
  return !!role && (SCHOOL_MUTATION_ROLES as readonly string[]).includes(role);
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  return getHttpErrorMessage(err, fallback);
}
