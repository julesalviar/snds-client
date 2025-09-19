import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatRadioModule} from '@angular/material/radio';
import {MatIconModule} from '@angular/material/icon';
import {UserService} from '../common/services/user.service';
import {ErrorName} from '../common/enums/error-name';
import {switchMap} from "rxjs";
import {DEFAULT_PASSWORD} from "../config";
import {User} from "./user.model";
import {controlHasErrorAndTouched} from "../common/form-utils";
import {UserType} from "./user-type.enum";

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword
      ? {mismatch: true}
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
    MatIconModule,
  ]
})
export class RegistrationComponent {

  protected readonly ErrorName = ErrorName;

  registrationForm: FormGroup;
  passwordMismatch: boolean = false;
  success: boolean = false;
  availableOptions: string[] = [];
  showPassword: boolean = false;
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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly userService: UserService) {
    this.registrationForm = this.formBuilder.group({
      name: ['', Validators.required],
      sector: ['', Validators.required],
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [DEFAULT_PASSWORD, [Validators.required, Validators.minLength(6)]],
      confirmPassword: [DEFAULT_PASSWORD, Validators.required],
    }, {validators: passwordMatchValidator()});
  }

  controlHasErrorAndTouched(controlName: string, errorName: string): boolean {
    return controlHasErrorAndTouched(this.registrationForm, controlName, errorName);
  }

  // For selection from category
  onCategoryChange(category: string) {
    const selectedSector = this.sectors.find(sector => sector.category === category);
    this.availableOptions = selectedSector ? selectedSector.options : [];
    this.registrationForm.get('sector')?.setValue(''); // Reset the selected option
  }

  onSubmit() {
    this.passwordMismatch = false; // Reset password mismatch flag

    if (this.registrationForm.invalid) {
      console.log('Form is invalid', this.registrationForm.errors);
      return;
    }

    const userData = { ...this.registrationForm.value };
    const registrationData: User = {
      ...userData,
      role: UserType.StakeHolder,
      userName: userData.email // TODO: we use email as username
    };
    console.log(registrationData);

    this.userService.register(registrationData).pipe(
      switchMap(() => this.router.navigate(['/sign-in']))
    ).subscribe({
      next: () => this.success = true,
      error: err => { this.success = false; console.error('Registration error', err); }
    });
  }
}
