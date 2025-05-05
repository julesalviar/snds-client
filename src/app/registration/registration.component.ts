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
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatRadioModule} from '@angular/material/radio';
import {MatIconModule} from '@angular/material/icon';
import {UserService} from '../services/user.service';
import {ErrorName} from '../common/enums/error-name';

// Password match validator function
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
    NgOptimizedImage,
  ]
})
export class RegistrationComponent {

  protected readonly ErrorName = ErrorName;

  name: string = '';
  registrationForm: FormGroup;
  passwordMismatch: boolean = false;
  isSuccess: boolean = false;
  availableOptions: string[] = [];
  // Default password
  defaultPassword: string = '123456';
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

  constructor(private readonly formBuilder: FormBuilder, private readonly router: Router, private readonly userService: UserService) {
    // Initialize the registration form with validations
    this.registrationForm = this.formBuilder.group({
      name: ['', Validators.required],
      sector: ['', Validators.required],
      selectedOption: ['', Validators.required],
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [this.defaultPassword, [Validators.required, Validators.minLength(6)]],
      confirmPassword: [this.defaultPassword, Validators.required],
    }, {validators: passwordMatchValidator()});
  }

  controlHasErrorAndTouched(controlName: string, errorName: string): boolean {
    const control = this.registrationForm.get(controlName);
    return !!control?.hasError(errorName) && (control?.touched || control?.dirty);
  }

  // For selection from category
  onCategoryChange(category: string) {
    const selectedSector = this.sectors.find(sector => sector.category === category);
    this.availableOptions = selectedSector ? selectedSector.options : [];
    this.registrationForm.get('selectedOption')?.setValue(''); // Reset the selected option
  }

  onSubmit() {
    this.passwordMismatch = false; // Reset password mismatch flag

    // Check if passwords match
    if (this.registrationForm.value.password !== this.registrationForm.value.confirmPassword) {
      this.passwordMismatch = true;
      console.log('Passwords do not match.');
    } else if (this.registrationForm.valid) {
      const registrationData = this.registrationForm.value;

      this.userService.register(
        registrationData.name,
        registrationData.email,
        registrationData.password
      );

      this.router.navigate(['/sign-in']); // Redirect to sign-in page after registration
    } else {
      console.log('Form is invalid', this.registrationForm.errors);
    }
  }
}
