import {Component, OnInit} from '@angular/core';
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
    FormsModule
  ]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  clusters: string[] = [];
  schoolOfferings: string[] = [];
  showUploadSection: boolean = false;
  schoolId: string = '';
  selectedFile: File | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly schoolService: SchoolService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly referenceDataService: ReferenceDataService,
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
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUpload(): void {
    if (this.selectedFile) {
      console.log('Uploading:', this.selectedFile);
    } else {
      console.error('No file selected!');
    }
  }

  onDownload(): void {
    console.log('Downloading school profile...');
  }

  onUpdate(): void {
    if (this.profileForm.valid) {
      this.schoolService.updateSchool(this.schoolId, this.profileForm.value).subscribe({
        next: () => {
          console.log('Profile updated successfully');
        },
        error: (err) => {
          console.error('Update failed', err);
        }
      });
    }
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
        }
      })
    }
  }
}
