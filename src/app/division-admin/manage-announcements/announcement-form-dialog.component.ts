import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { provideNativeDateAdapter } from '@angular/material/core';
import { lastValueFrom } from 'rxjs';
import { AnnouncementService } from '../../common/services/announcement.service';
import {
  formatPhilippinesDateTimeEnd,
  formatPhilippinesDateTimeStart,
  parsePhilippinesCalendarDate,
} from '../../common/date-utils';
import {
  Announcement,
  AnnouncementAiStatus,
  AnnouncementTargetAudience,
  getAnnouncementRoleLabel,
} from '../../common/model/announcement.model';
import { RichTextEditorComponent } from '../../common/components/rich-text-editor/rich-text-editor.component';

export interface AnnouncementFormDialogData {
  mode: 'create' | 'edit';
  announcement?: Announcement;
}

@Component({
  selector: 'app-announcement-form-dialog',
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
    RichTextEditorComponent,
  ],
  templateUrl: './announcement-form-dialog.component.html',
  styleUrl: './announcement-form-dialog.component.css',
})
export class AnnouncementFormDialogComponent implements OnInit {
  form: FormGroup;
  isEdit: boolean;
  isSaving = false;
  isLoadingRoles = true;
  aiGenerateEnabled = false;
  aiLimitReached = false;
  aiAdditionalContext = '';
  isAiGenerating = false;
  subordinateRoles: string[] = [];
  staleTargetRoles: string[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly announcementService: AnnouncementService,
    private readonly snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AnnouncementFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AnnouncementFormDialogData,
  ) {
    this.isEdit = data.mode === 'edit';
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      announcement: ['', Validators.required],
      effectiveFromDate: [null as Date | null, Validators.required],
      effectiveUntilDate: [null as Date | null],
      active: [true],
      forceShowEveryVisit: [false],
      targetAudience: ['all' as AnnouncementTargetAudience, Validators.required],
      targetRoles: [[] as string[]],
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSubordinateRoles(), this.loadAiStatus()]);

    if (this.isEdit && this.data.announcement) {
      this.patchForm(this.data.announcement);
    }
  }

  private async loadAiStatus(): Promise<void> {
    try {
      const status = await lastValueFrom(this.announcementService.getAiStatus());
      this.applyAiStatus(status);
    } catch {
      this.aiGenerateEnabled = false;
      this.aiLimitReached = false;
    }
  }

  applyAiStatus(status: AnnouncementAiStatus): void {
    this.aiGenerateEnabled = Boolean(status.aiEnabled);
    this.aiLimitReached = Boolean(
      status.aiEnabled && status.quota && !status.quota.canGenerate,
    );
  }

  onAiLimitReachedChange(limitReached: boolean): void {
    this.aiLimitReached = limitReached;
  }

  get roleLabelFn() {
    return getAnnouncementRoleLabel;
  }

  get staleRolesLabel(): string {
    return this.staleTargetRoles.map((r) => getAnnouncementRoleLabel(r)).join(', ');
  }

  private async loadSubordinateRoles(): Promise<void> {
    this.isLoadingRoles = true;
    try {
      const res = await lastValueFrom(this.announcementService.getRoleSubordinates());
      this.subordinateRoles = res.subordinateRoles ?? [];
      if (this.isEdit && this.data.announcement) {
        const stored = this.data.announcement.targetRoles ?? [];
        this.staleTargetRoles = stored.filter((r) => !this.subordinateRoles.includes(r));
      }
    } catch {
      this.snackBar.open('Failed to load role options.', 'Close', { duration: 4000 });
      this.subordinateRoles = [];
    } finally {
      this.isLoadingRoles = false;
    }
  }

  private patchForm(announcement: Announcement): void {
    this.form.patchValue({
      title: announcement.title,
      description: announcement.description ?? '',
      announcement: announcement.announcement,
      effectiveFromDate: this.parseDate(announcement.effectiveFrom),
      effectiveUntilDate: announcement.effectiveUntil
        ? this.parseDate(announcement.effectiveUntil)
        : null,
      active: announcement.active,
      forceShowEveryVisit: announcement.forceShowEveryVisit,
      targetAudience: announcement.targetAudience,
      targetRoles: announcement.targetRoles ?? [],
    });
  }

  private parseDate(iso: string): Date | null {
    return parsePhilippinesCalendarDate(iso);
  }

  private buildEffectiveFrom(date: Date | null): string | undefined {
    if (!date || isNaN(date.getTime())) return undefined;
    return formatPhilippinesDateTimeStart(date);
  }

  private buildEffectiveUntil(date: Date | null): string | undefined {
    if (!date || isNaN(date.getTime())) return undefined;
    return formatPhilippinesDateTimeEnd(date);
  }

  onTargetAudienceChange(): void {
    if (this.form.get('targetAudience')?.value === 'all') {
      this.form.patchValue({ targetRoles: [] });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.targetAudience === 'roles' && (!raw.targetRoles?.length)) {
      this.snackBar.open('Select at least one role.', 'Close', { duration: 4000 });
      return;
    }

    const effectiveFrom = this.buildEffectiveFrom(raw.effectiveFromDate);
    if (!effectiveFrom) {
      this.snackBar.open('Effective from date is required.', 'Close', { duration: 4000 });
      return;
    }

    let effectiveUntil: string | undefined;
    if (raw.effectiveUntilDate) {
      effectiveUntil = this.buildEffectiveUntil(raw.effectiveUntilDate);
    }

    const payload = {
      title: raw.title.trim(),
      description: raw.description?.trim() || undefined,
      announcement: raw.announcement,
      effectiveFrom,
      effectiveUntil,
      location: 'home' as const,
      active: raw.active,
      forceShowEveryVisit: raw.forceShowEveryVisit,
      targetAudience: raw.targetAudience as AnnouncementTargetAudience,
      targetRoles: raw.targetAudience === 'roles' ? raw.targetRoles : [],
    };

    this.isSaving = true;
    try {
      const result = this.isEdit && this.data.announcement
        ? await lastValueFrom(this.announcementService.update(this.data.announcement._id, payload))
        : await lastValueFrom(this.announcementService.create(payload));
      this.dialogRef.close(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save announcement.';
      this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    } finally {
      this.isSaving = false;
    }
  }
}
