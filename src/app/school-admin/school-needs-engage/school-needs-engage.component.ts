import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {MatTableModule} from '@angular/material/table';
import {MatCard, MatCardContent, MatCardModule, MatCardTitle} from '@angular/material/card';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatFormField, MatFormFieldModule, MatLabel} from '@angular/material/form-field';
import {MatNativeDateModule, MatOption} from '@angular/material/core';
import {MatInputModule} from '@angular/material/input';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatDatepickerModule, MatDatepickerToggle} from '@angular/material/datepicker';
import {MatButton} from "@angular/material/button";
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatIcon} from '@angular/material/icon';
import {MatProgressBar} from '@angular/material/progress-bar';
import {debounceTime, distinctUntilChanged, forkJoin, lastValueFrom, map, Subject, takeUntil} from 'rxjs';
import {SchoolNeed, SchoolNeedImage} from "../../common/model/school-need.model";
import {Engagement} from "../../common/model/engagement.model";
import {UserService} from '../../common/services/user.service';
import {SharedDataService} from '../../common/services/shared-data.service';
import {ReferenceDataService} from '../../common/services/reference-data.service';
import {SchoolNeedService} from '../../common/services/school-need.service';
import {EngagementService} from '../../common/services/engagement.service';
import {FormsModule, NgForm, NgModel} from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatRadioChange, MatRadioModule} from '@angular/material/radio';
import {HttpService} from '../../common/services/http.service';
import {API_ENDPOINT} from '../../common/api-endpoints';

@Component({
  selector: 'app-school-needs-engage',
  imports: [
    CommonModule,
    MatOption,
    MatInputModule,
    MatAutocompleteModule,
    FormsModule,
    MatNativeDateModule,
    MatTableModule,
    MatCard,
    MatCardTitle,
    MatTooltipModule,
    MatCardContent,
    MatCardModule,
    MatFormField,
    MatLabel,
    MatButton,
    MatRadioModule,
    MatDatepickerModule,
    MatDatepickerToggle,
    MatFormFieldModule,
    MatSelectModule,
    MatIcon,
    MatProgressBar
  ],
  templateUrl: './school-needs-engage.component.html',
  styleUrls: ['./school-needs-engage.component.css'],
})
export class SchoolNeedsEngageComponent implements OnInit, OnDestroy {
  schoolNeed: SchoolNeed | undefined;
  needCode: string | null = null;
  engagementId: string | null = null;
  editingEngagement: Engagement | null = null;
  stakeholder: any = null;
  moaDate: Date | null = null;
  quantity: number | null = null;
  unit: string = '';
  amount: number | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  // Additional fields
  isApplicable: boolean = true;
  stakeholderRepCount: number | null = null;
  agreementType: string = '';
  signatoryName: string = '';
  signatoryDesignation: string = '';
  projectCategory: string = '';
  projectName: string = '';
  agreementStatus: string = '';
  initiatedBy: string = '';
  stakeholders: any[] = [];
  filteredStakeholders: any[] = [];
  readonly STAKEHOLDER_LIMIT = 50;
  agreementTypes: string[] = [];
  projectCategories: string[] = [];
  previewImages: Array<{ file: File; dataUrl: string | ArrayBuffer | null; uploading: boolean; progress: number; }> = [];
  isSaving = false;
  submitAttempted = false;
  readonly maxImages = 5;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('engagementForm') engagementForm!: NgForm;
  @ViewChild('implementationForm') implementationForm!: NgForm;

  @ViewChild('stakeholderInput') stakeholderInputModel!: NgModel;

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly sharedDataService: SharedDataService,
    private readonly userService: UserService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly engagementService: EngagementService,
    private readonly snackBar: MatSnackBar,
    private readonly httpService: HttpService,
  ) {}

  get isEditMode(): boolean {
    return !!this.engagementId;
  }

  ngOnInit(): void {
    this.initializeData().catch(error => {
      console.error('Initialization failed', error);
    });
  }

  private async initializeData() {
    await this.referenceDataService.initialize();

    this.needCode = this.route.snapshot.paramMap.get('code');
    this.engagementId = this.route.snapshot.paramMap.get('engagementId');
    if (this.needCode) {
      this.loadSchoolNeed(this.needCode);
    }

    this.loadStakeholders();
    this.setupDebouncedSearch();
    this.loadAgreementTypes();
    this.loadProjectCategory();
  }

  loadAgreementTypes(): void {
      const result = this.referenceDataService.get<string>('agreementType');
      if (result && Array.isArray(result)) {
        this.agreementTypes = result;
      }
  }

  loadProjectCategory(): void {
      const result = this.referenceDataService.get<string>('projectCategory');
      if (result && Array.isArray(result)) {
        this.projectCategories = result;
      }
  }

  loadStakeholders(): void {
    this.userService
      .getUsers({
        page: 1,
        limit: this.STAKEHOLDER_LIMIT,
        roles: ['stakeholder'],
        includeReferenceAccounts: true,
      })
      .subscribe({
      next: (res) => {
        this.stakeholders = res.data ?? [];
        this.filteredStakeholders = this.stakeholders;
      },
      error: (error) => {
        console.error('Error loading stakeholders:', error);
        this.stakeholders = [];
        this.filteredStakeholders = [];
      }
    });
  }

  onToggleChange(event: MatRadioChange): void {
    // Ensure value is always a boolean
    this.isApplicable = event.value === true;
  }


  loadSchoolNeed(code: string): void {
    this.schoolNeedService.getSchoolNeedByCode(code).pipe(takeUntil(this.destroy$)).subscribe({
      next: (need) => {
        if (need) {
          this.unit = need.unit ?? '';
          this.schoolNeed = need;
          if (this.isEditMode) {
            this.resolveEditEngagement();
          }
        }
      },
      error: (error) => {
        console.error('Error loading school need:', error);
        this.showErrorNotification('Failed to load school need details. Please try again.');
      }
    });
  }

  private resolveEditEngagement(): void {
    if (!this.engagementId || !this.schoolNeed?.engagements?.length) {
      this.showErrorNotification('Engagement not found.');
      this.navigateAfterEditFailure();
      return;
    }

    const engagement = this.schoolNeed.engagements.find(
      (eng) => String(eng._id) === String(this.engagementId),
    );

    if (!engagement) {
      this.showErrorNotification('Engagement not found.');
      this.navigateAfterEditFailure();
      return;
    }

    this.editingEngagement = engagement as Engagement;
    this.populateFormFromEngagement(this.editingEngagement);
  }

  private navigateAfterEditFailure(): void {
    if (this.needCode) {
      this.router.navigate(['/school-admin/school-need-view', this.needCode]);
    } else {
      this.router.navigate(['/school-admin/list-of-school-needs']);
    }
  }

  private populateFormFromEngagement(engagement: Engagement): void {
    const stakeholder = engagement.stakeholderUserId;
    if (typeof stakeholder === 'object' && stakeholder !== null) {
      this.stakeholder = stakeholder;
    }

    this.moaDate = this.parseDate(engagement.signingDate);
    this.quantity = engagement.quantity ?? null;
    this.unit = engagement.unit ?? this.unit;
    this.amount = engagement.amount ?? null;
    this.startDate = this.parseDate(engagement.startDate);
    this.endDate = this.parseDate(engagement.endDate);

    this.stakeholderRepCount = engagement.stakeholderRepCount ?? null;
    this.agreementType = engagement.agreementType ?? '';
    this.signatoryName = engagement.signatoryName ?? '';
    this.signatoryDesignation = engagement.signatoryDesignation ?? '';
    this.projectCategory = engagement.projectCategory ?? '';
    this.projectName = engagement.projectName ?? '';
    this.agreementStatus = engagement.agreementStatus ?? '';
    this.initiatedBy = engagement.initiatedBy ?? '';

    this.isApplicable = !!(
      engagement.stakeholderRepCount != null ||
      engagement.agreementType ||
      engagement.signatoryName ||
      engagement.signatoryDesignation ||
      engagement.projectCategory ||
      engagement.projectName ||
      engagement.agreementStatus ||
      engagement.initiatedBy
    );
  }

  private parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  setupDebouncedSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only emit if the value has changed
      takeUntil(this.destroy$) // Clean up subscription when component is destroyed
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onStakeholderInput(event: any): void {
    const value = event.target.value;
    this.searchSubject.next(value);

    this.updateStakeholderValidity();
  }

  updateStakeholderValidity(): void {
    setTimeout(() => {
      if (this.stakeholderInputModel && this.stakeholderInputModel.control) {
        const isValid = this.isStakeholderValid();
        const showError = this.stakeholderInputModel.touched || this.submitAttempted;
        if (!isValid && showError) {
          this.stakeholderInputModel.control.setErrors({ invalidStakeholder: true });
        } else if (isValid && this.stakeholderInputModel.control.hasError('invalidStakeholder')) {
          const errors = { ...this.stakeholderInputModel.control.errors };
          delete errors['invalidStakeholder'];
          this.stakeholderInputModel.control.setErrors(Object.keys(errors).length > 0 ? errors : null);
        }
      }
    });
  }

  showControlError(control: NgModel | undefined): boolean {
    return !!(control && control.invalid && (control.touched || control.dirty || this.submitAttempted));
  }

  showStakeholderError(): boolean {
    return !!(
      (this.stakeholderInputModel?.invalid || !this.isStakeholderValid()) &&
      (this.stakeholderInputModel?.touched || this.stakeholderInputModel?.dirty || this.submitAttempted)
    );
  }

  showMovError(): boolean {
    return this.submitAttempted && this.isMovInvalid();
  }

  private isMovInvalid(): boolean {
    if (this.isEditMode) {
      return this.totalImageCount < 1;
    }
    if (this.hasExistingImages) {
      return this.previewImages.length < 1;
    }
    return this.totalImageCount < 1;
  }

  private markAllFormsTouched(): void {
    this.submitAttempted = true;
    [this.engagementForm, this.implementationForm].forEach(form => {
      if (!form) {
        return;
      }
      Object.values(form.controls).forEach(control => {
        control.markAsTouched();
        control.markAsDirty();
      });
    });
    this.updateStakeholderValidity();
  }

  private hasValidationErrors(): boolean {
    const stakeholderInvalid = !this.isStakeholderValid();
    const engagementInvalid = !!this.engagementForm?.invalid;
    const implementationInvalid = !!this.implementationForm?.invalid;
    const applicableInvalid = this.isApplicable && !this.validateForm();
    const movInvalid = this.isMovInvalid();

    return stakeholderInvalid || engagementInvalid || implementationInvalid || applicableInvalid || movInvalid;
  }

  private showValidationFeedback(): void {
    if (!this.isStakeholderValid()) {
      this.showErrorNotification('Please select a stakeholder from the list.');
      return;
    }

    if (this.showMovError()) {
      const message = this.isEditMode
        ? 'Please keep or upload at least one MOV (Means of Verification).'
        : this.hasExistingImages
          ? 'Please update your MOV/image before engaging.'
          : 'Please upload at least one MOV (Means of Verification) before engaging.';
      this.showErrorNotification(message);
      return;
    }

    this.showErrorNotification(
      this.isEditMode
        ? 'Please fill out all required fields before updating.'
        : 'Please fill out all required fields before engaging.',
    );
  }

  onStakeholderSelectionChange(): void {
    this.updateStakeholderValidity();
  }

  performSearch(searchTerm: string): void {
    if (searchTerm && searchTerm.length > 0) {
      this.userService
        .getUsers({
          page: 1,
          limit: this.STAKEHOLDER_LIMIT,
          search: searchTerm,
          roles: ['stakeholder'],
          includeReferenceAccounts: true,
        })
        .subscribe({
        next: (res) => {
          this.filteredStakeholders = res.data ?? [];
        },
        error: (error) => {
          console.error('Error searching stakeholders:', error);
          this.filteredStakeholders = [];
        }
      });
    } else {
      this.filteredStakeholders = this.stakeholders;
    }
  }

  displayFn(stakeholder: any): string {
    return stakeholder?.name ?? '';
  }

  isStakeholderValid(): boolean {
    return typeof this.stakeholder === 'object' && this.stakeholder !== null && this.stakeholder._id;
  }

  getStakeholderErrorMessage(): string {
    if (!this.stakeholder) {
      return 'Stakeholder is required';
    }
    if (!this.isStakeholderValid()) {
      return 'Please select a stakeholder from the list';
    }
    return '';
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

  validateForm(): boolean {
    return this.stakeholderRepCount !== null &&
           this.agreementType !== '' &&
           this.signatoryName.trim() !== '' &&
           this.signatoryDesignation !== '' &&
           this.projectCategory !== '' &&
           this.agreementStatus !== '' &&
           this.initiatedBy !== '';
  }

  async saveEngagement(): Promise<void> {
    this.markAllFormsTouched();

    if (this.hasValidationErrors()) {
      this.showValidationFeedback();
      return;
    }

    if (!this.schoolNeed?._id) {
      this.showErrorNotification('School need details are not loaded. Please try again.');
      return;
    }

    if (!this.needCode) {
      return;
    }

    this.isSaving = true;

    try {
      const uploadedImages = await this.uploadImages('school-needs');

      const mergedImages: SchoolNeedImage[] = [
        ...this.existingImages,
        ...uploadedImages,
      ].slice(0, this.maxImages);

      await lastValueFrom(
        this.schoolNeedService.updateSchoolNeed(this.schoolNeed._id, {
          images: mergedImages,
        } as SchoolNeed),
      );

      const engagementData = {
        stakeholderUserId: this.stakeholder._id,
        stakeholderRepCount: this.stakeholderRepCount,
        agreementType: this.agreementType,
        signatoryName: this.signatoryName,
        signatoryDesignation: this.signatoryDesignation,
        projectCategory: this.projectCategory,
        projectName: this.projectName,
        agreementStatus: this.agreementStatus,
        initiatedBy: this.initiatedBy,
        signingDate: this.moaDate,
        unit: this.unit,
        amount: this.amount,
        startDate: this.startDate,
        endDate: this.endDate,
        quantity: this.quantity,
        ...(this.isEditMode ? {} : { schoolNeedCode: +this.needCode }),
      };

      if (this.isEditMode && this.engagementId) {
        await lastValueFrom(
          this.engagementService.updateEngagement(
            this.engagementId,
            engagementData as unknown as Partial<Engagement>,
          ).pipe(
            takeUntil(this.destroy$),
          ),
        );
        this.showSuccessNotification('Engagement updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/school-admin/school-need-view', this.needCode]);
        }, 1500);
      } else {
        await lastValueFrom(
          this.schoolNeedService.engageSchoolNeed(engagementData).pipe(takeUntil(this.destroy$)),
        );

        this.sharedDataService.updateEngagementStatus(this.needCode, true);
        this.clearForm();
        this.showSuccessNotification('Engagement saved successfully!');
        setTimeout(() => {
          this.router.navigate(['/school-admin/list-of-school-needs']);
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving engagement:', error);
      this.showErrorNotification('Failed to save engagement. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  clearForm(): void {
    this.submitAttempted = false;
    this.stakeholder = null;
    this.moaDate = null;
    this.quantity = null;
    this.unit = '';
    this.amount = null;
    this.startDate = null;
    this.endDate = null;
    this.isApplicable = true;
    this.stakeholderRepCount = null;
    this.agreementType = '';
    this.signatoryName = '';
    this.signatoryDesignation = '';
    this.projectCategory = '';
    this.projectName = '';
    this.agreementStatus = '';
    this.initiatedBy = '';
    this.previewImages = [];
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;

    const currentImageCount = this.totalImageCount;

    if (currentImageCount >= this.maxImages) {
      this.showErrorNotification(`Maximum ${this.maxImages} MOVs allowed. Please remove some before adding new ones.`);
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

  removeImage(index: number): void {
    this.previewImages.splice(index, 1);
  }

  async uploadImages(category: string): Promise<SchoolNeedImage[]> {
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
          return this.normalizeUploadedImage(response);
        }),
      );
    });

    if (uploadRequests.length === 0) {
      return [];
    }

    return lastValueFrom(forkJoin(uploadRequests));
  }

  private normalizeUploadedImage(response: unknown): SchoolNeedImage {
    const data = response as Partial<SchoolNeedImage>;
    if (!data.id || !data.originalUrl || !data.thumbnailUrl) {
      throw new Error('Upload did not return complete image metadata');
    }
    return {
      id: data.id,
      category: data.category ?? 'school-needs',
      originalUrl: data.originalUrl,
      thumbnailUrl: data.thumbnailUrl,
    };
  }

  get totalImageCount(): number {
    const existingCount = this.schoolNeed?.images?.length || 0;
    return existingCount + this.previewImages.length;
  }

  get hasExistingImages(): boolean {
    return !!(this.schoolNeed?.images && this.schoolNeed.images.length > 0);
  }

  get existingImages(): SchoolNeedImage[] {
    return this.schoolNeed?.images ?? [];
  }

  removeExistingImage(imageIndex: number): void {
    if (!this.schoolNeed?.images) return;
    this.schoolNeed.images.splice(imageIndex, 1);

  }
}
