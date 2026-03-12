import { Component, OnDestroy, OnInit, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, map, catchError } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ActivityService } from '../../common/services/activity.service';
import { UserService } from '../../common/services/user.service';
import { AuthService } from '../../auth/auth.service';
import { Activity } from '../../common/model/activity.model';
import { UserListItem } from '../../registration/user.model';
import { ActivityType, getActivityTypeLabel } from '../../common/enums/activity-type.enum';

@Component({
    selector: 'app-activity-form',
    providers: [provideNativeDateAdapter()],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatCardModule,
        MatProgressBarModule,
        MatIconModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatDialogModule,
        MatDatepickerModule,
        MatTimepickerModule,
        MatCheckboxModule,
        MatSelectModule,
    ],
    templateUrl: './activity-form.component.html',
    styleUrl: './activity-form.component.css'
})
export class ActivityFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  activityId: string | null = null;
  isEdit = false;
  isLoading = true;
  private loadedSchoolId: string | undefined;
  private readonly dialogSchoolId: string | undefined;
  isSaving = false;
  users: UserListItem[] = [];
  filteredUsers: UserListItem[] = [];
  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  readonly userSearchLimit = 50;

  readonly activityTypes = Object.values(ActivityType);
  readonly getActivityTypeLabel = getActivityTypeLabel;

  get missingRequiredFields(): string[] {
    const fields: string[] = [];
    const checks: { control: string; label: string; error: string; when?: () => boolean }[] = [
      { control: 'type', label: 'Type', error: 'required' },
      { control: 'title', label: 'Title', error: 'required' },
      { control: 'stakeholderId', label: 'Stakeholder', error: 'required', when: () => this.form.get('type')?.value === ActivityType.PartnershipEngagement },
      { control: 'startDate', label: 'Date', error: 'required' },
    ];
    for (const { control, label, error, when } of checks) {
      if (when && !when()) continue;
      const ctrl = this.form.get(control);
      if (ctrl?.invalid && ctrl?.hasError(error)) {
        fields.push(label);
      }
    }
    return fields;
  }

  readonly isDialogMode: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly activityService: ActivityService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    @Optional() private readonly dialogRef: MatDialogRef<ActivityFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) dialogData?: { activityId?: string; schoolId?: string }
  ) {
    this.isDialogMode = !!this.dialogRef;
    this.dialogSchoolId = dialogData?.schoolId;
    if (this.isDialogMode && dialogData) {
      this.activityId = dialogData.activityId ?? null;
      this.isEdit = !!this.activityId;
    }
    this.form = this.fb.group({
      type: [ActivityType.PartnershipEngagement, Validators.required],
      title: ['', Validators.required],
      description: [''],
      hasEndDate: [false],
      startDate: [null as Date | null, Validators.required],
      endDate: [null as Date | null],
      hasTime: [false],
      hasTimeRange: [false],
      startTimeValue: [null as Date | null],
      endTimeValue: [null as Date | null],
      location: [''],
      stakeholderId: [''],
    });
  }

  ngOnInit(): void {
    if (!this.isDialogMode) {
      this.activityId = this.route.snapshot.paramMap.get('id');
      this.isEdit = !!this.activityId;
    }
    this.setupStakeholderSearch();
    this.setupStakeholderValidation();
    this.setupDateAndTimeOrderValidation();
    this.setupTimeDefaults();
    this.loadInitialData();
  }

  private setupTimeDefaults(): void {
    this.form.get('hasTime')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((hasTime) => {
      if (hasTime) {
        const startTime = this.form.get('startTimeValue')?.value;
        if (!startTime) {
          this.form.patchValue({ startTimeValue: new Date(1970, 0, 1, 9, 0) });
        }
      }
    });
    this.form.get('hasTimeRange')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((hasRange) => {
      if (hasRange) {
        const endTime = this.form.get('endTimeValue')?.value;
        if (!endTime) {
          const startTime = this.form.get('startTimeValue')?.value as Date | null;
          const base = startTime && !isNaN(startTime.getTime()) ? startTime : new Date(1970, 0, 1, 9, 0);
          this.form.patchValue({ endTimeValue: new Date(1970, 0, 1, base.getHours(), base.getMinutes()) });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDateAndTimeOrderValidation(): void {
    const dateOrderValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
      if (!this.form.get('hasEndDate')?.value) return null;
      const start = this.form.get('startDate')?.value;
      const end = control.value;
      if (!start || !end) return null;
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return endDay >= startDay ? null : { dateOrder: true };
    };
    const timeOrderValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
      if (!this.form.get('hasTime')?.value || !this.form.get('hasTimeRange')?.value) return null;
      const start = this.form.get('startTimeValue')?.value;
      const end = control.value;
      if (!start || !end) return null;
      const startMins = start.getHours() * 60 + start.getMinutes();
      const endMins = end.getHours() * 60 + end.getMinutes();
      return endMins >= startMins ? null : { timeOrder: true };
    };

    this.form.get('endDate')?.setValidators([dateOrderValidator]);
    this.form.get('endTimeValue')?.setValidators([timeOrderValidator]);

    const triggerDateValidation = () => this.form.get('endDate')?.updateValueAndValidity({ emitEvent: false });
    const triggerTimeValidation = () => this.form.get('endTimeValue')?.updateValueAndValidity({ emitEvent: false });

    this.form.get('startDate')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(triggerDateValidation);
    this.form.get('endDate')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(triggerDateValidation);
    this.form.get('hasEndDate')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(triggerDateValidation);

    this.form.get('startTimeValue')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(triggerTimeValidation);
    this.form.get('endTimeValue')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(triggerTimeValidation);
    this.form.get('hasTime')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(triggerTimeValidation);
    this.form.get('hasTimeRange')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(triggerTimeValidation);
  }

  private setupStakeholderValidation(): void {
    this.form.get('type')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((type) => {
      const stakeholderCtrl = this.form.get('stakeholderId');
      if (type === ActivityType.PartnershipEngagement) {
        stakeholderCtrl?.setValidators(Validators.required);
      } else {
        stakeholderCtrl?.clearValidators();
      }
      stakeholderCtrl?.updateValueAndValidity({ emitEvent: false });
    });
    // Apply initial validation based on current type
    const type = this.form.get('type')?.value;
    if (type === ActivityType.PartnershipEngagement) {
      this.form.get('stakeholderId')?.setValidators(Validators.required);
    }
  }

  private setupStakeholderSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => this.performStakeholderSearch(term));
  }

  onStakeholderInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    const raw = this.form.get('stakeholderId')?.value;
    const currentId = this.normalizeUserId(raw);
    const currentUser = currentId ? this.users.find((u) => u._id === currentId) : null;
    const currentDisplay = currentUser ? this.getStakeholderDisplayName(currentUser) : '';
    if (currentDisplay && value !== currentDisplay) {
      this.form.patchValue({ stakeholderId: '' });
    }
    this.searchSubject.next(value.trim());
  }

  private performStakeholderSearch(searchTerm: string): void {
    if (searchTerm.length > 0) {
      this.userService
        .getUsers({ page: 1, limit: this.userSearchLimit, search: searchTerm })
        .subscribe({
          next: (res) => {
            this.filteredUsers = res.data ?? [];
          },
          error: () => {
            this.filteredUsers = [];
          },
        });
    } else {
      this.filteredUsers = [...this.users];
    }
  }

  onStakeholderOptionSelected(id: string): void {
    const user = this.filteredUsers.find((u) => u._id === id);
    if (user) {
      if (!this.users.some((u) => u._id === id)) {
        this.users = [...this.users, user];
      }
      this.form.patchValue({ stakeholderId: id });
    }
  }

  displayStakeholderFn = (value: string | UserListItem): string => {
    if (value == null) return '';
    if (typeof value === 'object' && value !== null && '_id' in value) {
      return this.getStakeholderDisplayName(value as UserListItem);
    }
    const id = typeof value === 'string' ? value : '';
    if (!id) return '';
    const user = this.users.find((u) => u._id === id);
    return user ? this.getStakeholderDisplayName(user) : id;
  };

  getStakeholderDisplayName(user: UserListItem): string {
    return user.name || user.userName || user.email || user._id || '—';
  }

  /** Normalize API type (e.g. snake_case) to ActivityType enum value. */
  private normalizeActivityType(value: string | undefined): ActivityType {
    if (!value) return ActivityType.PartnershipEngagement;
    const key = value.toLowerCase().replace(/_/g, '');
    if (key === 'partnershipengagement') return ActivityType.PartnershipEngagement;
    if (key === 'other') return ActivityType.Other;
    return Object.values(ActivityType).includes(value as ActivityType) ? (value as ActivityType) : ActivityType.PartnershipEngagement;
  }

  private normalizeUserId(value: string | UserListItem | null | undefined): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && '_id' in value) return (value as UserListItem)._id ?? '';
    return '';
  }

  private resolveSchoolId(): string | null {
    if (this.isEdit && this.loadedSchoolId) return this.loadedSchoolId;
    return (this.dialogSchoolId || this.authService.getSchoolId() || '').trim() || null;
  }

  private loadInitialData(): void {
    const users$ = this.userService.getUsers({ page: 1, limit: 500 }).pipe(
      map((res) => {
        this.users = res.data ?? [];
        this.filteredUsers = [...this.users];
        return this.users;
      }),
      catchError(() => {
        this.users = [];
        this.filteredUsers = [];
        return of([]);
      })
    );

    if (this.isEdit && this.activityId) {
      forkJoin({
        users: users$,
        activity: this.activityService.getById(this.activityId),
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: ({ activity }) => {
            this.populateFormFromActivity(activity);
            this.isLoading = false;
          },
          error: (err) => {
            this.showError(this.getErrorMessage(err, 'Failed to load activity.'));
            this.loadActivity();
          },
        });
    } else {
      users$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
    }
  }

  private loadActivity(): void {
    if (!this.activityId) return;
    this.activityService.getById(this.activityId).subscribe({
      next: (activity) => {
        this.populateFormFromActivity(activity);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load activity', err);
        this.isLoading = false;
        this.showError(this.getErrorMessage(err, 'Failed to load activity.'));
      },
    });
  }

  private populateFormFromActivity(activity: Activity): void {
    const stakeholderRaw = activity.stakeholderId;
    const stakeholderId = this.normalizeUserId(stakeholderRaw);
    if (stakeholderRaw && typeof stakeholderRaw === 'object' && '_id' in stakeholderRaw) {
      const userObj = stakeholderRaw as UserListItem;
      if (!this.users.some((u) => u._id === userObj._id)) {
        this.users = [...this.users, userObj];
        this.filteredUsers = [...this.filteredUsers, userObj];
      }
    }
    const startVal = activity.startDatetime ?? '';
    const endVal = activity.endDatetime ?? '';
    const startEndSame = startVal && endVal && new Date(startVal).getTime() === new Date(endVal).getTime();
    const hasEndDate = !!endVal && !startEndSame;
    const effectiveEndVal = hasEndDate ? endVal : '';
    const hasTime = activity.hasTime ?? false;
    const { startDate, endDate, startTimeValue, endTimeValue, hasTimeRange } = this.parseDatetimes(startVal, effectiveEndVal, hasTime);
    const normalizedType = this.normalizeActivityType(activity.type);
    this.form.patchValue({
      type: normalizedType,
      title: activity.title,
      description: activity.description ?? '',
      hasEndDate,
      startDate,
      endDate,
      hasTime,
      hasTimeRange,
      startTimeValue,
      endTimeValue,
      location: activity.location ?? '',
      stakeholderId: stakeholderId ?? '',
    });
  }

  private formatDateForPayload(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDateWithMidnight(d: Date): string {
    return `${this.formatDateForPayload(d)}T00:00:00`;
  }

  private toIsoDatetime(date: Date, timeValue: Date | null): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = timeValue ? timeValue.getHours() : 0;
    const min = timeValue ? timeValue.getMinutes() : 0;
    const hh = String(h).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:00`;
  }

  /** Parse ISO datetime strings into date and time parts. */
  private parseDatetimes(
    startVal: string,
    endVal: string,
    hasTime: boolean
  ): { startDate: Date | null; endDate: Date | null; startTimeValue: Date | null; endTimeValue: Date | null; hasTimeRange: boolean } {
    const toDateOnly = (s: string): Date => {
      const d = new Date(s);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const toTimeDate = (s: string): Date => {
      const d = new Date(s);
      return new Date(1970, 0, 1, d.getHours(), d.getMinutes());
    };
    const startDate = startVal ? toDateOnly(startVal) : null;
    const endDate = endVal ? toDateOnly(endVal) : null;
    let startTimeValue: Date | null = null;
    let endTimeValue: Date | null = null;
    let hasTimeRange = false;
    if (hasTime && startVal) {
      startTimeValue = toTimeDate(startVal);
      if (endVal) {
        const startTimeStr = `${String(new Date(startVal).getHours()).padStart(2, '0')}:${String(new Date(startVal).getMinutes()).padStart(2, '0')}`;
        const endTimeStr = `${String(new Date(endVal).getHours()).padStart(2, '0')}:${String(new Date(endVal).getMinutes()).padStart(2, '0')}`;
        hasTimeRange = startTimeStr !== endTimeStr || startVal !== endVal;
        endTimeValue = hasTimeRange ? toTimeDate(endVal) : null;
      }
    }
    return { startDate, endDate, startTimeValue, endTimeValue, hasTimeRange };
  }

  /** Build ISO 8601 datetime from date + time. */
  private buildDatetime(date: Date | null, timeValue: Date | null): string | undefined {
    if (!date || isNaN(date.getTime())) return undefined;
    if (!timeValue || isNaN(timeValue.getTime())) {
      return this.formatDateWithMidnight(date);
    }
    return this.toIsoDatetime(date, timeValue);
  }

  /** Build end datetime in ISO 8601; when !hasTimeRange, use start time. */
  private buildEndDatetime(endDate: Date | null, startTimeValue: Date | null, endTimeValue: Date | null, hasTimeRange: boolean): string | undefined {
    if (!endDate || isNaN(endDate.getTime())) return undefined;
    const timeSource = !hasTimeRange ? startTimeValue : endTimeValue;
    if (!timeSource || isNaN(timeSource.getTime())) {
      return this.formatDateWithMidnight(endDate);
    }
    return this.toIsoDatetime(endDate, timeSource);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving) return;
    const schoolId = this.resolveSchoolId();
    if (!schoolId) {
      this.showError('School is required. Please ensure you are in a school context.');
      return;
    }
    const raw = this.form.getRawValue();
    const hasTime = !!raw.hasTime;
    const hasTimeRange = hasTime && !!raw.hasTimeRange;

    const startDatetime = hasTime
      ? this.buildDatetime(raw.startDate, raw.startTimeValue)
      : (raw.startDate ? this.formatDateWithMidnight(raw.startDate) : undefined);
    const endDatetime = raw.hasEndDate
      ? hasTime
        ? this.buildEndDatetime(raw.endDate, raw.startTimeValue, raw.endTimeValue, hasTimeRange)
        : (raw.endDate ? this.formatDateWithMidnight(raw.endDate) : undefined)
      : hasTime && hasTimeRange && raw.endTimeValue
        ? this.buildDatetime(raw.startDate, raw.endTimeValue)
        : startDatetime;

    const payload: Partial<Activity> = {
      type: raw.type,
      title: raw.title,
      description: raw.description || undefined,
      hasTime,
      startDatetime,
      endDatetime,
      location: raw.location || undefined,
      stakeholderId: this.normalizeUserId(raw.stakeholderId) || undefined,
      schoolId,
      updatedBy: this.authService.getUserId() || undefined,
    };

    this.isSaving = true;

    const save$ = this.isEdit && this.activityId
      ? this.activityService.update(this.activityId, payload)
      : this.activityService.create({ ...payload, createdBy: this.authService.getUserId() });

    save$.subscribe({
      next: () => {
        this.showSuccess(this.isEdit ? 'Activity updated successfully.' : 'Activity created successfully.');
        if (this.isDialogMode && this.dialogRef) {
          this.dialogRef.close(true);
        } else {
          this.router.navigate(['..'], { relativeTo: this.route });
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.showError(this.getErrorMessage(err, this.isEdit ? 'Failed to update activity.' : 'Failed to create activity.'));
      },
    });
  }

  onCancel(): void {
    if (this.isDialogMode && this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['..'], { relativeTo: this.route });
    }
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (err?.error?.message) {
      if (Array.isArray(err.error.message)) return err.error.message.join('\n• ') || fallback;
      if (typeof err.error.message === 'string') return err.error.message;
    }
    if (err?.error && typeof err.error === 'string') return err.error;
    if (err?.message && typeof err.message === 'string') return err.message;
    return fallback;
  }
}
