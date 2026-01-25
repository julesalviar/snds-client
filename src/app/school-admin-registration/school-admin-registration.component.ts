import {Component, OnInit} from '@angular/core';
import {ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors} from '@angular/forms';
import {Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialog} from '@angular/material/dialog';
import {UserService} from '../common/services/user.service';
import {ReferenceDataService} from '../common/services/reference-data.service';
import {controlHasErrorAndTouched} from "../common/form-utils";
import {switchMap} from "rxjs";
import {UserType} from "../registration/user-type.enum";
import {RegistrationErrorDialogComponent} from './registration-error-dialog.component';
import {InternalReferenceDataService} from "../common/services/internal-reference-data.service";

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
    MatAutocompleteModule,
  ]
})
export class SchoolAdminRegistrationComponent implements OnInit {
  registrationForm: FormGroup;
  passwordMismatch: boolean = false;
  defaultPassword: string = '123456'; // Default password
  success: boolean = false;

  regions: [{ value: string, label: string }] | [] | null | undefined = [];
  divisions: [{ value: string, label: string }] | [] | null | undefined = [];
  clusters: string[] = [];
  schoolOfferings: string[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog
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
    }, {validators: this.passwordMatchValidator});
  }

  ngOnInit(): void {
    this.initializeData();
  }

  private async initializeData(): Promise<void> {
    await this.referenceDataService.initialize();
    await this.internalReferenceDataService.initialize();

    this.loadRegions();
    this.loadDivisions();
    this.loadClusters();
    this.loadSchoolOfferings();
  }


  private loadSchoolOfferings(): void {
    const schoolOfferingData = this.referenceDataService.get('schoolOffering');
    if (schoolOfferingData && Array.isArray(schoolOfferingData)) {
      this.schoolOfferings = schoolOfferingData;
    }
  }

  private loadRegions(): void {
    const regionData: { code: string, name: string} = this.internalReferenceDataService.get('region');

    if (regionData) {
      this.regions = [{ 'value': regionData.code, 'label': regionData.code }];
      this.registrationForm.get('region')?.setValue(this.regions[0].value);
    }
  }

  private loadDivisions(): void {
    const divisionData = this.internalReferenceDataService.get('division');

    if (divisionData && divisionData.divisionName) {
      this.divisions = [{ 'value': divisionData.divisionName, 'label': divisionData.divisionName }];
      this.registrationForm.get('division')?.setValue(this.divisions[0].value);
    }
  }

  private loadClusters(): void {
    const clusterData: string[] = this.internalReferenceDataService.get('clusters');
    if (clusterData) {
      this.clusters = clusterData;
    }
  }

  passwordMatchValidator(form: FormGroup): ValidationErrors | null {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : {mismatch: true};
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showErrorDialog(message: string): void {
    this.dialog.open(RegistrationErrorDialogComponent, {
      width: '400px',
      position: {
        top: '20vh'
      },
      data: {message}
    });
  }

  onSubmit() {
    this.passwordMismatch = false; // Reset password mismatch flag
    if (this.registrationForm.valid) {
      const schoolData = {
        roles: [UserType.SchoolAdmin],
        activeRole: UserType.SchoolAdmin,
        userName: this.registrationForm.get('officialEmail')?.value,
        schoolName: this.registrationForm.get('schoolName')?.value,
        schoolId: this.registrationForm.get('schoolId')?.value,
        accountableName: this.registrationForm.get('accountableName')?.value,
        designation: this.registrationForm.get('designation')?.value,
        contactNumber: this.registrationForm.get('contactNumber')?.value,
        region: this.registrationForm.get('region')?.value,
        division: this.registrationForm.get('division')?.value,
        district: this.registrationForm.get('district')?.value,
        schoolOffering: this.registrationForm.get('schoolOffering')?.value,
        nameOfAccountablePerson: this.registrationForm.get('accountableName')?.value,
        password: this.registrationForm.get('password')?.value,
        email: this.registrationForm.get('officialEmail')?.value,
      };

      if (this.registrationForm.value.password !== this.registrationForm.value.confirmPassword) {
        this.passwordMismatch = true;
      } else {
        this.userService.register(schoolData).pipe(
          switchMap(() => this.router.navigate(['/sign-in']))
        ).subscribe({
          next: () => {
            this.success = true;
            this.showSuccessNotification('School admin registration successful! You can now sign in with your credentials.');
          },
          error: err => {
            this.success = false;
            console.error('Registration error', err);
            this.showErrorDialog('Registration failed. Please check your information and try again.');
          }
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
