import {Component, OnInit} from '@angular/core';
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
import {ReferenceDataService} from '../common/services/reference-data.service';
import {
  parseSectorReferenceData,
  SectorCategory,
  SECTOR_REF_DATA_KEY,
} from '../common/utils/sector-reference-data.util';

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
  passwordMismatch: boolean = false;
  success: boolean = false;
  availableOptions: string[] = [];
  showPassword: boolean = false;
  sectors: SectorCategory[] = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly referenceDataService: ReferenceDataService,
  ) {
    this.registrationForm = this.formBuilder.group({
      name: ['', Validators.required],
      sector: ['', Validators.required],
      subsector: [''],
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [DEFAULT_PASSWORD, [Validators.required, Validators.minLength(6)]],
      confirmPassword: [DEFAULT_PASSWORD, Validators.required]
    }, {validators: passwordMatchValidator()});
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
    this.passwordMismatch = false; // Reset password mismatch flag

    if (this.registrationForm.invalid) {
      console.log('Form is invalid', this.registrationForm.errors);
      return;
    }

    const userData = { ...this.registrationForm.value };
    console.log(userData);
    const registrationData: User = {
      ...userData,
      activeRole: UserType.StakeHolder,
      roles: [UserType.StakeHolder],
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
