import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOption, provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, forkJoin, lastValueFrom, map, Observable, startWith, Subject, takeUntil } from "rxjs";
import { SchoolNeedService } from "../../common/services/school-need.service";
import { aipSchoolYearsAsArray, getSchoolYear, getSchoolYearOptions } from "../../common/date-utils";
import { AipService } from "../../common/services/aip.service";
import { Aip } from "../../common/model/aip.model";
import { SchoolNeed, SchoolNeedImage, SchoolInfo } from "../../common/model/school-need.model";
import { AuthService } from "../../auth/auth.service";
import { MatProgressBar } from "@angular/material/progress-bar";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { HttpService } from "../../common/services/http.service";
import { API_ENDPOINT } from "../../common/api-endpoints";
import { ReferenceDataService } from "../../common/services/reference-data.service";
import { PillarConfigService } from "../../common/services/pillar-config.service";
import { PillarItem } from "../../common/model/pillar-config.model";
import {MatChipsModule} from '@angular/material/chips';
import { DivisionSettingsService } from '../../common/services/division-settings.service';
import {
  extractApiErrorMessage,
  isSchoolMutationRole,
} from '../../common/utils/division-lock.util';

@Component({
  selector: 'app-school-need',
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatOption,
    CommonModule,
    MatCardTitle,
    MatIcon,
    MatProgressBar,
    MatChipsModule,
    MatDialogModule,
  ],
  templateUrl: './school-need.component.html',
  styleUrl: './school-need.component.css',
})
export class SchoolNeedComponent implements OnInit, OnDestroy {
  /** When opened via MatDialog, need code comes from MAT_DIALOG_DATA. */
  get isDialog(): boolean {
    return this.dialogRef != null;
  }

  schoolNeedsForm: FormGroup;
  schoolNeed: SchoolNeed | null = null;
  allProjectsData: Aip[] = [];
  projectsData: Aip[] = [];
  schoolName: string = '';
  private readonly destroy$ = new Subject<void>();

  aipProjects: string[] = [];
  pillars: PillarItem[] = [];
  units: string[] = []
  isOtherSelected = false;
  isSaving: boolean = false;
  isLoading: boolean = true;
  schoolNeedLocksLoaded = false;

  contributionTypes: string[] = [];
  specificContributions: string[] = [];
  filteredContributionTypes: string[] = [];
  filteredSpecificContributions: string[] = [];
  contributionTreeData: any[] = [];
  previousContributionType: string = '';

  selectedProjectIds: string[] = [];
  schoolYearOptions: string[] = getSchoolYearOptions();

  private otherUnitValidator(control: AbstractControl): ValidationErrors | null {
    const unit = this.schoolNeedsForm?.get('unit')?.value;
    if (unit === 'Others (pls. specify)' && (!control.value || control.value.trim() === '')) {
      return { required: true };
    }
    return null;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly aipService: AipService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly pillarConfigService: PillarConfigService,
    private readonly snackBar: MatSnackBar,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    @Optional() private readonly dialogRef: MatDialogRef<SchoolNeedComponent, boolean> | null,
    @Optional() @Inject(MAT_DIALOG_DATA) public readonly dialogData: { needCode?: string } | null,
    private readonly divisionSettingsService: DivisionSettingsService,
  ) {
    this.schoolNeedsForm = this.fb.group({
      contributionType: ['', [Validators.required]],
      specificContribution: ['', [Validators.required]],
      schoolYear: [getSchoolYear(), [Validators.required]],
      projectName: [[], [Validators.required, Validators.minLength(1)]],
      intermediateOutcome: [''], // Readonly field, populated from project.pillars
      quantityNeeded: [ 0, [Validators.required, Validators.min(1)]],
      unit: ['', [Validators.required]],
      otherUnit: ['', [this.otherUnitValidator.bind(this)]],
      estimatedCost: [ 0,[Validators.required, Validators.min(0)]],
      beneficiaryStudents: [0, [Validators.required, Validators.min(0)]],
      beneficiaryPersonnel: [0, [Validators.required, Validators.min(0)]],
      targetDate: ['', [Validators.required]],
      description: ['', [Validators.maxLength(2000)]],
    });
  }

  ngOnInit(): void {
    void this.divisionSettingsService.initializeLocks().then(() => {
      this.schoolNeedLocksLoaded = true;
    });
    this.loadContributionData();
    this.loadCurrentProjects();
    void this.loadPillarsAndUnits();
    this.schoolNeedsForm
      .get('schoolYear')!
      .valueChanges.pipe(
        startWith(this.schoolNeedsForm.get('schoolYear')!.value),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.refreshProjectsForFormSchoolYear());

    const needCode = this.dialogData?.needCode ?? this.route.snapshot.paramMap.get('code');
    console.log('School need code:', needCode);
    if (needCode) {
      this.loadSchoolNeed(needCode);
    } else {
      this.showErrorNotification('School need code not provided');
      if (this.dialogRef) {
        this.dialogRef.close(false);
      } else {
        this.router.navigate(['/school-admin/list-of-school-needs']);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isSchoolNeedFormLocked(): boolean {
    if (!isSchoolMutationRole(this.authService.getActiveRole()) || !this.schoolNeedLocksLoaded) {
      return false;
    }
    const year = this.schoolNeedsForm.get('schoolYear')?.value;
    return this.divisionSettingsService.isSchoolNeedYearLocked(year);
  }

  get schoolNeedLockBanner(): string | null {
    if (!this.isSchoolNeedFormLocked) {
      return null;
    }
    const year = this.schoolNeedsForm.get('schoolYear')?.value;
    return `School needs for school year ${year} are locked. Contact your division office if you need changes.`;
  }

  async onSubmit(): Promise<void> {
    if (this.schoolNeedsForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.isSchoolNeedFormLocked) {
      this.showErrorNotification(
        this.schoolNeedLockBanner ?? 'This school need cannot be updated while locked.',
      );
      return;
    }

    this.isSaving = true;

    try {
      const updatedNeed: any = {
          ...this.schoolNeed!,
          specificContribution: this.schoolNeedsForm.get('specificContribution')?.value,
          contributionType: this.schoolNeedsForm.get('contributionType')?.value,
          projectId: this.selectedProjectIds,
          schoolId: this.resolveSchoolIdFromNeed(this.schoolNeed),
          quantity: this.schoolNeedsForm.get('quantityNeeded')?.value,
          unit: this.schoolNeedsForm.get('unit')?.value,
          estimatedCost: this.schoolNeedsForm.get('estimatedCost')?.value,
          studentBeneficiaries: this.schoolNeedsForm.get('beneficiaryStudents')?.value,
          personnelBeneficiaries: this.schoolNeedsForm.get('beneficiaryPersonnel')?.value,
          description: this.schoolNeedsForm.get('description')?.value,
          targetDate: this.schoolNeedsForm.get('targetDate')?.value,
          schoolYear: this.schoolNeedsForm.get('schoolYear')?.value,
          images: this.schoolNeed!.images,
        };

        this.schoolNeedService.updateSchoolNeed(this.schoolNeed!._id!, updatedNeed).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.isSaving = false;
            this.showSuccessNotification('School need updated successfully!');
            if (this.dialogRef) {
              this.dialogRef.close(true);
            } else {
              this.router.navigate(['/school-admin/list-of-school-needs']);
            }
          },
          error: (err) => {
            console.error('Error updating school need:', err);
            this.isSaving = false;
            this.showErrorNotification(
              extractApiErrorMessage(
                err,
                'Failed to update school need. Please try again.',
              ),
            );
          }
        });
    } catch (error) {
      console.error('Error during form submission:', error);
      this.isSaving = false;
      this.showErrorNotification('An unexpected error occurred. Please try again.');
    }
  }

  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
      return;
    }
    this.router.navigate(['/school-admin/list-of-school-needs']);
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showErrorNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  /** API returns populated school as `school`; create/update expect `schoolId` string. */
  private resolveSchoolIdFromNeed(need: SchoolNeed | null): string {
    const raw = need?.schoolId ?? need?.school;
    if (!raw) {
      return this.authService.getSchoolId();
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return trimmed || this.authService.getSchoolId();
    }
    const id = (raw as SchoolInfo)._id;
    const trimmed = id != null ? String(id).trim() : '';
    return trimmed || this.authService.getSchoolId();
  }

  private loadSchoolNeed(needCode: string): void {
    this.schoolNeedService.getSchoolNeedByCode(needCode).pipe(takeUntil(this.destroy$)).subscribe({
      next: (need) => {
        console.log('Received school need data:', need);
        this.schoolNeed = need;
        this.populateForm();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching school need:', err);
        this.showErrorNotification('Failed to load school need');
        if (this.dialogRef) {
          this.dialogRef.close(false);
        } else {
          this.router.navigate(['/school-admin/list-of-school-needs']);
        }
      }
    });
  }

  private populateForm(): void {
    if (!this.schoolNeed) {
      console.log('No school need data to populate form');
      return;
    }

    console.log('Populating form with school need:', this.schoolNeed);

    // Extract project IDs from the array
    this.selectedProjectIds = this.schoolNeed.projectId.map(project =>
      typeof project === 'object' ? project._id : project
    );

    // Get intermediate outcome from first project (if available)
    const firstProject = this.schoolNeed.projectId[0];
    const storedPillars =
      firstProject && typeof firstProject === 'object' ? firstProject.pillars : '';
    const intermediateOutcome = this.pillarConfigService.getDisplayLabel(storedPillars);

    const contributionType = this.schoolNeed.contributionType ?? '';
    this.previousContributionType = contributionType;
    if (contributionType) {
      this.specificContributions = this.getSpecificContributionsForType(contributionType);
    } else {
      this.specificContributions = this.contributionTreeData.flatMap((node) =>
        node.children ? node.children.map((child: any) => child.name) : [],
      );
    }
    this.filteredContributionTypes = [...this.contributionTypes];
    this.filteredSpecificContributions = [...this.specificContributions];

    this.schoolNeedsForm.patchValue({
      contributionType: this.schoolNeed.contributionType,
      specificContribution: this.schoolNeed.specificContribution,
      schoolYear: this.schoolNeed.schoolYear ?? getSchoolYear(),
      projectName: this.selectedProjectIds,
      intermediateOutcome: intermediateOutcome,
      quantityNeeded: this.schoolNeed.quantity,
      unit: this.schoolNeed.unit,
      otherUnit: this.schoolNeed.unit === 'Others (pls. specify)' ? this.schoolNeed.unit : '',
      estimatedCost: this.schoolNeed.estimatedCost,
      beneficiaryStudents: this.schoolNeed.studentBeneficiaries,
      beneficiaryPersonnel: this.schoolNeed.personnelBeneficiaries,
      targetDate: this.schoolNeed.targetDate ? new Date(this.schoolNeed.targetDate) : '',
      description: this.schoolNeed.description,
    });

    this.isOtherSelected = this.schoolNeed.unit === 'Others (pls. specify)';
    this.schoolNeedsForm.get('otherUnit')?.updateValueAndValidity();
    this.refreshProjectsForFormSchoolYear();

    console.log('Form populated successfully. Form value:', this.schoolNeedsForm.value);
  }

  private aipMatchesFormSchoolYear(aip: Aip, formSchoolYear: string): boolean {
    if (!formSchoolYear?.trim()) return false;
    const years = aipSchoolYearsAsArray(aip.schoolYear);
    return years.includes(formSchoolYear.trim());
  }

  private refreshProjectsForFormSchoolYear(): void {
    const sy = this.schoolNeedsForm.get('schoolYear')?.value as string | undefined;
    if (!sy?.trim()) {
      this.projectsData = [];
    } else {
      this.projectsData = this.allProjectsData.filter((p) =>
        this.aipMatchesFormSchoolYear(p, sy),
      );
    }
    this.pruneSelectedProjectsToCurrentOptions();
  }

  private pruneSelectedProjectsToCurrentOptions(): void {
    const allowed = new Set(this.projectsData.map((p) => p._id));
    const next = this.selectedProjectIds.filter((id) => allowed.has(id));
    if (next.length !== this.selectedProjectIds.length) {
      this.selectedProjectIds = next;
      this.schoolNeedsForm.get('projectName')?.setValue(this.selectedProjectIds);
    }
  }

  private loadCurrentProjects(): void {
    this.fetchProjects().subscribe({
      next: (projects) => {
        this.allProjectsData = projects;
        this.refreshProjectsForFormSchoolYear();
      },
      error: (err) => {
        console.error('Error fetching projects:', err);
      }
    });
  }

  private loadContributionData(): void {
    const treeData = this.referenceDataService.get<any[]>('contributionTree');
    if (treeData) {
      this.contributionTreeData = treeData;
      this.contributionTypes = treeData.map(node => node.name);
      this.specificContributions = treeData.flatMap(node =>
        node.children ? node.children.map((child: any) => child.name) : []
      );
      this.filteredContributionTypes = [...this.contributionTypes];
      this.filteredSpecificContributions = [...this.specificContributions];
    }
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

  private fetchProjects(
    page = 1,
    size = 1000,
  ): Observable<any[]> {
    return this.aipService.getAips(page, size).pipe(
      map(response => response.data)
    );
  }

  protected onUnitChange(selectedUnit: string): void {
    this.isOtherSelected = selectedUnit === 'Others (pls. specify)';
    if (!this.isOtherSelected) {
      this.schoolNeedsForm.get('otherUnit')?.reset();
    }
    this.schoolNeedsForm.get('otherUnit')?.updateValueAndValidity();
  }

  protected filterContributionTypes(value: string): void {
    const filterValue = value.toLowerCase();
    this.filteredContributionTypes = this.contributionTypes.filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }

  protected filterSpecificContributions(value: string): void {
    const filterValue = value.toLowerCase();
    const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;

    let availableSpecificContributions = this.specificContributions;
    if (selectedContributionType) {
      availableSpecificContributions = this.getSpecificContributionsForType(selectedContributionType);
    }

    this.filteredSpecificContributions = availableSpecificContributions.filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }

  protected onContributionTypeChange(selectedType: string): void {
    if (this.previousContributionType !== selectedType) {
      this.schoolNeedsForm.get('specificContribution')?.setValue('');
    }

    this.previousContributionType = selectedType;

    if (selectedType) {
      this.specificContributions = this.getSpecificContributionsForType(selectedType);
    } else {
      this.specificContributions = this.contributionTreeData.flatMap(node =>
        node.children ? node.children.map((child: any) => child.name) : []
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

  private getSpecificContributionsForType(contributionType: string): string[] {
    const key = (contributionType ?? '').trim().toLowerCase();
    return (
      this.contributionTreeData
        .find((node) => (node.name ?? '').trim().toLowerCase() === key)
        ?.children?.map((child: any) => child.name) ?? []
    );
  }

  private markFormGroupTouched(): void {
    Object.keys(this.schoolNeedsForm.controls).forEach(key => {
      const control = this.schoolNeedsForm.get(key);
      control?.markAsTouched();
    });
  }


  protected addProject(projectId: string): void {
    if (projectId && !this.selectedProjectIds.includes(projectId)) {
      this.selectedProjectIds.push(projectId);
      this.schoolNeedsForm.get('projectName')?.setValue(this.selectedProjectIds);
      this.schoolNeedsForm.get('projectName')?.markAsTouched();
    }
  }

  protected removeProject(projectId: string): void {
    const index = this.selectedProjectIds.indexOf(projectId);
    if (index >= 0) {
      this.selectedProjectIds.splice(index, 1);
      this.schoolNeedsForm.get('projectName')?.setValue(this.selectedProjectIds);
    }
  }

  protected getProjectTitle(projectId: string): string {
    const project = this.projectsData.find(p => p._id === projectId);
    return project ? `${project.apn} - ${project.title}` : projectId;
  }
}
