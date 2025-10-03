import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatNativeDateModule, MatOption } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, lastValueFrom, map, Observable, Subject, takeUntil } from "rxjs";
import { SchoolNeedService } from "../../common/services/school-need.service";
import { getSchoolYear } from "../../common/date-utils";
import { AipService } from "../../common/services/aip.service";
import { Aip } from "../../common/model/aip.model";
import { SchoolNeed, SchoolNeedImage } from "../../common/model/school-need.model";
import { AuthService } from "../../auth/auth.service";
import { MatProgressBar } from "@angular/material/progress-bar";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialog } from "@angular/material/dialog";
import { HttpService } from "../../common/services/http.service";
import { API_ENDPOINT } from "../../common/api-endpoints";
import { ReferenceDataService } from "../../common/services/reference-data.service";
import {NavigationService} from "../../common/services/navigation.service";

@Component({
  selector: 'app-school-need',
  standalone: true,
  imports: [
    MatNativeDateModule,
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
    MatProgressBar
  ],
  templateUrl: './school-need.component.html',
  styleUrl: './school-need.component.css'
})
export class SchoolNeedComponent implements OnInit, OnDestroy {
  schoolNeedsForm: FormGroup;
  schoolNeed: SchoolNeed | null = null;
  projectsData: Aip[] = [];
  schoolName: string = '';
  private readonly destroy$ = new Subject<void>();

  aipProjects: string[] = [];
  pillars: string[] = [];
  units: string[] = []
  isOtherSelected = false;
  previewImages: Array<{ file: File; dataUrl: string | ArrayBuffer | null; uploading: boolean; progress: number; }> = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isSaving: boolean = false;
  isLoading: boolean = true;

  contributionTypes: string[] = [];
  specificContributions: string[] = [];
  filteredContributionTypes: string[] = [];
  filteredSpecificContributions: string[] = [];
  contributionTreeData: any[] = [];
  previousContributionType: string = '';

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
    private readonly httpService: HttpService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly navigationService: NavigationService,
  ) {
    this.schoolNeedsForm = this.fb.group({
      contributionType: ['', [Validators.required]],
      specificContribution: ['', [Validators.required]],
      schoolYear: [getSchoolYear(), [Validators.required]],
      projectName: ['', [Validators.required]],
      intermediateOutcome: [''], // Readonly field, populated from project.pillars
      quantityNeeded: [0, [Validators.required, Validators.min(1)]],
      unit: ['', [Validators.required]],
      otherUnit: ['', [this.otherUnitValidator.bind(this)]],
      estimatedCost: [0, [Validators.required, Validators.min(0)]],
      beneficiaryStudents: [0, [Validators.required, Validators.min(0)]],
      beneficiaryPersonnel: [0, [Validators.required, Validators.min(0)]],
      targetDate: ['', [Validators.required]],
      description: ['', [Validators.maxLength(500)]],
      images: [[]],
    });
  }

  ngOnInit(): void {
    this.loadContributionData();
    this.loadCurrentProjects();
    this.loadPillarsAndUnits();

    // Get school need code from route params
    const needCode = this.route.snapshot.paramMap.get('code');
    console.log('Route param code:', needCode);
    if (needCode) {
      this.loadSchoolNeed(needCode);
    } else {
      this.showErrorNotification('School need code not provided');
      this.router.navigate(['/school-admin/school-needs']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    if (this.schoolNeedsForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSaving = true;

    try {
      const uploadedImages = this.previewImages.length
        ? await this.uploadImages('school-needs')
        : [];

      const updatedNeed: any = {
        ...this.schoolNeed!,
        specificContribution: this.schoolNeedsForm.get('specificContribution')?.value,
        contributionType: this.schoolNeedsForm.get('contributionType')?.value,
        projectId: this.schoolNeedsForm.get('projectName')?.value,
        schoolId: this.schoolNeed!.schoolId,
        quantity: this.schoolNeedsForm.get('quantityNeeded')?.value,
        unit: this.schoolNeedsForm.get('unit')?.value,
        estimatedCost: this.schoolNeedsForm.get('estimatedCost')?.value,
        studentBeneficiaries: this.schoolNeedsForm.get('beneficiaryStudents')?.value,
        personnelBeneficiaries: this.schoolNeedsForm.get('beneficiaryPersonnel')?.value,
        description: this.schoolNeedsForm.get('description')?.value,
        targetDate: this.schoolNeedsForm.get('targetDate')?.value,
        images: [...this.schoolNeed!.images, ...uploadedImages],
      };

      this.schoolNeedService.updateSchoolNeed(this.schoolNeed!._id!, updatedNeed).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isSaving = false;
          this.showSuccessNotification('School need updated successfully!');
          this.router.navigate(['/school-admin/school-needs']);
        },
        error: (err) => {
          console.error('Error updating school need:', err);
          this.isSaving = false;
          this.showErrorNotification('Failed to update school need. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error during form submission:', error);
      this.isSaving = false;
      this.showErrorNotification('An unexpected error occurred. Please try again.');
    }
  }

  onCancel(): void {
    const prevUrl = this.navigationService.getPreviousUrl();

    // Remove query parameters and fragments to get the base path
    const basePath = prevUrl.split('?')[0].split('#')[0];

    if (basePath === '/school-admin/school-needs' || basePath.endsWith('/school-admin/school-needs')) {
      this.router.navigate(['/school-admin/school-needs']);
    } else {
      this.router.navigate(['/school-admin/list-of-school-needs']);
    }
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
        this.router.navigate(['/school-admin/school-needs']);
      }
    });
  }

  private populateForm(): void {
    if (!this.schoolNeed) {
      console.log('No school need data to populate form');
      return;
    }

    console.log('Populating form with school need:', this.schoolNeed);

    this.schoolNeedsForm.patchValue({
      contributionType: this.schoolNeed.contributionType,
      specificContribution: this.schoolNeed.specificContribution,
      schoolYear: getSchoolYear(),
      projectName: typeof this.schoolNeed.projectId === 'object' ? this.schoolNeed.projectId._id : this.schoolNeed.projectId,
      intermediateOutcome: typeof this.schoolNeed.projectId === 'object' ? this.schoolNeed.projectId.pillars : '',
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

    console.log('Form populated successfully. Form value:', this.schoolNeedsForm.value);
  }

  private loadCurrentProjects(): void {
    this.fetchProjects().subscribe({
      next: (projects) => {
        this.projectsData = projects;
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

  private loadPillarsAndUnits(): void {
    const pillarsData = this.referenceDataService.get<string[]>('pillars');
    if (pillarsData) {
      this.pillars = pillarsData;
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
    return this.contributionTreeData
      .find(node => node.name === contributionType)
      ?.children?.map((child: any) => child.name) ?? [];
  }

  private markFormGroupTouched(): void {
    Object.keys(this.schoolNeedsForm.controls).forEach(key => {
      const control = this.schoolNeedsForm.get(key);
      control?.markAsTouched();
    });
  }

  protected onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;

    const currentImageCount = this.previewImages.length;
    const existingImageCount = this.schoolNeed?.images?.length || 0;
    const maxImages = 5;

    if (currentImageCount + existingImageCount >= maxImages) {
      this.showErrorNotification(`Maximum ${maxImages} images allowed. Please remove some images before adding new ones.`);
      (event.target as HTMLInputElement).value = '';
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') || file.size === 0) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.previewImages.push({
          file,
          dataUrl: reader.result,
          uploading: false,
          progress: 0,
        });
      };
      reader.readAsDataURL(file);
    });

    (event.target as HTMLInputElement).value = '';
  }

  removeImage(index: number) {
    this.previewImages.splice(index, 1);
  }

  async uploadImages(category: string): Promise<any[]> {
    const uploadRequests = this.previewImages.map(img => {
      img.uploading = true;
      img.progress = 0;
      const formData = new FormData();
      formData.append('file', img.file);
      formData.append('category', category);

      return this.httpService.uploadFile(`${API_ENDPOINT.upload}/image`, formData).pipe(
        map(response => {
          img.uploading = false;
          img.progress = 100;
          return response;
        })
      );
    });

    if (uploadRequests.length === 0) {
      return [];
    }

    const results = await lastValueFrom(forkJoin(uploadRequests));
    this.schoolNeedsForm.get('images')?.setValue(results);
    return results;
  }

  get hasExistingImages(): boolean {
    return !!(this.schoolNeed?.images && this.schoolNeed.images.length > 0);
  }

  get existingImages(): SchoolNeedImage[] {
    return this.schoolNeed?.images || [];
  }

  removeExistingImage(imageIndex: number): void {
    if (!this.schoolNeed?.images) return;

    // Remove from the school need images array
    this.schoolNeed.images.splice(imageIndex, 1);

    console.log('Removed existing image at index:', imageIndex);
    console.log('Remaining existing images:', this.schoolNeed.images);
  }

  get totalImageCount(): number {
    const existingCount = this.schoolNeed?.images?.length || 0;
    const newCount = this.previewImages.length;
    return existingCount + newCount;
  }
}
