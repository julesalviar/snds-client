import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINT } from '../api-endpoints';
import { HttpService } from './http.service';
import {
  DivisionLockSettingValue,
  DEFAULT_DIVISION_LOCK_SETTING,
  isSchoolYearLocked,
  normalizeDivisionLockSetting,
} from '../utils/division-lock.util';
import { aipSchoolYearsAsArray } from '../date-utils';
import {
  ACTIVE_PARTNERS_WIDGET_SETTING_KEY,
  ActivePartnersWidgetSetting,
  DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
  normalizeActivePartnersWidgetSetting,
} from '../utils/active-partners-widget-settings.util';

export const DIVISION_LOCK_KEYS = {
  SCHOOL_NEED_LOCK: 'schoolNeedLock',
  AIP_LOCK: 'aipLock',
} as const;

export type DivisionLockKey =
  (typeof DIVISION_LOCK_KEYS)[keyof typeof DIVISION_LOCK_KEYS];

export { ACTIVE_PARTNERS_WIDGET_SETTING_KEY };

@Injectable({ providedIn: 'root' })
export class DivisionSettingsService {
  private schoolNeedLock: DivisionLockSettingValue = {
    ...DEFAULT_DIVISION_LOCK_SETTING,
  };
  private aipLock: DivisionLockSettingValue = {
    ...DEFAULT_DIVISION_LOCK_SETTING,
  };
  private locksLoaded = false;

  constructor(private readonly http: HttpService) {}

  async initializeLocks(force = false): Promise<void> {
    if (this.locksLoaded && !force) {
      return;
    }
    const [schoolNeed, aip] = await Promise.all([
      this.fetchLockSetting(DIVISION_LOCK_KEYS.SCHOOL_NEED_LOCK),
      this.fetchLockSetting(DIVISION_LOCK_KEYS.AIP_LOCK),
    ]);
    this.schoolNeedLock = schoolNeed;
    this.aipLock = aip;
    this.locksLoaded = true;
  }

  invalidateLocks(): void {
    this.locksLoaded = false;
  }

  getSchoolNeedLockSetting(): DivisionLockSettingValue {
    return this.schoolNeedLock;
  }

  getAipLockSetting(): DivisionLockSettingValue {
    return this.aipLock;
  }

  isSchoolNeedYearLocked(schoolYear: string | undefined | null): boolean {
    if (!schoolYear?.trim()) {
      return false;
    }
    return isSchoolYearLocked(this.schoolNeedLock, schoolYear.trim());
  }

  isAipYearLocked(schoolYear: string | undefined | null): boolean {
    if (!schoolYear?.trim()) {
      return false;
    }
    return isSchoolYearLocked(this.aipLock, schoolYear.trim());
  }

  isAipLockedForYears(schoolYears: string[]): boolean {
    const years = schoolYears
      .map((y) => y?.trim())
      .filter((y): y is string => !!y);
    if (years.length === 0) {
      return false;
    }
    return years.some((y) => this.isAipYearLocked(y));
  }

  isAipLockedForRawSchoolYear(raw: unknown): boolean {
    return this.isAipLockedForYears(aipSchoolYearsAsArray(raw));
  }

  /** School years that may be chosen on create/duplicate forms. */
  filterUnlockedAipSchoolYears(years: string[]): string[] {
    return years.filter((y) => !this.isAipYearLocked(y));
  }

  filterUnlockedSchoolNeedYears(years: string[]): string[] {
    return years.filter((y) => !this.isSchoolNeedYearLocked(y));
  }

  /** Prefer `preferred` when unlocked; otherwise first unlocked option. */
  resolveUnlockedSchoolNeedYear(
    preferred: string | undefined | null,
    options: string[],
  ): string {
    const trimmed = preferred?.trim();
    if (trimmed && !this.isSchoolNeedYearLocked(trimmed)) {
      return trimmed;
    }
    const unlocked = this.filterUnlockedSchoolNeedYears(options);
    return unlocked[0] ?? trimmed ?? options[0] ?? '';
  }

  resolveUnlockedAipSchoolYears(
    preferred: string[],
    options: string[],
  ): string[] {
    const unlockedPreferred = preferred.filter(
      (year) => !this.isAipYearLocked(year),
    );
    if (unlockedPreferred.length > 0) {
      return unlockedPreferred;
    }
    const fallback = this.filterUnlockedAipSchoolYears(options);
    return fallback.length > 0 ? [fallback[0]] : [];
  }

  async getLockSetting(key: DivisionLockKey): Promise<DivisionLockSettingValue> {
    return this.fetchLockSetting(key);
  }

  async updateLockSetting(
    key: DivisionLockKey,
    value: DivisionLockSettingValue,
  ): Promise<DivisionLockSettingValue> {
    const url = `${API_ENDPOINT.divisionSettings}/${key}`;
    const payload = normalizeDivisionLockSetting(value);
    const result = await firstValueFrom(
      this.http.put<DivisionLockSettingValue>(url, payload),
    );
    const normalized = normalizeDivisionLockSetting(result);
    if (key === DIVISION_LOCK_KEYS.SCHOOL_NEED_LOCK) {
      this.schoolNeedLock = normalized;
    } else {
      this.aipLock = normalized;
    }
    this.locksLoaded = true;
    return normalized;
  }

  /**
   * Missing tenant config or failed fetch → defaults (unlocked); app behavior unchanged.
   */
  private async fetchLockSetting(
    key: DivisionLockKey,
  ): Promise<DivisionLockSettingValue> {
    try {
      const url = `${API_ENDPOINT.divisionSettings}/${key}`;
      const raw = await firstValueFrom(this.http.get<unknown>(url));
      if (raw == null) {
        return { ...DEFAULT_DIVISION_LOCK_SETTING };
      }
      return normalizeDivisionLockSetting(raw);
    } catch {
      return { ...DEFAULT_DIVISION_LOCK_SETTING };
    }
  }

  async getActivePartnersWidgetSetting(): Promise<ActivePartnersWidgetSetting> {
    try {
      const url = `${API_ENDPOINT.divisionSettings}/${ACTIVE_PARTNERS_WIDGET_SETTING_KEY}`;
      const raw = await firstValueFrom(this.http.get<unknown>(url));
      if (raw == null) {
        return { ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING };
      }
      return normalizeActivePartnersWidgetSetting(raw);
    } catch {
      return { ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING };
    }
  }

  async updateActivePartnersWidgetSetting(
    value: ActivePartnersWidgetSetting,
  ): Promise<ActivePartnersWidgetSetting> {
    const url = `${API_ENDPOINT.divisionSettings}/${ACTIVE_PARTNERS_WIDGET_SETTING_KEY}`;
    const result = await firstValueFrom(
      this.http.put<ActivePartnersWidgetSetting>(url, value),
    );
    return normalizeActivePartnersWidgetSetting(result);
  }
}
