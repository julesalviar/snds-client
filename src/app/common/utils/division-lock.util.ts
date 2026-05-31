export interface DivisionLockSettingValue {
  schoolYears: string[];
  locked: boolean;
  scheduledLockAt?: string | null;
  scheduleSuppressed?: boolean;
}

export const DEFAULT_DIVISION_LOCK_SETTING: DivisionLockSettingValue = {
  schoolYears: [],
  locked: false,
  scheduledLockAt: null,
  scheduleSuppressed: false,
};

export function normalizeDivisionLockSetting(
  raw: unknown,
): DivisionLockSettingValue {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_DIVISION_LOCK_SETTING };
  }
  const value = raw as Partial<DivisionLockSettingValue>;
  return {
    schoolYears: Array.isArray(value.schoolYears)
      ? value.schoolYears.filter(
          (y): y is string =>
            typeof y === 'string' && /^\d{4}-\d{4}$/.test(y.trim()),
        )
      : [],
    locked: value.locked === true,
    scheduledLockAt:
      value.scheduledLockAt === null || value.scheduledLockAt === undefined
        ? null
        : String(value.scheduledLockAt),
    scheduleSuppressed: value.scheduleSuppressed === true,
  };
}

export function isSchoolYearLocked(
  setting: DivisionLockSettingValue,
  schoolYear: string,
  now: Date = new Date(),
): boolean {
  const year = schoolYear?.trim();
  if (!year || !setting.schoolYears.includes(year)) {
    return false;
  }
  if (setting.locked) {
    return true;
  }
  if (setting.scheduleSuppressed) {
    return false;
  }
  if (!setting.scheduledLockAt) {
    return false;
  }
  const scheduled = Date.parse(setting.scheduledLockAt);
  if (Number.isNaN(scheduled)) {
    return false;
  }
  return now.getTime() >= scheduled;
}

export function getLockStatusLabel(
  setting: DivisionLockSettingValue,
  now: Date = new Date(),
): 'unlocked' | 'locked' | 'scheduled' {
  const anyLocked = setting.schoolYears.some((y) =>
    isSchoolYearLocked(setting, y, now),
  );
  if (anyLocked) {
    return 'locked';
  }
  if (
    setting.scheduledLockAt &&
    !setting.scheduleSuppressed &&
    !setting.locked
  ) {
    const scheduled = Date.parse(setting.scheduledLockAt);
    if (!Number.isNaN(scheduled) && now.getTime() < scheduled) {
      return 'scheduled';
    }
  }
  return 'unlocked';
}

export const SCHOOL_MUTATION_ROLES = ['schoolAdmin', 'schoolStaff'] as const;

export function isSchoolMutationRole(role: string | null | undefined): boolean {
  return !!role && (SCHOOL_MUTATION_ROLES as readonly string[]).includes(role);
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    error?: { message?: string | string[] } | string;
    message?: string;
    status?: number;
  };
  if (e?.error && typeof e.error === 'object' && e.error.message) {
    if (Array.isArray(e.error.message)) {
      return e.error.message.join(' ');
    }
    if (typeof e.error.message === 'string') {
      return e.error.message;
    }
  }
  if (typeof e?.error === 'string') {
    return e.error;
  }
  if (e?.message) {
    return e.message;
  }
  return fallback;
}
