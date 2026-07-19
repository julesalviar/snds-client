import { AfterViewInit, Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOption, provideNativeDateAdapter } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import {
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  Observable,
  startWith,
  Subject,
  takeUntil,
} from 'rxjs';
import { UserService } from '../../common/services/user.service';
import { SchoolNeedService } from '../../common/services/school-need.service';
import {
  filterContributionOptions,
  normalizeContributionKey,
} from '../../common/utils/contribution-tree.util';
import {
  aipSchoolYearsAsArray,
  getSchoolYear,
  getSchoolYearOptions,
} from '../../common/date-utils';
import { AipService } from '../../common/services/aip.service';
import { Aip } from '../../common/model/aip.model';
import { SchoolNeed, SchoolNeedImage } from '../../common/model/school-need.model';
import { AuthService } from '../../auth/auth.service';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import { PillarConfigService } from '../../common/services/pillar-config.service';
import { PillarItem } from '../../common/model/pillar-config.model';
import { InvalidContributionTypeDialogComponent } from '../invalid-contribution-type-dialog.component';
import { InvalidSpecificContributionDialogComponent } from '../invalid-specific-contribution-dialog.component';
import { DocumentViewerComponent } from '../../stakeholders/document-viewer/document-viewer.component';
import { DivisionSettingsService } from '../../common/services/division-settings.service';
import {
  extractApiErrorMessage,
  isSchoolMutationRole,
} from '../../common/utils/division-lock.util';

export interface SchoolNeedCreateDialogData {
  /** Prefill from an existing need, then submit as POST create (never update). */
  isDuplicate?: boolean;
  sourceNeedCode?: string | number;
}

@Component({
  selector: 'app-school-need-create-dialog',
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatOption,
    MatProgressBarModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './school-need-create-dialog.component.html',
  styleUrl: './school-need-create-dialog.component.css',
})
export class SchoolNeedCreateDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  /**
   * Disables autocomplete panels until after first paint so prefilled fields do not
   * open suggestion lists on dialog open (see MatAutocompleteTrigger._handleFocus).
   */
  autocompleteSuppressed = true;

  schoolNeedsForm: FormGroup;
  private allProjectsData: Aip[] = [];
  projectsData: Aip[] = [];
  isLoadingPpaProjects = true;
  isSaving = false;

  readonly allSchoolYearOptions: string[] = getSchoolYearOptions();

  get schoolYears(): string[] {
    if (!isSchoolMutationRole(this.authService.getActiveRole())) {
      return this.allSchoolYearOptions;
    }
    return this.divisionSettingsService.filterUnlockedSchoolNeedYears(
      this.allSchoolYearOptions,
    );
  }
  units: string[] = [];

  contributionTypes: string[] = [];
  specificContributions: string[] = [];
  filteredContributionTypes: string[] = [];
  filteredSpecificContributions: string[] = [];
  contributionTreeData: any[] = [];
  previousContributionType = '';

  selectedProjectIds: string[] = [];
  pillars: PillarItem[] = [];

  private readonly destroy$ = new Subject<void>();

  get isDuplicate(): boolean {
    return !!this.dialogData?.isDuplicate;
  }

  get dialogTitle(): string {
    return this.isDuplicate ? 'Duplicate School Need' : 'Create School Need';
  }

  constructor(
    private readonly dialogRef: MatDialogRef<SchoolNeedCreateDialogComponent, boolean>,
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly aipService: AipService,
    private readonly authService: AuthService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly pillarConfigService: PillarConfigService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly divisionSettingsService: DivisionSettingsService,
    @Optional() @Inject(MAT_DIALOG_DATA) private readonly dialogData: SchoolNeedCreateDialogData | null,
  ) {
    this.schoolNeedsForm = this.fb.group({
      contributionType: ['', [Validators.required]],
      specificContribution: ['', [Validators.required]],
      schoolYear: [getSchoolYear(), [Validators.required]],
      ppaName: [[], [Validators.required, Validators.minLength(1)]],
      intermediateOutcome: ['', [Validators.required]],
      quantityNeeded: [0, [Validators.required, Validators.min(1)]],
      unit: ['', [Validators.required]],
      estimatedCost: [0, [Validators.required, Validators.min(0)]],
      beneficiaryStudents: [0, [Validators.required, Validators.min(0)]],
      beneficiaryPersonnel: [0, [Validators.required, Validators.min(0)]],
      targetDate: ['', [Validators.required]],
      description: ['', [Validators.maxLength(2000)]],
    });
  }

  ngOnInit(): void {
    void this.bootstrapDialog();

    this.schoolNeedsForm
      .get('schoolYear')!
      .valueChanges.pipe(
        startWith(this.schoolNeedsForm.get('schoolYear')!.value),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.refreshPpaProjectsForFormSchoolYear());
  }

  private async bootstrapDialog(): Promise<void> {
    await this.divisionSettingsService.initializeLocks();
    await this.referenceDataService.initialize();
    this.loadContributionData();
    await this.loadPillarsAndUnits();

    if (this.isDuplicate && this.dialogData?.sourceNeedCode != null) {
      this.loadDuplicatePrefill(this.dialogData.sourceNeedCode);
      return;
    }

    const contribution = this.userService.getContributionSnapshot();
    if (contribution) {
      this.patchContributionFields(
        contribution.name ?? '',
        contribution.specificContribution ?? '',
      );
    }
    this.userService.currentContribution$
      .pipe(
        filter((data) => !!data),
        takeUntil(this.destroy$),
      )
      .subscribe((data) => {
        this.patchContributionFields(data.name ?? '', data.specificContribution ?? '');
      });

    const schoolYear = this.userService.getSchoolYearSnapshot();
    if (schoolYear?.trim()) {
      this.schoolNeedsForm.patchValue({ schoolYear });
    }
    this.userService.schoolYear$.pipe(takeUntil(this.destroy$)).subscribe((sy) => {
      if (sy != null && String(sy).trim() !== '') {
        this.schoolNeedsForm.patchValue({ schoolYear: sy });
      }
    });
    this.loadCurrentProjects();
    this.ensureFormSchoolYearUnlocked();
  }

  private ensureFormSchoolYearUnlocked(): void {
    if (!isSchoolMutationRole(this.authService.getActiveRole())) {
      return;
    }
    const current = this.schoolNeedsForm.get('schoolYear')?.value as
      | string
      | undefined;
    const resolved = this.divisionSettingsService.resolveUnlockedSchoolNeedYear(
      current,
      this.allSchoolYearOptions,
    );
    if (resolved && resolved !== current) {
      this.schoolNeedsForm.patchValue({ schoolYear: resolved });
      this.refreshPpaProjectsForFormSchoolYear();
    }
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.autocompleteSuppressed = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }

  protected openUnitGuide(): void {
    this.dialog.open(DocumentViewerComponent, {
      width: '700px',
      data: {
        title: 'Unit Guide',
        images: [
          { id: 'guide1', originalUrl: 'assets/unitGuide.png', thumbnailUrl: 'assets/unitGuide.png', category: 'guide' },
          { id: 'guide2', originalUrl: 'assets/unitGuide2.png', thumbnailUrl: 'assets/unitGuide2.png', category: 'guide' },
        ],
      },
    });
  }

  async onSubmit(): Promise<void> {
    if (this.schoolNeedsForm.invalid) {
      this.markFormGroupTouched();
      this.showFormValidationErrors();
      return;
    }

    const contributionType = this.schoolNeedsForm.get('contributionType')?.value;
    if (contributionType && !this.validateContributionType(contributionType)) {
      this.showErrorNotification(
        'The contribution type you entered is not available. Please select from the available options.',
      );
      this.showInvalidContributionTypeDialog();
      return;
    }

    const specificContribution = this.schoolNeedsForm.get('specificContribution')?.value;
    if (specificContribution && !this.validateSpecificContribution(specificContribution)) {
      const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;
      const errorMessage = selectedContributionType
        ? `The specific contribution you entered does not belong to "${selectedContributionType}". Please select from the available options.`
        : 'Please select a contribution type first before entering a specific contribution.';
      this.showErrorNotification(errorMessage);
      this.showInvalidSpecificContributionDialog();
      return;
    }

    const schoolYear = this.schoolNeedsForm.get('schoolYear')?.value;
    if (
      isSchoolMutationRole(this.authService.getActiveRole()) &&
      this.divisionSettingsService.isSchoolNeedYearLocked(schoolYear)
    ) {
      this.showErrorNotification(
        `School needs for school year ${schoolYear} are locked. Contact your division office if you need changes.`,
      );
      return;
    }

    this.isSaving = true;
    try {
      const newNeed = this.buildCreatePayload();

      this.schoolNeedService.createSchoolNeed(newNeed).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isSaving = false;
          this.showSuccessNotification(
            this.isDuplicate
              ? 'School need duplicated successfully!'
              : 'School need saved successfully!',
          );
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating school need:', err);
          this.isSaving = false;
          this.showErrorNotification(
            extractApiErrorMessage(
              err,
              'Failed to save school need. Please try again.',
            ),
          );
        },
      });
    } catch (error: any) {
      console.error('Error during form submission:', error);
      this.isSaving = false;
      this.showErrorNotification('An unexpected error occurred. Please try again.');
    }
  }

  /** POST /school-needs only — never includes _id, code, or images from a duplicated source need. */
  private buildCreatePayload(): SchoolNeed {
    return {
      specificContribution: this.schoolNeedsForm.get('specificContribution')?.value,
      contributionType: this.schoolNeedsForm.get('contributionType')?.value,
      projectId: this.selectedProjectIds,
      quantity: this.schoolNeedsForm.get('quantityNeeded')?.value,
      unit: this.schoolNeedsForm.get('unit')?.value,
      estimatedCost: this.schoolNeedsForm.get('estimatedCost')?.value,
      studentBeneficiaries: this.schoolNeedsForm.get('beneficiaryStudents')?.value,
      personnelBeneficiaries: this.schoolNeedsForm.get('beneficiaryPersonnel')?.value,
      description: this.schoolNeedsForm.get('description')?.value,
      schoolId: this.authService.getSchoolId(),
      images: [],
      targetDate: this.schoolNeedsForm.get('targetDate')?.value,
      schoolYear: this.schoolNeedsForm.get('schoolYear')?.value,
    };
  }

  private loadDuplicatePrefill(sourceNeedCode: string | number): void {
    this.isLoadingPpaProjects = true;
    forkJoin({
      projects: this.fetchProjects(),
      need: this.schoolNeedService.getSchoolNeedByCode(String(sourceNeedCode)),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ projects, need }) => {
          this.allProjectsData = projects;
          this.refreshPpaProjectsForFormSchoolYear();
          this.patchFormFromSchoolNeed(need);
          this.isLoadingPpaProjects = false;
        },
        error: (err) => {
          console.error('Error loading school need to duplicate:', err);
          this.isLoadingPpaProjects = false;
          this.showErrorNotification('Failed to load school need. Please try again.');
          this.dialogRef.close(false);
        },
      });
  }

  /** Duplicate prefill: form fields only — source images are never shown or submitted. */
  private patchFormFromSchoolNeed(need: SchoolNeed): void {
    this.selectedProjectIds = need.projectId.map((project) =>
      typeof project === 'object' ? project._id : project,
    );

    const firstProject = need.projectId[0];
    const storedPillars =
      firstProject && typeof firstProject === 'object' ? (firstProject.pillars ?? '') : '';
    const intermediateOutcome =
      this.pillarConfigService.resolveStoredValue(storedPillars);

    this.patchContributionFields(
      need.contributionType ?? '',
      need.specificContribution ?? '',
    );

    this.schoolNeedsForm.patchValue({
      schoolYear: this.divisionSettingsService.resolveUnlockedSchoolNeedYear(
        need.schoolYear,
        this.allSchoolYearOptions,
      ),
      ppaName: this.selectedProjectIds,
      intermediateOutcome,
      quantityNeeded: need.quantity,
      unit: need.unit,
      estimatedCost: need.estimatedCost,
      beneficiaryStudents: need.studentBeneficiaries,
      beneficiaryPersonnel: need.personnelBeneficiaries,
      targetDate: need.targetDate ? new Date(need.targetDate) : '',
      description: need.description ?? '',
    });

    this.refreshPpaProjectsForFormSchoolYear();
  }

  private loadCurrentProjects(): void {
    this.isLoadingPpaProjects = true;
    this.fetchProjects().subscribe({
      next: (projects) => {
        this.allProjectsData = projects;
        this.refreshPpaProjectsForFormSchoolYear();
        this.isLoadingPpaProjects = false;
      },
      error: (err) => {
        console.error('Error fetching projects:', err);
        this.isLoadingPpaProjects = false;
      },
    });
  }

  private aipMatchesFormSchoolYear(aip: Aip, formSchoolYear: string): boolean {
    if (!formSchoolYear?.trim()) return false;
    const years = aipSchoolYearsAsArray(aip.schoolYear);
    return years.includes(formSchoolYear.trim());
  }

  private refreshPpaProjectsForFormSchoolYear(): void {
    const sy = this.schoolNeedsForm.get('schoolYear')?.value as string | undefined;
    if (!sy?.trim()) {
      this.projectsData = [];
    } else {
      this.projectsData = this.allProjectsData.filter((p) => this.aipMatchesFormSchoolYear(p, sy));
    }
    this.pruneSelectedProjectsToCurrentPpaOptions();
  }

  private pruneSelectedProjectsToCurrentPpaOptions(): void {
    const allowed = new Set(this.projectsData.map((p) => p._id));
    const next = this.selectedProjectIds.filter((id) => allowed.has(id));
    if (next.length !== this.selectedProjectIds.length) {
      this.selectedProjectIds = next;
      this.schoolNeedsForm.get('ppaName')?.setValue(this.selectedProjectIds);
    }
  }

  private loadContributionData(): void {
    const treeData = this.referenceDataService.get<any[]>('contributionTree');
    if (treeData) {
      this.contributionTreeData = treeData;
      this.contributionTypes = treeData.map((node) => node.name);
      this.specificContributions = treeData.flatMap((node) =>
        node.children ? node.children.map((child: any) => child.name) : [],
      );
      this.filteredContributionTypes = [...this.contributionTypes];
      this.filteredSpecificContributions = [...this.specificContributions];
    }
  }

  /** Sets contribution fields and autocomplete options without clearing specific contribution. */
  private patchContributionFields(
    contributionType: string,
    specificContribution: string,
  ): void {
    const type = (contributionType ?? '').trim();
    const specific = (specificContribution ?? '').trim();

    this.previousContributionType = type;
    if (type) {
      this.specificContributions = this.getSpecificContributionsForType(type);
    } else {
      this.specificContributions = this.contributionTreeData.flatMap((node) =>
        node.children ? node.children.map((child: any) => child.name) : [],
      );
    }
    this.filteredContributionTypes = [...this.contributionTypes];
    this.filteredSpecificContributions = [...this.specificContributions];

    this.schoolNeedsForm.patchValue({
      contributionType: type,
      specificContribution: specific,
    });
  }

  private async loadPillarsAndUnits(): Promise<void> {
    try {
      await this.pillarConfigService.initialize();
      this.pillars = this.pillarConfigService.getPillars();
    } catch (e) {
      console.error('Failed to load pillar configuration', e);
      this.pillars = [];
    }
    const unitsData = this.referenceDataService.get<string[]>('units');
    if (unitsData) {
      this.units = unitsData;
    }
  }

  private fetchProjects(page = 1, size = 1000): Observable<Aip[]> {
    const schoolId = this.authService.getSchoolId();
    return this.aipService.getAips(page, size, schoolId || undefined).pipe(map((response) => response.data));
  }

  protected filterContributionTypes(value: string): void {
    this.filteredContributionTypes = filterContributionOptions(
      this.contributionTypes,
      value,
    );
  }

  protected filterSpecificContributions(value: string): void {
    const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;
    let available = this.specificContributions;
    if (selectedContributionType) {
      available = this.getSpecificContributionsForType(selectedContributionType);
    }
    this.filteredSpecificContributions = filterContributionOptions(available, value);
  }

  protected onContributionTypeChange(selectedType: string): void {
    if (this.previousContributionType !== selectedType) {
      this.schoolNeedsForm.get('specificContribution')?.setValue('');
    }
    this.previousContributionType = selectedType;
    if (selectedType) {
      this.specificContributions = this.getSpecificContributionsForType(selectedType);
    } else {
      this.specificContributions = this.contributionTreeData.flatMap((node) =>
        node.children ? node.children.map((child: any) => child.name) : [],
      );
    }
    this.filteredSpecificContributions = [...this.specificContributions];
  }

  protected onContributionTypeInput(value: string): void {
    if (!value || value.trim() === '') {
      this.onContributionTypeChange('');
    } else {
      this.previousContributionType = value;
    }
  }

  private findContributionTreeNode(contributionType: string): { name: string; children?: { name: string }[] } | undefined {
    const key = normalizeContributionKey(contributionType);
    return this.contributionTreeData.find(
      (node) => normalizeContributionKey(node.name) === key,
    );
  }

  private getSpecificContributionsForType(contributionType: string): string[] {
    return (
      this.findContributionTreeNode(contributionType)?.children?.map(
        (child: { name: string }) => child.name,
      ) ?? []
    );
  }

  protected addProject(projectId: string): void {
    if (projectId && !this.selectedProjectIds.includes(projectId)) {
      this.selectedProjectIds.push(projectId);
      this.schoolNeedsForm.get('ppaName')?.setValue(this.selectedProjectIds);
      this.schoolNeedsForm.get('ppaName')?.markAsTouched();
    }
  }

  protected removeProject(projectId: string): void {
    const index = this.selectedProjectIds.indexOf(projectId);
    if (index >= 0) {
      this.selectedProjectIds.splice(index, 1);
      this.schoolNeedsForm.get('ppaName')?.setValue(this.selectedProjectIds);
    }
  }

  protected getProjectTitle(projectId: string): string {
    const project =
      this.allProjectsData.find((p) => p._id === projectId) ??
      this.projectsData.find((p) => p._id === projectId);
    return project ? `${project.apn} - ${project.title}` : projectId;
  }

  private validateContributionType(value: string): boolean {
    const key = normalizeContributionKey(value);
    if (this.contributionTypes.some(
      (option) => normalizeContributionKey(option) === key,
    )) {
      return true;
    }
    return this.isDuplicate && key.length > 0;
  }

  private validateSpecificContribution(value: string): boolean {
    const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;
    if (!selectedContributionType) {
      return false;
    }
    const key = normalizeContributionKey(value);
    const allowed = this.getSpecificContributionsForType(selectedContributionType);
    if (allowed.some((option) => normalizeContributionKey(option) === key)) {
      return true;
    }
    // Allow values saved on an existing need when the reference tree changed or labels differ slightly.
    return this.isDuplicate && key.length > 0;
  }

  private showInvalidContributionTypeDialog(): void {
    this.dialog.open(InvalidContributionTypeDialogComponent, {
      width: '400px',
      position: { top: '20vh' },
      data: {
        message: 'The contribution type you entered is not available. Please select from the available options.',
      },
    });
  }

  private showInvalidSpecificContributionDialog(): void {
    const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;
    const message = selectedContributionType
      ? `The specific contribution you entered does not belong to "${selectedContributionType}". Please select from the available options.`
      : 'Please select a contribution type first before entering a specific contribution.';
    this.dialog.open(InvalidSpecificContributionDialogComponent, {
      width: '400px',
      position: { top: '20vh' },
      data: { message },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.schoolNeedsForm.controls).forEach((key) => {
      this.schoolNeedsForm.get(key)?.markAsTouched();
    });
  }

  private showFormValidationErrors(): void {
    let invalidFieldCount = 0;
    Object.keys(this.schoolNeedsForm.controls).forEach((key) => {
      const control = this.schoolNeedsForm.get(key);
      if (control && control.invalid && control.errors) {
        invalidFieldCount++;
      }
    });
    if (invalidFieldCount > 0) {
      const errorMessage =
        invalidFieldCount === 1
          ? 'Invalid data:Please check the form field and try again.'
          : `Invalid data: Please check the ${invalidFieldCount} form fields and try again.`;
      this.showErrorNotification(errorMessage);
    }
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private showErrorNotification(message: string): void {
    const duration = message.includes('\n') ? 8000 : 5000;
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }
}
