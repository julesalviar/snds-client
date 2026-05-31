import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import {
  DivisionSettingsService,
  DIVISION_LOCK_KEYS,
  DivisionLockKey,
} from '../../common/services/division-settings.service';
import {
  DivisionLockSettingValue,
  getLockStatusLabel,
} from '../../common/utils/division-lock.util';
import { getSchoolYearOptions } from '../../common/date-utils';

interface LockSectionState {
  key: DivisionLockKey;
  title: string;
  description: string;
  setting: DivisionLockSettingValue;
  selectedYearToAdd: string;
  scheduledLocal: string;
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
    MatSlideToggleModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './manage-school-year-locks.component.html',
  styleUrl: './manage-school-year-locks.component.css',
})
export class ManageSchoolYearLocksComponent implements OnInit {
  readonly schoolYearOptions = getSchoolYearOptions();
  isLoading = true;
  isSaving = false;

  schoolNeedSection: LockSectionState = this.createSection(
    DIVISION_LOCK_KEYS.SCHOOL_NEED_LOCK,
    'School need lock',
    'When locked, school admins and staff cannot create, update, or delete school needs for the selected school years.',
  );

  aipSection: LockSectionState = this.createSection(
    DIVISION_LOCK_KEYS.AIP_LOCK,
    'AIP lock',
    'When locked, school admins and staff cannot create, update, or delete AIPs (programs/projects) for the selected school years.',
  );

  constructor(
    private readonly divisionSettingsService: DivisionSettingsService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  get sections(): LockSectionState[] {
    return [this.schoolNeedSection, this.aipSection];
  }

  statusLabel(section: LockSectionState): string {
    const status = getLockStatusLabel(section.setting);
    switch (status) {
      case 'locked':
        return 'Locked';
      case 'scheduled':
        return `Scheduled (locks on ${this.formatScheduled(section.setting.scheduledLockAt)})`;
      default:
        return 'Unlocked';
    }
  }

  addSchoolYear(section: LockSectionState): void {
    const year = section.selectedYearToAdd?.trim();
    if (!year || section.setting.schoolYears.includes(year)) {
      return;
    }
    section.setting = {
      ...section.setting,
      schoolYears: [...section.setting.schoolYears, year].sort(),
    };
    section.selectedYearToAdd = '';
  }

  removeSchoolYear(section: LockSectionState, year: string): void {
    section.setting = {
      ...section.setting,
      schoolYears: section.setting.schoolYears.filter((y) => y !== year),
    };
  }

  onLockNowChange(section: LockSectionState, locked: boolean): void {
    section.setting = {
      ...section.setting,
      locked,
      scheduleSuppressed: locked ? false : section.setting.scheduleSuppressed,
    };
  }

  onScheduledChange(section: LockSectionState, localValue: string): void {
    section.scheduledLocal = localValue;
    section.setting = {
      ...section.setting,
      scheduledLockAt: localValue
        ? new Date(localValue).toISOString()
        : null,
      scheduleSuppressed: false,
    };
  }

  unlockOnDemand(section: LockSectionState): void {
    section.setting = {
      ...section.setting,
      locked: false,
      scheduleSuppressed: true,
    };
    section.scheduledLocal = '';
  }

  async saveSection(section: LockSectionState): Promise<void> {
    this.isSaving = true;
    try {
      const saved = await this.divisionSettingsService.updateLockSetting(
        section.key,
        section.setting,
      );
      section.setting = { ...saved };
      section.scheduledLocal = this.toLocalDatetimeInput(saved.scheduledLockAt);
      this.showSuccess(`${section.title} saved.`);
    } catch (e: unknown) {
      console.error(e);
      this.showError('Failed to save lock settings. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  private async load(): Promise<void> {
    this.isLoading = true;
    try {
      await this.divisionSettingsService.initializeLocks(true);
      this.schoolNeedSection.setting = {
        ...this.divisionSettingsService.getSchoolNeedLockSetting(),
      };
      this.aipSection.setting = {
        ...this.divisionSettingsService.getAipLockSetting(),
      };
      this.schoolNeedSection.scheduledLocal = this.toLocalDatetimeInput(
        this.schoolNeedSection.setting.scheduledLockAt,
      );
      this.aipSection.scheduledLocal = this.toLocalDatetimeInput(
        this.aipSection.setting.scheduledLockAt,
      );
    } catch (e: unknown) {
      console.error(e);
      this.showError('Failed to load lock settings.');
    } finally {
      this.isLoading = false;
    }
  }

  private createSection(
    key: DivisionLockKey,
    title: string,
    description: string,
  ): LockSectionState {
    return {
      key,
      title,
      description,
      setting: {
        schoolYears: [],
        locked: false,
        scheduledLockAt: null,
        scheduleSuppressed: false,
      },
      selectedYearToAdd: '',
      scheduledLocal: '',
    };
  }

  private toLocalDatetimeInput(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private formatScheduled(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 6000 });
  }
}
