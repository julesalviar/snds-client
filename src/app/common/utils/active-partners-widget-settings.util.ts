export const ACTIVE_PARTNERS_WIDGET_SETTING_KEY = 'activePartnersWidget';

export const DEFAULT_MIN_ACTIVE_PARTNER_AMOUNT = 100000;
export const DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS = 6;
export const MIN_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS = 3;
export const MAX_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS = 300;

const USER_TAG_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SCHOOL_YEAR_PATTERN = /^\d{4}-\d{4}$/;

export interface ActivePartnersWidgetSetting {
  minEngagementAmount: number;
  defaultSchoolYear: string | null;
  excludedTagKeys: string[];
  excludedSectors: string[];
  excludePreInstalledStakeholders: boolean;
  rotateIntervalSeconds: number;
}

export const DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING: ActivePartnersWidgetSetting =
  {
    minEngagementAmount: DEFAULT_MIN_ACTIVE_PARTNER_AMOUNT,
    defaultSchoolYear: null,
    excludedTagKeys: [],
    excludedSectors: [],
    excludePreInstalledStakeholders: true,
    rotateIntervalSeconds: DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS,
  };

export interface ActivePartnersWidgetSettingResponse {
  success: boolean;
  data: ActivePartnersWidgetSetting & { resolvedDefaultSchoolYear: string };
  meta: { timestamp: string };
}

export type ActivePartnersWidgetSettingField =
  | 'minEngagementAmount'
  | 'defaultSchoolYear'
  | 'rotateIntervalSeconds';

export type ActivePartnersWidgetSettingFieldErrors = Partial<
  Record<ActivePartnersWidgetSettingField, string>
>;

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    if (typeof raw !== 'string') {
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function normalizeExcludedTagKeys(values: unknown): string[] {
  return normalizeStringList(values).filter((key) =>
    USER_TAG_KEY_PATTERN.test(key),
  );
}

export function normalizeActivePartnersWidgetSetting(
  raw: unknown,
): ActivePartnersWidgetSetting {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING };
  }

  const value = raw as Partial<ActivePartnersWidgetSetting>;
  const minEngagementAmount = Number(value.minEngagementAmount);
  const defaultSchoolYear =
    typeof value.defaultSchoolYear === 'string'
      ? value.defaultSchoolYear.trim()
      : null;

  return {
    minEngagementAmount:
      Number.isFinite(minEngagementAmount) && minEngagementAmount >= 0
        ? minEngagementAmount
        : DEFAULT_MIN_ACTIVE_PARTNER_AMOUNT,
    defaultSchoolYear:
      defaultSchoolYear && SCHOOL_YEAR_PATTERN.test(defaultSchoolYear)
        ? defaultSchoolYear
        : null,
    excludedTagKeys: normalizeExcludedTagKeys(value.excludedTagKeys),
    excludedSectors: normalizeStringList(value.excludedSectors),
    excludePreInstalledStakeholders:
      value.excludePreInstalledStakeholders !== false,
    rotateIntervalSeconds: normalizeRotateIntervalSeconds(
      value.rotateIntervalSeconds,
    ),
  };
}

export function validateActivePartnersWidgetSettingInput(
  value: Partial<ActivePartnersWidgetSetting>,
): ActivePartnersWidgetSettingFieldErrors {
  const errors: ActivePartnersWidgetSettingFieldErrors = {};
  const minAmount = Number(value.minEngagementAmount);
  if (!Number.isFinite(minAmount)) {
    errors.minEngagementAmount = 'Minimum engagement amount is required.';
  } else if (minAmount < 0) {
    errors.minEngagementAmount =
      'Minimum engagement amount cannot be negative.';
  }

  const defaultSchoolYear =
    typeof value.defaultSchoolYear === 'string'
      ? value.defaultSchoolYear.trim()
      : value.defaultSchoolYear;
  if (
    defaultSchoolYear != null &&
    defaultSchoolYear !== '' &&
    !SCHOOL_YEAR_PATTERN.test(defaultSchoolYear)
  ) {
    errors.defaultSchoolYear = 'School year must be in YYYY-YYYY format.';
  }

  const rotateIntervalSeconds = Number(value.rotateIntervalSeconds);
  if (!Number.isFinite(rotateIntervalSeconds)) {
    errors.rotateIntervalSeconds = 'Rotation interval is required.';
  } else if (
    !Number.isInteger(rotateIntervalSeconds) ||
    rotateIntervalSeconds < MIN_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS
  ) {
    errors.rotateIntervalSeconds = `Rotation interval must be at least ${MIN_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS} seconds.`;
  } else if (
    rotateIntervalSeconds > MAX_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS
  ) {
    errors.rotateIntervalSeconds = `Rotation interval cannot exceed ${MAX_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS} seconds.`;
  }

  return errors;
}

export function hasActivePartnersWidgetSettingValidationErrors(
  errors: ActivePartnersWidgetSettingFieldErrors,
): boolean {
  return Object.keys(errors).length > 0;
}

function normalizeRotateIntervalSeconds(value: unknown): number {
  const seconds = Number(value);
  if (
    !Number.isFinite(seconds) ||
    seconds < MIN_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS
  ) {
    return DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS;
  }
  return Math.min(
    Math.round(seconds),
    MAX_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS,
  );
}

export function resolveActivePartnersSchoolYear(
  setting: ActivePartnersWidgetSetting & { resolvedDefaultSchoolYear?: string },
  options: readonly string[],
  fallback: string,
): string {
  const resolved =
    setting.resolvedDefaultSchoolYear?.trim() ||
    setting.defaultSchoolYear?.trim() ||
    fallback;
  if (options.includes(resolved)) {
    return resolved;
  }
  if (setting.defaultSchoolYear && options.includes(setting.defaultSchoolYear)) {
    return setting.defaultSchoolYear;
  }
  return options.includes(fallback)
    ? fallback
    : options[options.length - 1] ?? fallback;
}
