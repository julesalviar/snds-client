import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { UserService } from '../common/services/user.service';
import { SharedDataService } from '../common/services/shared-data.service';
import {controlHasErrorAndTouched} from "../common/form-utils";
import {switchMap} from "rxjs";
import {UserType} from "../registration/user-type.enum";

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
  success: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private sharedDataService: SharedDataService
  ) {
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
      const schoolData = {
        schoolName: this.registrationForm.get('schoolName')?.value,
        schoolId: this.registrationForm.get('schoolId')?.value,
        accountableName: this.registrationForm.get('accountableName')?.value,
        designation: this.registrationForm.get('designation')?.value,
        contactNumber: this.registrationForm.get('contactNumber')?.value,
      };

      // Add school data to UserService
      this.userService.addSchool(schoolData);

      // Check if passwords match
      if (this.registrationForm.value.password !== this.registrationForm.value.confirmPassword) {
        this.passwordMismatch = true;
        console.log('Passwords do not match.');
      } else {
        const registrationData = {
          type: UserType.SchoolAdmin,
          name: this.registrationForm.get('schoolName')?.value,
          email: this.registrationForm.get('officialEmail')?.value,
          password: this.registrationForm.get('password')?.value,
        };

        this.userService.register(registrationData).pipe(
          switchMap(() => this.router.navigate(['/sign-in']))
        ).subscribe({
          next: () => this.success = true,
          error: err => { this.success = false; console.error('Registration error', err); }
        });
      }
    } else {
      console.log('Form is invalid', this.registrationForm.errors);
    }
  }

  controlHasErrorAndTouched(controlName: string, errorName: string): boolean {
    return controlHasErrorAndTouched(this.registrationForm, controlName, errorName);
  }
}
