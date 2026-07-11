import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { getActivePartnersDisplayCount } from '../../home/pick-weighted-active-partners.util';
import {
  ActivePartnersWidgetSetting,
  DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
  DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS,
  hasActivePartnersWidgetSettingValidationErrors,
  validateActivePartnersWidgetSettingInput,
  ActivePartnersWidgetSettingFieldErrors,
} from '../../common/utils/active-partners-widget-settings.util';
import { getHttpErrorMessage } from '../../common/utils/http-error-message.util';
import { DivisionSettingsService } from '../../common/services/division-settings.service';
import { getCurrentSchoolYear, getSchoolYearOptions } from '../../common/date-utils';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import {
  parseUserTagsRefData,
  UserTagRef,
  USER_TAGS_REF_DATA_KEY,
} from '../../common/utils/user-tags-reference-data.util';
import {
  getSectorNames,
  SECTOR_REF_DATA_KEY,
} from '../../common/utils/sector-reference-data.util';

@Component({
  selector: 'app-manage-widget-settings',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  templateUrl: './manage-widget-settings.component.html',
  styleUrl: './manage-widget-settings.component.css',
})
export class ManageWidgetSettingsComponent implements OnInit {
  readonly schoolYearOptions = getSchoolYearOptions();
  readonly currentSchoolYear = getCurrentSchoolYear();
  readonly defaultMinAmount =
    DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING.minEngagementAmount;
  readonly defaultRotateIntervalSeconds =
    DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS;
  readonly activePartnersMaxDisplay = getActivePartnersDisplayCount(10);

  isLoading = true;
  isSaving = false;
  tagOptions: UserTagRef[] = [];
  sectorOptions: string[] = [];
  fieldErrors: ActivePartnersWidgetSettingFieldErrors = {};

  activePartnersSetting: ActivePartnersWidgetSetting = {
    ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
  };

  constructor(
    private readonly divisionSettingsService: DivisionSettingsService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  get defaultSchoolYearSelection(): string {
    return this.activePartnersSetting.defaultSchoolYear ?? '';
  }

  set defaultSchoolYearSelection(value: string) {
    const trimmed = value?.trim();
    this.activePartnersSetting = {
      ...this.activePartnersSetting,
      defaultSchoolYear: trimmed ? trimmed : null,
    };
  }

  async saveActivePartners(): Promise<void> {
    this.fieldErrors = validateActivePartnersWidgetSettingInput(
      this.activePartnersSetting,
    );
    if (hasActivePartnersWidgetSettingValidationErrors(this.fieldErrors)) {
      this.showError('Please fix the highlighted errors before saving.');
      return;
    }

    this.isSaving = true;
    try {
      const saved =
        await this.divisionSettingsService.updateActivePartnersWidgetSetting({
          minEngagementAmount: Number(this.activePartnersSetting.minEngagementAmount),
          defaultSchoolYear: this.activePartnersSetting.defaultSchoolYear,
          excludedTagKeys: [...this.activePartnersSetting.excludedTagKeys],
          excludedSectors: [...this.activePartnersSetting.excludedSectors],
          excludePreInstalledStakeholders:
            this.activePartnersSetting.excludePreInstalledStakeholders,
          rotateIntervalSeconds: Number(
            this.activePartnersSetting.rotateIntervalSeconds,
          ),
        });
      this.activePartnersSetting = { ...saved };
      this.fieldErrors = {};
      this.showSuccess('Active Partners widget settings saved.');
    } catch (e: unknown) {
      console.error(e);
      this.showError(
        getHttpErrorMessage(
          e,
          'Failed to save Active Partners widget settings.',
        ),
      );
    } finally {
      this.isSaving = false;
    }
  }

  resetActivePartnersToDefaults(): void {
    this.activePartnersSetting = { ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING };
    this.fieldErrors = {};
  }

  clearFieldError(field: keyof ActivePartnersWidgetSettingFieldErrors): void {
    if (this.fieldErrors[field]) {
      const next = { ...this.fieldErrors };
      delete next[field];
      this.fieldErrors = next;
    }
  }

  private async load(): Promise<void> {
    this.isLoading = true;
    try {
      await Promise.all([
        this.internalReferenceDataService.initialize(),
        this.referenceDataService.initialize(),
      ]);
      this.tagOptions = parseUserTagsRefData(
        this.internalReferenceDataService.get(USER_TAGS_REF_DATA_KEY),
      );
      this.sectorOptions = getSectorNames(
        this.referenceDataService.get(SECTOR_REF_DATA_KEY),
      );
      this.activePartnersSetting = {
        ...(await this.divisionSettingsService.getActivePartnersWidgetSetting()),
      };
    } catch (e: unknown) {
      console.error(e);
      this.showError(
        getHttpErrorMessage(e, 'Failed to load widget settings.'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 6000 });
  }
}
