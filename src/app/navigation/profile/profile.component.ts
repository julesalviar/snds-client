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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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

  toggleUploadSection(): void {
    this.showUploadSection = !this.showUploadSection;
    if (!this.showUploadSection) {
      this.selectedFile = null;
      this.isDragging = false;
    }
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

  onDownload(): void {
    console.log('Downloading school profile...');
  }

  onUpdate(): void {
    if (this.profileForm.valid) {
      const hasFile = !!this.selectedFile;

      // If a file is selected, upload it first, then update the profile
      const uploadObservable = hasFile
        ? this.uploadFileAndGetUrl()
        : of(null);

      uploadObservable.pipe(
        switchMap((documentUrl) => {
          // Prepare update payload
          const updatePayload = { ...this.profileForm.value };

          // If we have a document URL from upload, include it in the update
          if (documentUrl) {
            updatePayload.profileDocUrl = documentUrl;
            this.profileDocUrlRemoved = false; // Reset removal flag if new file uploaded
          } else if (this.profileDocUrlRemoved) {
            // If document was removed, set profileDocUrl to null
            updatePayload.profileDocUrl = null;
          }

          // Update the school profile
          return this.schoolService.updateSchool(this.schoolId, updatePayload);
        })
      ).subscribe({
        next: () => {
          // Clear selected file after successful update
          if (hasFile) {
            this.selectedFile = null;
            if (this.fileInput) {
              this.fileInput.nativeElement.value = '';
            }
          }

          // If document was removed, clear the profileDocUrl
          if (this.profileDocUrlRemoved) {
            this.profileDocUrl = null;
            this.profileDocUrlRemoved = false;
          }

          const message = hasFile
            ? 'Profile and document updated successfully!'
            : this.profileDocUrlRemoved
            ? 'Profile updated and document removed successfully!'
            : 'Profile updated successfully!';
          this.showSuccessNotification(message);
        },
        error: (err: any) => {
          console.error('Update failed', err);
          this.isUploading = false;
          this.uploadProgress = 0;

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

        // Extract the document URL from the response
        const documentUrl = response?.url || response?.data?.url || response?.originalUrl || response?.data?.originalUrl;

        if (documentUrl) {
          // Update local profileDocUrl immediately
          this.profileDocUrl = documentUrl;
          return of(documentUrl);
        } else {
          // If no URL in response, return null and continue with profile update
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

          // Load profile document URL if it exists
          this.profileDocUrl = data.profileDocUrl || null;
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
    // Mark as removed (will be cleared when profile is saved)
    this.profileDocUrlRemoved = true;
    this.profileDocUrl = null;
    // Clear any selected file as well
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onCancel(): void {
    // Check if there's a previous URL to go back to
    const previousUrl = this.navigationService.getPreviousUrl();
    
    if (previousUrl && previousUrl.trim() !== '' && previousUrl !== '/profile') {
      this.location.back();
    } else {
      // If no previous screen or previous screen is the same, navigate to home
      this.router.navigate(['/home']);
    }
  }
}
