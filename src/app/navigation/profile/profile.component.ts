import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { UserService } from '../../common/services/user.service'; 
import {MatCardModule} from '@angular/material/card';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {CommonModule} from '@angular/common'; 
import {ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
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
   regions: [{ value: string, label: string }] | [] | null | undefined = [];
  divisions: [{ value: string, label: string }] | [] | null | undefined = [];
  clusters: string[] = [];
  schoolOfferings: string[] = [];
   showUploadSection: boolean = false; 
  schoolId: string = ''; 
  selectedFile: File | null = null; 

  constructor(private fb: FormBuilder, private userService: UserService) {
    this.profileForm = this.fb.group({
      region: ['', Validators.required],
      division: ['', Validators.required],
      district: ['', Validators.required],
      schoolName: ['', Validators.required],
      schoolId: ['', Validators.required],
      schoolOffering: ['', Validators.required],
      accountableName: ['', Validators.required],
      designation: ['', Validators.required],
      contactNumber: ['', Validators.required],
      officialEmail: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
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


  private loadProfileData(): void {
    const userData = this.userService.getUserProfile(); 
    if (userData) {
      this.profileForm.patchValue(userData); 
    }
  }
  
  onDownload(): void {
  console.log('Downloading school profile...');
}

  onUpdate(): void {
    if (this.profileForm.valid) {
      this.userService.updateUserProfile(this.profileForm.value).subscribe({
        next: () => {
          console.log('Profile updated successfully');
        },
        error: (err) => {
          console.error('Update failed', err);
        }
      });
    }
  }
}