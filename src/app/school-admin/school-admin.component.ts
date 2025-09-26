import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {MatNativeDateModule, MatOption} from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserService } from '../common/services/user.service';
import {forkJoin, lastValueFrom, map, Observable, of, Subject, switchMap, takeUntil} from "rxjs";
import {SchoolNeedService} from "../common/services/school-need.service";
import {getSchoolYear} from "../common/date-utils";
import {AipService} from "../common/services/aip.service";
import {Aip} from "../common/model/aip.model";
import {SchoolNeed, SchoolNeedImage} from "../common/model/school-need.model";
import {AuthService} from "../auth/auth.service";
import {MatProgressBar} from "@angular/material/progress-bar";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {HttpService} from "../common/services/http.service";
import {API_ENDPOINT} from "../common/api-endpoints";
import {ReferenceDataService} from "../common/services/reference-data.service";
import {InvalidContributionTypeDialogComponent} from "./invalid-contribution-type-dialog.component";
import {InvalidSpecificContributionDialogComponent} from "./invalid-specific-contribution-dialog.component";


@Component({
  selector: 'app-school-admin',
  standalone: true,
  imports: [
    MatNativeDateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatOption,
    CommonModule,
    MatCardTitle,
    MatIcon,
    MatProgressBar,
    MatPaginator
  ],
  templateUrl: './school-admin.component.html',
  styleUrls: ['./school-admin.component.css']
})
export class SchoolAdminComponent implements OnInit, OnDestroy {
  schoolNeedsForm: FormGroup;
  schoolNeedsData: SchoolNeed[] = [];
  projectsData: Aip[] = [];
  schoolName: string = '';
  private readonly destroy$ = new Subject<void>();
  
  // Pagination properties
  pageIndex: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;

  displayedColumns: string[] = ['contributionType', 'specificContribution', 'quantityNeeded', 'estimatedCost', 'targetDate', 'thumbnails', 'actions'];
  aipProjects: string[] = [];  // Populate AIP project names/ must be base on AIP form filled up
  pillars: string[] = [];
  schoolYears: string[] = ['2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022', '2020-2021', '2019-2020', '2018-2019'];
  units: string[] = []
  selectedSchoolYear: string = getSchoolYear();
  selectedContribution: any;
  isOtherSelected = false;
  previewImages: Array<{ file: File; dataUrl: string | ArrayBuffer | null; uploading: boolean; progress: number; } > = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isSaving: boolean = false;

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
    private readonly userService: UserService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly aipService: AipService,
    private readonly  authService: AuthService,
    private readonly httpService: HttpService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly router: Router,
  ) {
    this.schoolNeedsForm = this.fb.group({
      contributionType: ['', [Validators.required]],
      specificContribution: ['', [Validators.required]],
      schoolYear: [getSchoolYear(), [Validators.required]],
      projectName: ['', [Validators.required]],
      intermediateOutcome: ['', [Validators.required]],
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
  queryData(): void {
    this.pageIndex = 0; // Reset to first page when changing school year
    this.loadAllSchoolNeeds();
    console.log('Load All School Needs');
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadAllSchoolNeeds();
  }

  ngOnInit(): void {
    this.loadAllSchoolNeeds();
    this.loadCurrentProjects();
    this.loadContributionData();
    this.loadPillarsAndUnits();
    this.userService.projectTitles$.pipe(takeUntil(this.destroy$)).subscribe(titles => {
      this.aipProjects = titles;
    });
    this.userService.currentContribution.pipe(takeUntil(this.destroy$)).subscribe(data => {
      if (data) {
        this.selectedContribution = data;
        this.schoolNeedsForm.patchValue({
          specificContribution: data.specificContribution,
          contributionType: data.name
        });
        this.previousContributionType = data.name;
      }
    });
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

    // Validate contribution type
    const contributionType = this.schoolNeedsForm.get('contributionType')?.value;
    if (contributionType && !this.validateContributionType(contributionType)) {
      this.showInvalidContributionTypeDialog();
      return;
    }

    // Validate specific contribution
    const specificContribution = this.schoolNeedsForm.get('specificContribution')?.value;
    if (specificContribution && !this.validateSpecificContribution(specificContribution)) {
      this.showInvalidSpecificContributionDialog();
      return;
    }

    this.isSaving = true;

    try {
      const uploadedImages = this.previewImages.length
        ? await this.uploadImages('school-needs')
        : [];

      console.log(uploadedImages);

      const newNeed: SchoolNeed = {
        specificContribution: this.schoolNeedsForm.get('specificContribution')?.value,
        contributionType: this.schoolNeedsForm.get('contributionType')?.value,
        projectId: this.schoolNeedsForm.get('projectName')?.value,
        quantity: this.schoolNeedsForm.get('quantityNeeded')?.value,
        unit: this.schoolNeedsForm.get('unit')?.value,
        estimatedCost: this.schoolNeedsForm.get('estimatedCost')?.value,
        studentBeneficiaries: this.schoolNeedsForm.get('beneficiaryStudents')?.value,
        personnelBeneficiaries: this.schoolNeedsForm.get('beneficiaryPersonnel')?.value,
        description: this.schoolNeedsForm.get('description')?.value,
        schoolId: this.authService.getSchoolId(),
        images: uploadedImages,
        targetDate: this.schoolNeedsForm.get('targetDate')?.value,
      };

      this.schoolNeedService.createSchoolNeed(newNeed).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const currentSchoolYear = this.schoolNeedsForm.get('schoolYear')?.value;
          this.schoolNeedsForm.reset();
          this.schoolNeedsForm.patchValue({ schoolYear: currentSchoolYear });
          this.previewImages = [];
          this.queryData();
          this.isSaving = false;
          this.showSuccessNotification('School need saved successfully!');
        },
        error: (err) => {
          console.error('Error creating school need:', err);
          this.isSaving = false;
          this.showErrorNotification('Failed to save school need. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error during form submission:', error);
      this.isSaving = false;
      this.showErrorNotification('An unexpected error occurred. Please try again.');
    }
  }
  viewResponses(need: any): void {
    console.log('Viewing responses for:', need);

  }
  editNeed(need: any): void {
    console.log('Editing need:', need);
    console.log('Need code:', need.code);
    this.router.navigate(['/school-admin/school-need', need.code]);
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  getThumbnailImages(need: any): SchoolNeedImage[] {
    const images = need?.images ?? [];
    if (images.length <= 5) {
      return images;
    }

    // Randomly select up to 5 images from the array for the fanned layout
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
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

  private validateContributionType(value: string): boolean {
    return this.contributionTypes.includes(value);
  }

  private validateSpecificContribution(value: string): boolean {
    const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;
    if (!selectedContributionType) {
      return false; // No contribution type selected
    }

    const validSpecificContributions = this.getSpecificContributionsForType(selectedContributionType);
    return validSpecificContributions.includes(value);
  }

  private showInvalidContributionTypeDialog(): void {
    this.dialog.open(InvalidContributionTypeDialogComponent, {
      width: '400px',
      position: {
        top: '20vh'
      },
      data: { message: 'The contribution type you entered is not available. Please select from the available options.' }
    });
  }

  private showInvalidSpecificContributionDialog(): void {
    const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;
    const message = selectedContributionType
      ? `The specific contribution you entered does not belong to "${selectedContributionType}". Please select from the available options.`
      : 'Please select a contribution type first before entering a specific contribution.';

    this.dialog.open(InvalidSpecificContributionDialogComponent, {
      width: '400px',
      position: {
        top: '20vh'
      },
      data: { message }
    });
  }

  private loadAllSchoolNeeds(): void {
    const page = this.pageIndex + 1;
    this.schoolNeedService.getSchoolNeeds(page, this.pageSize, this.selectedSchoolYear).subscribe({
      next: (response) => {
        this.schoolNeedsData = response.data;
        this.schoolName = response.school?.schoolName || '';
        this.totalItems = response.meta?.totalItems || 0;
      },
      error: (err) => {
        console.error('Error fetching school needs:', err);
      }
    });
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

  private fetchAllSchoolNeeds(
    page= 1,
    size = 1000,
    acc: any[] = []
  ): Observable<{data: any[], schoolName: string}> {
    const sy = this.selectedSchoolYear;
    return this.schoolNeedService.getSchoolNeeds(page, size, sy).pipe(
      switchMap(res => {
        const currentData = res?.data ?? [];
        const allData = [...acc, ...currentData];

        // Capture school name from the first response
        const schoolName = page === 1 && res?.school?.schoolName ? res.school.schoolName : '';

        if(currentData.length < size) {
          return of({data: allData, schoolName});
        }

        return this.fetchAllSchoolNeeds(page + 1, size, allData);
      })
    )
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

    // Trigger validation for otherUnit field
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

    // Check if adding new files would exceed the 5 image limit
    const currentImageCount = this.previewImages.length;
    const maxImages = 5;

    if (currentImageCount >= maxImages) {
      this.showErrorNotification(`Maximum ${maxImages} images allowed. Please remove some images before adding new ones.`);
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const selectionSeen = new Set<string>();
    let addedCount = 0;
    const remainingSlots = maxImages - currentImageCount;

    Array.from(files).forEach(file => {
      // Stop if we've reached the limit
      if (addedCount >= remainingSlots) {
        console.warn('Image limit reached, skipping remaining files');
        return;
      }

      if (!file.type.startsWith('image/') || file.size === 0) {
        console.warn('Invalid image skipped:', file.name);
        return;
      }

      const key = `${file.name}__${file.size}__${file.lastModified}`;

      const alreadyAdded = this.previewImages.some(img =>
        img?.file?.name === file.name &&
        img?.file?.size === file.size &&
        img?.file?.lastModified === file.lastModified
      ) || selectionSeen.has(key);

      if (alreadyAdded) {
        console.warn('Duplicate image ignored:', file.name);
        return;
      }

      selectionSeen.add(key);

      const reader = new FileReader();
      reader.onload = () => {
        this.previewImages.push({
          file,
          dataUrl: reader.result,
          uploading: false,
          progress: 0,
        });
        addedCount++;
      };
      reader.readAsDataURL(file);
    });

    (event.target as HTMLInputElement).value = '';

    // Show info message if some files were skipped due to limit
    if (addedCount < Array.from(files).length) {
      this.showErrorNotification(`Only ${addedCount} images were added. Maximum ${maxImages} images allowed.`);
    }
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
}
