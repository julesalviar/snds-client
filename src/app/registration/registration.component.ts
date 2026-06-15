import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatRadioModule} from '@angular/material/radio';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UserService} from '../common/services/user.service';
import {ErrorName} from '../common/enums/error-name';
import {finalize, switchMap} from 'rxjs';
import {controlHasErrorAndTouched} from '../common/form-utils';
import {UserType} from "./user-type.enum";
import {ReferenceDataService} from '../common/services/reference-data.service';
import {
  parseSectorReferenceData,
  SectorCategory,
  SECTOR_REF_DATA_KEY,
} from '../common/utils/sector-reference-data.util';

@Component({
  selector: 'app-registration',
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
export class RegistrationComponent implements OnInit {

  protected readonly ErrorName = ErrorName;

  registrationForm: FormGroup;
  success: boolean = false;
  isSubmitting = false;
  errorMessage = '';
  availableOptions: string[] = [];
  showPassword: boolean = false;
  sectors: SectorCategory[] = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.registrationForm = this.formBuilder.group({
      name: ['', Validators.required],
      sector: ['', Validators.required],
      subsector: [''],
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.referenceDataService.initialize();
    this.sectors = parseSectorReferenceData(
      this.referenceDataService.get(SECTOR_REF_DATA_KEY),
    );
  }

  controlHasErrorAndTouched(controlName: string, errorName: string): boolean {
    return controlHasErrorAndTouched(this.registrationForm, controlName, errorName);
  }

  onCategoryChange(category: string) {
    const selectedSector = this.sectors.find(sector => sector.category === category);
    this.availableOptions = selectedSector ? selectedSector.options : [];
    const subsectorControl = this.registrationForm.get('subsector');
    subsectorControl?.setValue(''); // Reset the selected subsector

    if (this.availableOptions.length > 0) {
      subsectorControl?.setValidators(Validators.required);
    } else {
      subsectorControl?.clearValidators();
    }
    subsectorControl?.updateValueAndValidity();
  }

  onSubmit() {
    this.errorMessage = '';
    this.success = false;

    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const userData = { ...this.registrationForm.value };
    const registrationData = {
      ...userData,
      activeRole: UserType.StakeHolder,
      roles: [UserType.StakeHolder],
      userName: userData.email,
    };

    this.isSubmitting = true;
    this.userService.register(registrationData).pipe(
      switchMap((response) => {
        this.success = true;
        const message =
          response?.message ??
          'Registration successful! Check your email to confirm your account, then sign in.';
        this.snackBar.open(message, 'Close', {
          duration: 6000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });
        return this.router.navigate(['/sign-in']);
      }),
      finalize(() => {
        this.isSubmitting = false;
      }),
    ).subscribe({
      error: (err) => {
        this.success = false;
        this.errorMessage =
          err?.error?.message ??
          (Array.isArray(err?.error?.message)
            ? err.error.message.join(', ')
            : 'Registration failed. Please check your information and try again.');
        console.error('Registration error', err);
      },
    });
  }
}
