import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { UserService } from '../common/services/user.service';
import { ReferenceDataService } from '../common/services/reference-data.service';
import { controlHasErrorAndTouched } from "../common/form-utils";
import { switchMap } from "rxjs";
import { UserType } from "../registration/user-type.enum";
import { RegionOption } from '../common/model/region.model';
import { DivisionOption } from '../common/model/division.model';

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

  regions: RegionOption[] = [];
  divisions: DivisionOption[] = [];
  clusters: string[] = [];
  disabledRegions: string[] = [];
  disabledDivisions: string[] = [];
  regionData: any[] = []; // Store full region data to access active field

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly referenceDataService: ReferenceDataService
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

  ngOnInit(): void {
    this.loadRegions();
    this.setupRegionChangeListener();
    this.setupDivisionChangeListener();
  }


  private async loadRegions(): Promise<void> {
    await this.referenceDataService.initialize();

    const regionData = this.referenceDataService.get('region');

    if (regionData) {
      let regionsArray: any[] = [];

      if (Array.isArray(regionData)) {
        regionsArray = regionData;
      } else if (regionData.value && Array.isArray(regionData.value)) {
        regionsArray = regionData.value;
      } else if (regionData.data && Array.isArray(regionData.data)) {
        regionsArray = regionData.data;
      } else {
        console.log('Unknown region data structure:', regionData);
        return;
      }

      this.regionData = regionsArray;

      this.regions = regionsArray
        .filter((region: any) => region.display !== false) // Only include if display is not false
        .map((region: any) => ({
          value: region.code ?? region.id ?? region.value,
          label: region.name ?? region.label,
          display: region.display
        }));
    }

    console.log('processed regions:', this.regions);
    console.log('regions length:', this.regions.length);

    // Set up disabled regions based on active field
    this.setupDisabledRegions();

    // Find the first active region for preselection
    const activeRegion = this.regionData.find((region: any) => region.active);
    if (activeRegion) {
      this.registrationForm.get('region')?.setValue(activeRegion.code);

      this.loadDivisions(activeRegion.code);

      if (activeRegion.divisions && activeRegion.divisions.length > 0) {
        const activeDivision = activeRegion.divisions.find((division: any) => division.active);
        if (activeDivision) {
          this.registrationForm.get('division')?.setValue(activeDivision.name);
        }
      }
    }
  }

  private setupRegionChangeListener(): void {
    this.registrationForm.get('region')?.valueChanges.subscribe(regionCode => {
      if (regionCode) {
        this.loadDivisions(regionCode);
        this.registrationForm.get('division')?.setValue('');
        this.registrationForm.get('district')?.setValue('');
        this.clusters = [];
      } else {
        this.divisions = [];
        this.clusters = [];
        this.registrationForm.get('division')?.setValue('');
        this.registrationForm.get('district')?.setValue('');
      }
    });
  }

  private setupDivisionChangeListener(): void {
    this.registrationForm.get('division')?.valueChanges.subscribe(divisionName => {
      if (divisionName) {
        this.loadClusters(divisionName);
        this.registrationForm.get('district')?.setValue('');
      } else {
        this.clusters = [];
        this.registrationForm.get('district')?.setValue('');
      }
    });
  }



  private async loadDivisions(regionCode: string): Promise<void> {
    try {
      await this.referenceDataService.initialize();

      const regionData = this.referenceDataService.get('region');

      if (regionData) {
        let regionsArray: any[] = [];

        if (Array.isArray(regionData)) {
          regionsArray = regionData;
        } else if (regionData.value && Array.isArray(regionData.value)) {
          regionsArray = regionData.value;
        } else if (regionData.data && Array.isArray(regionData.data)) {
          regionsArray = regionData.data;
        }

        const selectedRegion = regionsArray.find((region: any) =>
          region.code === regionCode
        );

        if (selectedRegion?.divisions) {
          this.divisions = selectedRegion.divisions
            .filter((division: any) => division.display !== false) // Only include if display is not false
            .map((division: any) => ({
              value: division.name,
              label: division.name,
              active: division.active,
              display: division.display
            }));

          this.setupDisabledDivisions();
        } else {
          this.divisions = [];
          this.disabledDivisions = [];
        }
      }
    } catch (error) {
      console.error('Error loading divisions:', error);
      this.divisions = [];
    }
  }

  private async loadClusters(divisionName: string): Promise<void> {
    try {
      await this.referenceDataService.initialize();

      const regionData = this.referenceDataService.get('region');

      if (regionData) {
        let regionsArray: any[] = [];

        if (Array.isArray(regionData)) {
          regionsArray = regionData;
        } else if (regionData.value && Array.isArray(regionData.value)) {
          regionsArray = regionData.value;
        } else if (regionData.data && Array.isArray(regionData.data)) {
          regionsArray = regionData.data;
        }

        const selectedRegion = regionsArray.find((region: any) =>
          region.code === this.registrationForm.get('region')?.value
        );

        if (selectedRegion?.divisions) {
          const selectedDivision = selectedRegion.divisions.find((division: any) =>
            division.name === divisionName
          );

          if (selectedDivision?.clusters) {
            this.clusters = selectedDivision.clusters;
          } else {
            this.clusters = [];
          }
        }
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
      this.clusters = [];
    }
  }

  private setupDisabledRegions(): void {
    this.disabledRegions = this.regions
      .filter(region => !this.isRegionActive(region.value))
      .map(region => region.value);
  }

  isRegionActive(regionValue: string): boolean {
    const region = this.regionData.find((r: any) => r.code === regionValue);
    return region ? region.active : false;
  }

  isRegionDisabled(regionValue: string): boolean {
    return this.disabledRegions.includes(regionValue);
  }

  private setupDisabledDivisions(): void {
    this.disabledDivisions = this.divisions
      .filter(division => !division.active)
      .map(division => division.value);
  }

  isDivisionDisabled(divisionValue: string): boolean {
    return this.disabledDivisions.includes(divisionValue);
  }

  // Custom validator for password matching
  passwordMatchValidator(form: FormGroup): ValidationErrors | null {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit() {
    console.log('Form submitted', this.registrationForm.value);
    this.passwordMismatch = false; // Reset password mismatch flag
    if (this.registrationForm.valid) {
      const schoolData = {
        role: UserType.SchoolAdmin,
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
        console.log('Passwords do not match.');
      } else {
        console.log(schoolData);
        this.userService.register(schoolData).pipe(
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
