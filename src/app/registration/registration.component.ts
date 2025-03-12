import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword
      ? { mismatch: true }
      : null;
  };
}

@Component({
  selector: 'app-registration',
  standalone: true,
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatRadioModule,
  ]
})
export class RegistrationComponent {
  registrationForm: FormGroup;
  isSuccess: boolean = false;
  availableOptions: string[] = []; 
  sectors = [ 
    { 
      category: 'Private Sector', 
      options: [
        'Alumni Association',
        'Corporate Foundation',
        'Private Company',
        'Private Individual',
        'Private School',
        'PTA',
      ]
    },
    { 
      category: 'Public Sector', 
      options: [
        'Congress',
        'Government-Owned and Controlled Corporation',
        'LGU - Barangay',
        'LGU - City',
        'LGU - Municipality',
        'LGU - Province',
        'Senate',
        'State University',
      ]
    },
    { 
      category: 'Civil Society Organization', 
      options: [
        'Cooperative',
        'Faith-Based Organization',
        'Media Association',
        'Non-Government Organization',
        'Peoples Organization',
        'Professional Association',
        'Trade Unions',
      ]
    },
    { 
      category: 'International', 
      options: [
        'Foreign Government',
        'International Non-Government Organization',
      ]
    }


   ];

  constructor(private formBuilder: FormBuilder, private router: Router) {
    this.registrationForm = this.formBuilder.group({
      name: ['', Validators.required],
      sector: ['', Validators.required],
      selectedOption: ['', Validators.required], 
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator() });
  }
  //for selection from category
  onCategoryChange(category: string) {
    const selectedSector = this.sectors.find(sector => sector.category === category);
    this.availableOptions = selectedSector ? selectedSector.options : [];
    this.registrationForm.get('selectedOption')?.setValue('');
  }

  onSubmit() {
    if (this.registrationForm.valid) {
      console.log('Form Submitted!', this.registrationForm.value); //for  testing lang if working
      this.isSuccess = true; // Indicate success
      this.registrationForm.reset(); 
      this.router.navigate(['/sign-in']); // Navigate to sign-in after successful registration
    } else {
      this.registrationForm.markAllAsTouched(); // Highlight validation errors
      this.isSuccess = false; 
      if (this.registrationForm.errors?.['mismatch']) {
        this.showDialog('Passwords do not match.');
      }
    }
  }

  showDialog(message: string) {
    alert(message); 
  }
}