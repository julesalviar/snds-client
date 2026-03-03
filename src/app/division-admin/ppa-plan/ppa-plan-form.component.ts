import { Component, OnDestroy, OnInit, ViewChild, ElementRef, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, forkJoin, of, from } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, switchMap, map, catchError } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { UserService } from '../../common/services/user.service';
import { HttpService } from '../../common/services/http.service';
import { API_ENDPOINT } from '../../common/api-endpoints';
import { PpaPlan } from '../../common/model/ppa-plan.model';
import { PLAN_CLASSIFICATION } from '../../common/enums/plan-classification.enum';
import { AuthService } from '../../auth/auth.service';
import { OfficeService } from '../../common/services/office.service';
import { Office } from '../../common/model/office.model';
import { PLAN_IMPLEMENTATION_STATUS } from '../../common/enums/plan-implementation-status.enum';
import { PLAN_PARTICIPANT_OPTIONS } from '../../common/enums/plan-participant.enum';
import { TIMELINESS } from '../../common/enums/timeliness.enum';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { UserListItem } from '../../registration/user.model';

/** Validator: end date must not be before start date. */
function implementationDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const form = control.parent;
  if (!form) return null;
  const start = form.get('implementationStartDate')?.value;
  const end = control.value;
  if (!start || !end) return null;
  const startDate = start instanceof Date ? start : new Date(String(start).substring(0, 10));
  const endDate = end instanceof Date ? end : new Date(String(end).substring(0, 10));
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  if (endDate < startDate) return { endBeforeStart: true };
  return null;
}

@Component({
  selector: 'app-ppa-plan-form',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDatepickerModule,
  ],
  templateUrl: './ppa-plan-form.component.html',
  styleUrl: './ppa-plan-form.component.css',
})
export class PpaPlanFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  planId: string | null = null;
  isEdit = false;
  /** When true, form is pre-filled from an existing plan but submits as create (duplicate). */
  private isDuplicate = false;
  isLoading = true;
  isSaving = false;
  users: UserListItem[] = [];
  filteredUsers: UserListItem[] = [];
  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  readonly classificationOptions = PLAN_CLASSIFICATION;
  readonly implementationStatusOptions = PLAN_IMPLEMENTATION_STATUS;
  readonly timelinessOptions = TIMELINESS;
  fundSourceOptions: string[] = [];
  readonly participantOptions = PLAN_PARTICIPANT_OPTIONS;
  readonly userSearchLimit = 50;
  officeOptionsForSelect: Array<{ value: string; label: string; id: string }> = [];
  get programHolderDisplayName(): string {
    const name = this.authService.getName();
    const username = this.authService.getUsername();
    return name || username || '—';
  }
  @ViewChild('reportFileInput') reportFileInput!: ElementRef<HTMLInputElement>;

  /** Report document upload state */
  reportDocUrl: string | null = null;
  reportDocUrlRemoved = false;
  selectedReportFile: File | null = null;
  isDraggingReport = false;
  isUploadingReport = false;
  reportUploadProgress = 0;

  /** Form control for the "add participant" input (not part of the main form payload). */
  readonly participantInputControl = new FormControl<string>('');
  readonly participantSeparatorKeysCodes = [13, 188] as const; // Enter, Comma
  readonly participantAddOnBlur = true;

  /** Current participants array from the form (unique enum values). */
  get participantsArray(): string[] {
    const val = this.form.get('participants')?.value;
    return Array.isArray(val) ? val : [];
  }

  /** Participant options not yet added (for autocomplete). */
  get availableParticipantOptions(): string[] {
    const current = this.participantsArray;
    const available = this.participantOptions.filter((p) => !current.includes(p)).sort((a, b) => a.localeCompare(b));
    const query = (this.participantInputControl.value ?? '').trim().toLowerCase();
    if (!query) return available;
    return available.filter((p) => p.toLowerCase().includes(query));
  }

  displayParticipantFn = (value: string): string => value ?? '';

  trackByParticipant(_index: number, participant: string): string {
    return participant;
  }

  /** Add participant from chip input (Enter/Comma); only if valid enum and unique. */
  addParticipantFromInput(event: { value: string }): void {
    const value = (event?.value ?? '').trim();
    if (!value) return;
    const matched = this.participantOptions.find((p) => p === value || p.toLowerCase() === value.toLowerCase());
    if (matched && !this.participantsArray.includes(matched)) {
      this.setParticipants([...this.participantsArray, matched]);
      this.participantInputControl.setValue('', { emitEvent: false });
    }
  }

  /** Add participant from autocomplete selection. */
  addParticipantFromSelect(event: { option: { value: string } }): void {
    const value = event?.option?.value ?? '';
    if (!value || this.participantsArray.includes(value)) return;
    this.setParticipants([...this.participantsArray, value]);
    this.participantInputControl.setValue('', { emitEvent: false });
  }

  removeParticipant(participant: string): void {
    this.setParticipants(this.participantsArray.filter((p) => p !== participant));
  }

  private setParticipants(arr: string[]): void {
    this.form.get('participants')?.setValue(arr);
  }

  /** When true, component is used inside a dialog; cancel/close will close the dialog instead of navigating. */
  readonly isDialogMode: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly ppaPlanService: PpaPlanService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly officeService: OfficeService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly httpService: HttpService,
    public readonly classificationDisplay: PlanClassificationDisplayService,
    private readonly snackBar: MatSnackBar,
    @Optional() private readonly dialogRef: MatDialogRef<PpaPlanFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) dialogData?: { planId?: string; initialDate?: Date; isDuplicate?: boolean }
  ) {
    this.isDialogMode = !!this.dialogRef;
    if (this.isDialogMode && dialogData) {
      this.planId = dialogData.planId ?? null;
      this.isDuplicate = !!dialogData.isDuplicate;
      this.isEdit = !!this.planId && !this.isDuplicate;
    }
    this.form = this.fb.group({
      kra: ['', Validators.required],
      title: ['', Validators.required],
      activity: ['', Validators.required],
      objective: ['', Validators.required],
      classification: ['', Validators.required],
      expectedOutput: ['', Validators.required],
      implementationStartDate: [null as Date | string | null],
      implementationEndDate: [null as Date | string | null, [implementationDateRangeValidator]],
      budgetaryRequirement: [null as number | null],
      materialsAndSupplies: [''],
      fundSource: [''],
      participants: [[] as string[]],
      supportNeed: [''],
      supportReceivedValue: [null as number | null],
      stakeholderUserId: [''],
      assignedUserId: [''],
      officeId: [''],
      amountUtilized: [null as number | null],
      implementationStatus: ['', Validators.required],
      timeliness: [''],
      factors: [''],
    });
    if (this.isDialogMode && dialogData?.initialDate && !this.isEdit) {
      this.form.patchValue({ implementationStartDate: dialogData.initialDate, implementationEndDate: dialogData.initialDate });
    }
  }

  ngOnInit(): void {
    if (!this.isDialogMode) {
      this.planId = this.route.snapshot.paramMap.get('id');
      this.isEdit = !!this.planId;
    }
    this.setupStakeholderSearch();
    this.setupImplementationDateValidation();
    this.initializeAssignedUserId();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupImplementationDateValidation(): void {
    const startControl = this.form.get('implementationStartDate');
    const endControl = this.form.get('implementationEndDate');
    startControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      endControl?.updateValueAndValidity();
    });
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

  private initializeAssignedUserId(): void {
    const currentUserId = this.authService.getUserId();
    if (currentUserId) {
      this.form.patchValue({ assignedUserId: currentUserId });
    }
  }

  onStakeholderInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    const raw = this.form.get('stakeholderUserId')?.value;
    const currentId = this.normalizeStakeholderUserId(raw);
    const currentUser = currentId ? this.users.find((u) => u._id === currentId) : null;
    const currentDisplay = currentUser ? this.getStakeholderDisplayName(currentUser) : '';
    if (currentDisplay && value !== currentDisplay) {
      this.form.patchValue({ stakeholderUserId: '' });
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
    if (user && !this.users.some((u) => u._id === id)) {
      this.users = [...this.users, user];
    }
  }

  /** Format Date to YYYY-MM-DD using local timezone (avoids UTC shift). */
  private formatDateForPayload(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Resolve form value (office.code) to office._id for API payload. */
  private resolveOfficeIdForPayload(formValue: string | null | undefined): string | undefined {
    const v = formValue?.trim?.();
    if (!v) return undefined;
    const opt = this.officeOptionsForSelect.find((o) => o.value === v);
    return opt?.id ?? v;
  }

  /** Normalize plan.officeId to office.code for form value. */
  private normalizeOfficeCode(value: string | Office | { _id?: string; code?: string } | null | undefined): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value !== null && 'code' in value) return (value as Office).code ?? '';
    return '';
  }

  private normalizeUserId(value: string | UserListItem | null | undefined): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && '_id' in value) return (value as UserListItem)._id ?? '';
    return '';
  }

  /** Used by mat-autocomplete displayWith; handles both id string and populated user object from API. */
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

  private loadUsers(): void {
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
    const offices$ = this.loadOfficesObservable();
    const refData$ = from(this.internalReferenceDataService.initialize()).pipe(
      map(() => {
        this.fundSourceOptions = [...this.internalReferenceDataService.getFundSources()].sort((a, b) => a.localeCompare(b));
        return true;
      })
    );
    forkJoin({ users: users$, offices: offices$, refData: refData$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if ((this.isEdit || this.isDuplicate) && this.planId) {
            this.loadPlan();
          } else {
            this.isLoading = false;
          }
        },
        error: () => {
          if (!this.isEdit && !this.isDuplicate) this.isLoading = false;
          if ((this.isEdit || this.isDuplicate) && this.planId) this.loadPlan();
        },
      });
  }

  private loadOfficesObservable() {
    let officeIds: string[] = [];
    try {
      officeIds = (this.authService.getOfficeIds() ?? []).filter((id) => id?.trim?.());
    } catch {
      officeIds = [];
    }
    const mapOfficesToOptions = (offices: { _id: string; code?: string; name?: string; division?: string }[]) =>
      offices.map((o) => ({
        value: o.code ?? o._id,
        label: [o.division, o.name].filter(Boolean).join(' - ') || (o.code ?? o._id),
        id: o._id,
      }));

    if (officeIds.length === 0) {
      this.officeOptionsForSelect = [];
      return of(true);
    }

    return forkJoin(
      officeIds.map((id) =>
        this.officeService.getById(id).pipe(catchError(() => of(null as Office | null)))
      )
    ).pipe(
      map((results) => {
        const offices = results.filter((o): o is Office => o != null);
        this.officeOptionsForSelect = mapOfficesToOptions(offices);
        return true;
      }),
      catchError(() => {
        this.officeOptionsForSelect = [];
        return of(true);
      })
    );
  }

  private loadPlan(): void {
    if (!this.planId) return;
    this.ppaPlanService.getById(this.planId).subscribe({
      next: (plan) => {
        const startDate = plan.implementationStartDate ?? '';
        const endDate = plan.implementationEndDate ?? '';
        const stakeholderRaw = plan.stakeholderUserId;
        const stakeholderId = this.normalizeStakeholderUserId(stakeholderRaw);
        if (stakeholderRaw && typeof stakeholderRaw === 'object' && stakeholderRaw !== null && '_id' in stakeholderRaw) {
          const userObj = stakeholderRaw as UserListItem;
          if (!this.users.some((u) => u._id === userObj._id)) {
            this.users = [...this.users, userObj];
            this.filteredUsers = [...this.filteredUsers, userObj];
          }
        }
        const officeCode = this.normalizeOfficeCode(plan.officeId);
        if (officeCode && !this.officeOptionsForSelect.some((o) => o.value === officeCode)) {
          const rawOfficeId = typeof plan.officeId === 'string' ? plan.officeId : (plan.officeId as Office)?._id;
          if (rawOfficeId) {
            this.officeService.getById(rawOfficeId).pipe(
              takeUntil(this.destroy$),
              catchError(() => of(null))
            ).subscribe((office) => {
              if (office) {
                const code = office.code ?? office._id;
                this.officeOptionsForSelect = [
                  ...this.officeOptionsForSelect,
                  { value: code, label: [office.division, office.name].filter(Boolean).join(' - ') || (office.code ?? office._id), id: office._id },
                ];
              }
              this.form.patchValue({ officeId: officeCode || '' });
            });
          } else {
            this.form.patchValue({ officeId: officeCode ?? '' });
          }
        } else {
          this.form.patchValue({ officeId: officeCode ?? '' });
        }
        this.form.patchValue({
          kra: plan.kra,
          title: plan.title,
          activity: plan.activity,
          objective: plan.objective,
          classification: plan.classification,
          expectedOutput: plan.expectedOutput,
          implementationStartDate: startDate ? new Date(startDate) : null,
          implementationEndDate: endDate ? new Date(endDate) : null,
          budgetaryRequirement: plan.budgetaryRequirement ?? null,
          materialsAndSupplies: plan.materialsAndSupplies ?? '',
          fundSource: plan.fundSource ?? '',
          participants: Array.isArray(plan.participants) ? plan.participants : [],
          supportNeed: plan.supportNeed ?? '',
          supportReceivedValue: plan.supportReceivedValue ?? null,
          stakeholderUserId: stakeholderId ?? '',
          assignedUserId: this.authService.getUserId() ?? '',
          amountUtilized: plan.amountUtilized ?? null,
          implementationStatus: plan.implementationStatus ?? '',
          timeliness: plan.timeliness ?? '',
          factors: plan.factors ?? '',
        });
        if (!this.isDuplicate) {
          this.reportDocUrl = Array.isArray(plan.reportUrls) && plan.reportUrls.length > 0 ? plan.reportUrls[0] : null;
          this.reportDocUrlRemoved = false;
        } else {
          this.reportDocUrl = null;
          this.reportDocUrlRemoved = false;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load PPA plan', err);
        this.isLoading = false;
        this.showError(this.getErrorMessage(err, 'Failed to load PPA plan.'));
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving) return;
    const raw = this.form.getRawValue();
    const implStart = raw.implementationStartDate;
    const implEnd = raw.implementationEndDate;
    const implementationStartDate = implStart instanceof Date
      ? this.formatDateForPayload(implStart)
      : (typeof implStart === 'string' ? implStart.trim().substring(0, 10) : '') || '';
    const implementationEndDate = implEnd instanceof Date
      ? this.formatDateForPayload(implEnd)
      : (typeof implEnd === 'string' ? implEnd.trim().substring(0, 10) : '') || '';
    const hasReportFile = !!this.selectedReportFile;

    const buildPayload = (reportUrls: string[]): PpaPlan => ({
      kra: raw.kra,
      title: raw.title,
      activity: raw.activity,
      objective: raw.objective,
      classification: raw.classification,
      expectedOutput: raw.expectedOutput,
      implementationStartDate: implementationStartDate || undefined,
      implementationEndDate: implementationEndDate || undefined,
      budgetaryRequirement: raw.budgetaryRequirement ?? undefined,
      materialsAndSupplies: raw.materialsAndSupplies || undefined,
      fundSource: raw.fundSource || undefined,
      participants: Array.isArray(raw.participants) && raw.participants.length > 0 ? raw.participants : undefined,
      supportNeed: raw.supportNeed || undefined,
      supportReceivedValue: raw.supportReceivedValue ?? undefined,
      stakeholderUserId: this.normalizeStakeholderUserId(raw.stakeholderUserId),
      assignedUserId: this.authService.getUserId() || undefined,
      officeId: this.resolveOfficeIdForPayload(raw.officeId) || undefined,
      amountUtilized: raw.amountUtilized ?? undefined,
      implementationStatus: raw.implementationStatus,
      timeliness: raw.timeliness || undefined,
      factors: raw.factors || undefined,
      reportUrls: reportUrls.length > 0 ? reportUrls : undefined,
    });

    this.isSaving = true;

    const uploadThenSave = hasReportFile
      ? this.uploadReportDocAndGetUrl().pipe(
          switchMap((url) => {
            const reportUrls = url ? [url] : this.reportDocUrlRemoved ? [] : (this.reportDocUrl ? [this.reportDocUrl] : []);
            return this.savePlan(buildPayload(reportUrls));
          })
        )
      : this.savePlan(buildPayload(this.getReportUrlsForPayload()));

    uploadThenSave.subscribe({
      next: () => {
        if (hasReportFile && this.selectedReportFile) {
          this.selectedReportFile = null;
          if (this.reportFileInput?.nativeElement) {
            this.reportFileInput.nativeElement.value = '';
          }
        }
        if (hasReportFile) this.reportDocUrlRemoved = false;
        this.showSuccess(this.isEdit ? 'PPA plan updated successfully.' : 'PPA plan created successfully.');
        if (this.isDialogMode && this.dialogRef) {
          this.dialogRef.close(true);
        } else {
          this.router.navigate(['/division-admin', 'ppa-plan']);
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.isUploadingReport = false;
        this.reportUploadProgress = 0;
        this.showError(this.getErrorMessage(err, this.isEdit ? 'Failed to update PPA plan.' : 'Failed to create PPA plan.'));
      },
    });
  }

  private getReportUrlsForPayload(): string[] {
    if (this.reportDocUrlRemoved) return [];
    return this.reportDocUrl ? [this.reportDocUrl] : [];
  }

  private savePlan(payload: PpaPlan) {
    if (this.isEdit && this.planId) {
      return this.ppaPlanService.update(this.planId, payload);
    }
    return this.ppaPlanService.create(payload);
  }

  private uploadReportDocAndGetUrl() {
    if (!this.selectedReportFile) return of(null);
    this.isUploadingReport = true;
    this.reportUploadProgress = 0;
    const formData = new FormData();
    formData.append('file', this.selectedReportFile);
    formData.append('category', 'ppa-report');
    if (this.planId) formData.append('planId', this.planId);

    return this.httpService.uploadFile<{ url?: string; data?: { url?: string }; originalUrl?: string }>(
      `${API_ENDPOINT.upload}/document`,
      formData
    ).pipe(
      switchMap((response) => {
        this.isUploadingReport = false;
        this.reportUploadProgress = 100;
        const url = response?.url ?? response?.data?.url ?? response?.originalUrl;
        if (url) this.reportDocUrl = url;
        return of(url ?? null);
      })
    );
  }

  onReportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleReportFileSelection(input.files[0]);
  }

  onReportDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingReport = true;
  }

  onReportDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingReport = false;
  }

  onReportDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingReport = false;
    const files = event.dataTransfer?.files;
    if (files?.length) this.handleReportFileSelection(files[0]);
  }

  onReportFileInputClick(): void {
    this.reportFileInput?.nativeElement?.click();
  }

  private handleReportFileSelection(file: File): void {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      this.showError('Invalid file type. Please select a PDF, DOC, or DOCX file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.showError('File size exceeds 10MB limit. Please select a smaller file.');
      return;
    }
    this.selectedReportFile = file;
  }

  removeReportFile(): void {
    this.selectedReportFile = null;
    if (this.reportFileInput?.nativeElement) this.reportFileInput.nativeElement.value = '';
  }

  onDownloadReportDoc(): void {
    if (this.reportDocUrl) window.open(this.reportDocUrl, '_blank');
  }

  onRemoveReportDoc(): void {
    this.reportDocUrlRemoved = true;
    this.reportDocUrl = null;
    this.selectedReportFile = null;
    if (this.reportFileInput?.nativeElement) this.reportFileInput.nativeElement.value = '';
  }

  onCancel(): void {
    if (this.isDialogMode && this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/division-admin', 'ppa-plan']);
    }
  }

  getUserDisplay(user: UserListItem): string {
    const name = user.name || user.userName || user.email || user._id || '—';
    return user.email ? `${name} (${user.email})` : name;
  }

  /** Display name only for stakeholder (no email). */
  getStakeholderDisplayName(user: UserListItem): string {
    return user.name || user.userName || user.email || user._id || '—';
  }

  /** Normalize API value: return id string whether userId is a string or populated object. */
  private normalizeStakeholderUserId(value: string | UserListItem | null | undefined): string {
    return this.normalizeUserId(value);
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
