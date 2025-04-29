import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { UserService } from '../services/user.service';
import { SharedDataService } from '../services/shared-data.service';

@Component({
  selector: 'app-school-admin-registration',
  standalone: true,
  templateUrl: './school-admin-registration.component.html',
  styleUrls: ['./school-admin-registration.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule, 
    MatButtonModule,
    MatCardModule,
  ]
})
export class SchoolAdminRegistrationComponent {
  registrationForm: FormGroup;
  passwordMismatch: boolean = false; 
  defaultPassword: string = '123456'; // Default password

  constructor(private fb: FormBuilder, private router: Router, private userService: UserService, private sharedDataService: SharedDataService) {
    this.registrationForm = this.fb.group({
      region: this.fb.control('', Validators.required),
      division: this.fb.control('', Validators.required),
      district: this.fb.control('', Validators.required),
      schoolName: this.fb.control('', Validators.required),
      schoolId: this.fb.control('', Validators.required),
      schoolOffering: this.fb.control('', Validators.required),
      accountableName: this.fb.control('', Validators.required),
      designation: this.fb.control('', Validators.required),
      contactNumber: this.fb.control('', Validators.required),
      officialEmail: this.fb.control('', [Validators.required, Validators.email]),
      password: [this.defaultPassword, [Validators.required, Validators.minLength(6)]],
      confirmPassword: [this.defaultPassword, Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator for password matching
  passwordMatchValidator(form: FormGroup): ValidationErrors | null {
    return form.get('password')?.value === form.get('confirmPassword')?.value 
      ? null : { mismatch: true };
  }

  onSubmit() {
    this.passwordMismatch = false; // Reset password mismatch flag
    if (this.registrationForm.valid) {
      this.sharedDataService.setSchoolName(this.registrationForm.value.schoolName);
    }

    // Check if passwords match
    if (this.registrationForm.value.password !== this.registrationForm.value.confirmPassword) {
      this.passwordMismatch = true;
      console.log('Passwords do not match.');
    } else if (this.registrationForm.valid) {
      const registrationData = this.registrationForm.value;

      this.userService.register(
        registrationData.name,
        registrationData.email,
        registrationData.password,
      );

      console.log('Form submitted', registrationData);
      this.router.navigate(['/sign-in']); // Redirect to sign-in page after registration
    } else {
      console.log('Form is invalid', this.registrationForm.errors);
    }
  }
}