import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DivisionSettingsService,
  DIVISION_LOCK_KEYS,
  DivisionLockKey,
} from '../../common/services/division-settings.service';
import {
  DivisionLockSettingValue,
  buildDivisionLockSetting,
  getSchoolYearLockAt,
  listSchoolYears,
  normalizeDivisionLockSetting,
  removeYearFromLockSetting,
} from '../../common/utils/division-lock.util';
import {
  formatPhilippinesDateLabel,
  getSchoolYearOptions,
  isPhilippinesLockDateReached,
  philippinesMidnightIsoFromDateInput,
  philippinesTodayMidnightIso,
} from '../../common/date-utils';

type AddMode = 'now' | 'schedule';

interface YearLockRow {
  year: string;
}

interface LockSectionState {
  key: DivisionLockKey;
  title: string;
  shortTitle: string;
  description: string;
  setting: DivisionLockSettingValue;
  selectedYearToAdd: string;
  addMode: AddMode;
  scheduledDate: string;
  isSaving: boolean;
}

@Component({
  selector: 'app-manage-school-year-locks',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './manage-school-year-locks.component.html',
  styleUrl: './manage-school-year-locks.component.css',
})
export class ManageSchoolYearLocksComponent implements OnInit {
  readonly schoolYearOptions = getSchoolYearOptions();
  isLoading = true;

  schoolNeedSection: LockSectionState = this.createSection(
    DIVISION_LOCK_KEYS.SCHOOL_NEED_LOCK,
    'School need lock',
    'School needs',
    'Prevents school admins and staff from creating, editing, or deleting school needs.',
  );

  aipSection: LockSectionState = this.createSection(
    DIVISION_LOCK_KEYS.AIP_LOCK,
    'AIP lock',
    'AIPs',
    'Prevents school admins and staff from creating, editing, or deleting AIPs (programs/projects).',
  );

  readonly sections: LockSectionState[] = [];

  constructor(
    private readonly divisionSettingsService: DivisionSettingsService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.sections.push(this.schoolNeedSection, this.aipSection);
  }

  ngOnInit(): void {
    void this.load();
  }

  trackByYear(_index: number, row: YearLockRow): string {
    return row.year;
  }

  yearRows(section: LockSectionState): YearLockRow[] {
    return listSchoolYears(section.setting).map((year) => ({ year }));
  }

  isUpcomingSchedule(section: LockSectionState, year: string): boolean {
    const lockAt = getSchoolYearLockAt(section.setting, year);
    return !!lockAt && !isPhilippinesLockDateReached(lockAt);
  }

  statusLabel(section: LockSectionState, year: string): string {
    const lockAt = getSchoolYearLockAt(section.setting, year);
    if (!lockAt) {
      return '';
    }
    if (isPhilippinesLockDateReached(lockAt)) {
      return 'Locked';
    }
    const when = this.formatScheduled(lockAt);
    return when === '—' ? 'Scheduled' : `Locks on ${when}`;
  }

  statusPrimary(section: LockSectionState, year: string): string {
    return this.isUpcomingSchedule(section, year) ? 'Scheduled' : 'Locked';
  }

  statusDate(section: LockSectionState, year: string): string | null {
    if (!this.isUpcomingSchedule(section, year)) {
      return null;
    }
    const when = this.formatScheduled(getSchoolYearLockAt(section.setting, year));
    return when === '—' ? null : when;
  }

  statusIcon(section: LockSectionState, year: string): string {
    return this.isUpcomingSchedule(section, year) ? 'event' : 'lock';
  }

  statusClass(section: LockSectionState, year: string): string {
    const lockAt = getSchoolYearLockAt(section.setting, year);
    if (!lockAt) {
      return '';
    }
    return isPhilippinesLockDateReached(lockAt)
      ? 'status-locked'
      : 'status-scheduled';
  }

  lockCount(section: LockSectionState): number {
    return listSchoolYears(section.setting).length;
  }

  sectionIcon(section: LockSectionState): string {
    return section.key === DIVISION_LOCK_KEYS.SCHOOL_NEED_LOCK
      ? 'assignment'
      : 'folder_open';
  }

  availableYears(section: LockSectionState): string[] {
    return this.schoolYearOptions.filter((y) => !this.isYearManaged(section, y));
  }

  hasLocks(section: LockSectionState): boolean {
    return listSchoolYears(section.setting).length > 0;
  }

  isYearManaged(section: LockSectionState, year: string): boolean {
    return getSchoolYearLockAt(section.setting, year) != null;
  }

  canAddYear(section: LockSectionState): boolean {
    const year = section.selectedYearToAdd?.trim();
    if (!year || this.isYearManaged(section, year)) {
      return false;
    }
    if (section.addMode === 'schedule' && !section.scheduledDate) {
      return false;
    }
    return true;
  }

  addButtonLabel(section: LockSectionState): string {
    if (!section.selectedYearToAdd) {
      return 'Add lock';
    }
    return section.addMode === 'now'
      ? `Lock ${section.selectedYearToAdd} now`
      : `Schedule ${section.selectedYearToAdd}`;
  }

  addSchoolYear(section: LockSectionState): void {
    const year = section.selectedYearToAdd?.trim();
    if (!year || this.isYearManaged(section, year)) {
      return;
    }

    const current = normalizeDivisionLockSetting(section.setting);
    const schoolYears = { ...current.schoolYears };
    let lockAt: string;

    if (section.addMode === 'now') {
      lockAt = philippinesTodayMidnightIso();
    } else {
      if (!section.scheduledDate) {
        this.showError('Pick a date for the scheduled lock.');
        return;
      }
      const scheduledAt = philippinesMidnightIsoFromDateInput(
        section.scheduledDate,
      );
      if (!scheduledAt) {
        this.showError('Pick a valid date for the scheduled lock.');
        return;
      }
      lockAt = scheduledAt;
    }

    schoolYears[year] = lockAt;
    section.setting = buildDivisionLockSetting({ schoolYears });
    section.selectedYearToAdd = '';

    void this.persistSection(
      section,
      section.addMode === 'now'
        ? `${year} is now locked.`
        : `${year} will lock on ${this.formatScheduled(lockAt)}.`,
    );
  }

  unlockYear(section: LockSectionState, row: YearLockRow): void {
    const previous = normalizeDivisionLockSetting(section.setting);
    if (!getSchoolYearLockAt(previous, row.year)) {
      return;
    }

    const wasUpcoming = this.isUpcomingSchedule(section, row.year);
    section.setting = removeYearFromLockSetting(previous, row.year);
    this.cdr.detectChanges();

    void this.persistSection(
      section,
      wasUpcoming
        ? `${row.year} schedule cancelled.`
        : `${row.year} unlocked.`,
      previous,
    );
  }

  clearAllLocks(section: LockSectionState): void {
    const previous = normalizeDivisionLockSetting(section.setting);
    section.setting = buildDivisionLockSetting({ schoolYears: {} });
    section.scheduledDate = '';
    section.selectedYearToAdd = '';
    this.cdr.detectChanges();
    void this.persistSection(section, 'All locks removed.', previous);
  }

  formatScheduled(iso: string | null | undefined): string {
    return formatPhilippinesDateLabel(iso);
  }

  private async persistSection(
    section: LockSectionState,
    successMessage: string,
    revertTo?: DivisionLockSettingValue,
  ): Promise<void> {
    section.isSaving = true;
    this.cdr.detectChanges();

    const payload = normalizeDivisionLockSetting(section.setting);

    try {
      const saved = await this.divisionSettingsService.updateLockSetting(
        section.key,
        payload,
      );
      const normalized = normalizeDivisionLockSetting(saved);

      if (this.settingStillContainsRemovedYears(payload, normalized)) {
        if (revertTo) {
          section.setting = revertTo;
        } else {
          section.setting = payload;
        }
        this.cdr.detectChanges();
        this.showError(
          'The server did not apply your change. Please refresh and try again.',
        );
        return;
      }

      section.setting = normalized;
      this.showSuccess(successMessage);
    } catch (e: unknown) {
      console.error(e);
      if (revertTo) {
        section.setting = revertTo;
      }
      this.cdr.detectChanges();
      this.showError('Failed to save. Please try again.');
    } finally {
      section.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  private settingStillContainsRemovedYears(
    intended: DivisionLockSettingValue,
    actual: DivisionLockSettingValue,
  ): boolean {
    const intendedYears = new Set(
      listSchoolYears(normalizeDivisionLockSetting(intended)),
    );
    const actualYears = listSchoolYears(normalizeDivisionLockSetting(actual));
    return actualYears.some((year) => !intendedYears.has(year));
  }

  private async load(): Promise<void> {
    this.isLoading = true;
    try {
      await this.divisionSettingsService.initializeLocks(true);
      this.schoolNeedSection.setting = normalizeDivisionLockSetting(
        this.divisionSettingsService.getSchoolNeedLockSetting(),
      );
      this.aipSection.setting = normalizeDivisionLockSetting(
        this.divisionSettingsService.getAipLockSetting(),
      );
    } catch (e: unknown) {
      console.error(e);
      this.showError('Failed to load lock settings.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private createSection(
    key: DivisionLockKey,
    title: string,
    shortTitle: string,
    description: string,
  ): LockSectionState {
    return {
      key,
      title,
      shortTitle,
      description,
      setting: normalizeDivisionLockSetting(null),
      selectedYearToAdd: '',
      addMode: 'now',
      scheduledDate: '',
      isSaving: false,
    };
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 6000 });
  }
}
