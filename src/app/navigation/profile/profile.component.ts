import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {UserService} from '../../common/services/user.service';
import {MatCardModule} from '@angular/material/card';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {AuthService} from "../../auth/auth.service";
import {SchoolService} from "../../common/services/school.service";
import {InternalReferenceDataService} from "../../common/services/internal-reference-data.service";
import {ReferenceDataService} from "../../common/services/reference-data.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {HttpService} from "../../common/services/http.service";
import {API_ENDPOINT} from "../../common/api-endpoints";
import {switchMap, of} from "rxjs";
import {Location} from "@angular/common";
import {Router} from "@angular/router";
import {NavigationService} from "../../common/services/navigation.service";

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  providers: [UserService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatAutocompleteModule,
    MatIcon,
    FormsModule,
    MatProgressBarModule
  ]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  clusters: string[] = [];
  schoolOfferings: string[] = [];
  showUploadSection: boolean = false;
  schoolId: string = '';
  selectedFile: File | null = null;
  isDragging: boolean = false;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  profileDocUrl: string | null = null;
  profileDocUrlRemoved: boolean = false;
  logoUrl: string | null = null;
  logoUrlRemoved: boolean = false;
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  isDraggingLogo: boolean = false;
  isUploadingLogo: boolean = false;
  logoUploadProgress: number = 0;
  isSaving: boolean = false;
  savingStatusMessage: string = '';
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('formCard') formCard!: ElementRef<HTMLDivElement>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly schoolService: SchoolService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly snackBar: MatSnackBar,
    private readonly httpService: HttpService,
    private readonly location: Location,
    private readonly router: Router,
    private readonly navigationService: NavigationService,
  ) {
    this.profileForm = this.fb.group({
      region: [''],
      division: [''],
      districtOrCluster: ['', Validators.required],
      schoolName: ['', Validators.required],
      schoolId: ['', Validators.required],
      schoolOffering: ['', Validators.required],
      accountablePerson: ['', Validators.required],
      designation: ['', Validators.required],
      contactNumber: ['', Validators.required],
      officialEmailAddress: ['', [Validators.required, Validators.email]],
      location: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.initializeData();
  }

  async initializeData(): Promise<void> {
    await this.loadClusters();
    await this.loadSchoolOfferings();
    this.loadProfileData();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      this.showErrorNotification('Invalid file type. Please select a PDF, DOC, or DOCX file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      this.showErrorNotification('File size exceeds 10MB limit. Please select a smaller file.');
      return;
    }

    this.selectedFile = file;
  }

  onFileInputClick(): void {
    this.fileInput.nativeElement.click();
  }

  removeFile(): void {
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onUpdate(): void {
    if (this.profileForm.valid) {
      // Scroll to the very top of the page
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Small delay to ensure scroll completes before starting save
      setTimeout(() => {
        this.isSaving = true;
        const hasFile = !!this.selectedFile;
        const hasLogoFile = !!this.selectedLogoFile;

        // Set initial status message
        if (hasFile && hasLogoFile) {
          this.savingStatusMessage = 'Uploading document and logo...';
        } else if (hasFile) {
          this.savingStatusMessage = 'Uploading document...';
        } else if (hasLogoFile) {
          this.savingStatusMessage = 'Uploading logo...';
        } else {
          this.savingStatusMessage = 'Saving profile...';
        }

        const documentUploadObservable = hasFile
          ? this.uploadFileAndGetUrl()
          : of(null);

        const logoUploadObservable = hasLogoFile
          ? this.uploadLogoAndGetUrl()
          : of(null);

        documentUploadObservable.pipe(
          switchMap((documentUrl) => {
            // Update status after document upload
            if (documentUrl && hasLogoFile) {
              this.savingStatusMessage = 'Document uploaded. Uploading logo...';
            } else if (documentUrl) {
              this.savingStatusMessage = 'Document uploaded. Saving profile...';
            } else if (hasLogoFile) {
              this.savingStatusMessage = 'Uploading logo...';
            }
            return logoUploadObservable.pipe(
              switchMap((logoUrl) => {
                // Update status after logo upload
                if (logoUrl) {
                  this.savingStatusMessage = 'Logo uploaded. Saving profile...';
                } else if (documentUrl) {
                  this.savingStatusMessage = 'Saving profile...';
                } else {
                  this.savingStatusMessage = 'Saving profile...';
                }
                const updatePayload = { ...this.profileForm.value };

                if (documentUrl) {
                  updatePayload.profileDocUrl = documentUrl;
                  this.profileDocUrlRemoved = false;
                } else if (this.profileDocUrlRemoved) {
                  updatePayload.profileDocUrl = null;
                }

                if (logoUrl) {
                  updatePayload.logoUrl = logoUrl;
                  this.logoUrlRemoved = false;
                } else if (this.logoUrlRemoved) {
                  updatePayload.logoUrl = null;
                }

                return this.schoolService.updateSchool(this.schoolId, updatePayload);
              })
            );
          })
        ).subscribe({
        next: () => {
          if (hasFile) {
            this.selectedFile = null;
            if (this.fileInput) {
              this.fileInput.nativeElement.value = '';
            }
          }

          if (hasLogoFile) {
            this.selectedLogoFile = null;
            this.logoPreviewUrl = null;
            if (this.logoInput) {
              this.logoInput.nativeElement.value = '';
            }
          }

          if (this.profileDocUrlRemoved) {
            this.profileDocUrl = null;
            this.profileDocUrlRemoved = false;
          }

          if (this.logoUrlRemoved) {
            this.logoUrl = null;
            this.logoUrlRemoved = false;
          }

          let message = 'Profile updated successfully!';
          if (hasFile && hasLogoFile) {
            message = 'Profile, document, and logo updated successfully!';
          } else if (hasFile) {
            message = 'Profile and document updated successfully!';
          } else if (hasLogoFile) {
            message = 'Profile and logo updated successfully!';
          } else if (this.profileDocUrlRemoved && this.logoUrlRemoved) {
            message = 'Profile updated and document and logo removed successfully!';
          } else if (this.profileDocUrlRemoved) {
            message = 'Profile updated and document removed successfully!';
          } else if (this.logoUrlRemoved) {
            message = 'Profile updated and logo removed successfully!';
          }

          this.isSaving = false;
          this.savingStatusMessage = '';
          this.showSuccessNotification(message);
        },
        error: (err: any) => {
          console.error('Update failed', err);
          this.isUploading = false;
          this.uploadProgress = 0;
          this.isUploadingLogo = false;
          this.logoUploadProgress = 0;
          this.isSaving = false;
          this.savingStatusMessage = '';

          let errorMessage = 'Failed to update profile. Please try again.';

          if (err?.error?.message) {
            if (Array.isArray(err.error.message)) {
              errorMessage = err.error.message.join('\n• ');
              if (err.error.message.length > 1) {
                errorMessage = `Please fix the following errors:\n• ${errorMessage}`;
              }
            } else if (typeof err.error.message === 'string') {
              errorMessage = err.error.message;
            }
          } else if (err?.error && typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err?.message) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }

          this.showErrorNotification(errorMessage);
        }
      });
      }, 300); // 300ms delay to allow scroll animation to start
    }
  }

  private uploadFileAndGetUrl(): any {
    if (!this.selectedFile) {
      return of(null);
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('category', 'school-profile');
    formData.append('schoolId', this.schoolId);

    return this.httpService.uploadFile(`${API_ENDPOINT.upload}/document`, formData).pipe(
      switchMap((response: any) => {
        this.isUploading = false;
        this.uploadProgress = 100;

        const documentUrl = response?.url || response?.data?.url || response?.originalUrl || response?.data?.originalUrl;

        if (documentUrl) {
          this.profileDocUrl = documentUrl;
          return of(documentUrl);
        } else {
          return of(null);
        }
      })
    );
  }

  private uploadLogoAndGetUrl(): any {
    if (!this.selectedLogoFile) {
      return of(null);
    }

    this.isUploadingLogo = true;
    this.logoUploadProgress = 0;

    const formData = new FormData();
    formData.append('file', this.selectedLogoFile);
    formData.append('category', 'school-logo');
    formData.append('schoolId', this.schoolId);

    return this.httpService.uploadFile(`${API_ENDPOINT.upload}/image`, formData).pipe(
      switchMap((response: any) => {
        this.isUploadingLogo = false;
        this.logoUploadProgress = 100;

        const imageUrl = response?.url || response?.data?.url || response?.originalUrl || response?.data?.originalUrl;

        if (imageUrl) {
          this.logoUrl = imageUrl;
          return of(imageUrl);
        } else {
          return of(null);
        }
      })
    );
  }

  private async loadClusters(): Promise<void> {
    await this.internalReferenceDataService.initialize();

    const clusterData: string[] = this.internalReferenceDataService.get('clusters');
    if (clusterData) {
      this.clusters = clusterData;
    }
  }

  private async loadSchoolOfferings(): Promise<void> {
    await this.internalReferenceDataService.initialize();
    const schoolOfferingData = this.referenceDataService.get('schoolOffering');
    if (schoolOfferingData && Array.isArray(schoolOfferingData)) {
      this.schoolOfferings = schoolOfferingData;
    }
  }

  private loadProfileData(): void {
    this.schoolId = this.authService.getSchoolId();

    if (this.schoolId) {
      this.schoolService.getSchoolById(this.schoolId).subscribe({
        next: (data: any) => {
          this.profileForm.patchValue({
            region: data.region,
            division: data.division,
            districtOrCluster: data.districtOrCluster,
            schoolName: data.schoolName,
            schoolId: `${data.schoolId}`,
            schoolOffering: data.schoolOffering,
            accountablePerson: data.accountablePerson,
            designation: data.designation,
            contactNumber: data.contactNumber,
            officialEmailAddress: data.officialEmailAddress,
            location: data.location || ''
          });

          this.profileDocUrl = data.profileDocUrl || null;
          this.logoUrl = data.logoUrl || null;
        }
      })
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
    const duration = message.includes('\n') ? 8000 : 5000;

    this.snackBar.open(message, 'Close', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }


  onDownloadProfileDoc(): void {
    if (this.profileDocUrl) {
      window.open(this.profileDocUrl, '_blank');
    }
  }

  onRemoveProfileDoc(): void {
    this.profileDocUrlRemoved = true;
    this.profileDocUrl = null;
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onCancel(): void {
    const previousUrl = this.navigationService.getPreviousUrl();

    if (previousUrl && previousUrl.trim() !== '' && previousUrl !== '/profile') {
      this.location.back();
    } else {
      this.router.navigate(['/home']);
    }
  }

  onLogoDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingLogo = true;
  }

  onLogoDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingLogo = false;
  }

  onLogoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingLogo = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleLogoSelection(files[0]);
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleLogoSelection(input.files[0]);
    }
  }

  private handleLogoSelection(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showErrorNotification('Invalid file type. Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showErrorNotification('Image size exceeds 5MB limit. Please select a smaller image.');
      return;
    }

    this.selectedLogoFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onLogoInputClick(): void {
    this.logoInput.nativeElement.click();
  }

  removeLogoFile(): void {
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
    if (this.logoInput) {
      this.logoInput.nativeElement.value = '';
    }
  }

  onRemoveLogo(): void {
    this.logoUrlRemoved = true;
    this.logoUrl = null;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
    if (this.logoInput) {
      this.logoInput.nativeElement.value = '';
    }
  }
}
