import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolService } from '../school.service';
import { AuthService } from '../../../auth/auth.service';
import { FormGroup } from '@angular/forms';
import {firstValueFrom, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FieldCheckerService {

  constructor(
    private snackBar: MatSnackBar, 
    private authService: AuthService, 
    private schoolService: SchoolService
  ) {}

  checkRequiredFields(form: FormGroup): void {
    // Check for required fields
    Object.keys(form.controls).forEach(field => {
      const control = form.get(field);
      if (control && control.errors && control.errors['required']) {
        control.markAsTouched(); 
      }
    });
  }

   checkRequiredProfileData(): Promise<{ isComplete: boolean }> {
    const schoolId = this.authService.getSchoolId();
    console.log('Fetching school data for ID:', schoolId); // Log the school ID

    if (schoolId) {
        return firstValueFrom(
            this.schoolService.getSchoolById(schoolId).pipe(
                map(school => {
                    const hasLogo = !!school.logoUrl;
                    const hasLocation = !!school.location;
                    return { isComplete: hasLogo && hasLocation };
                }),
                catchError(() => {
                    console.error('Error fetching school data, returning incomplete status.');
                    return of({ isComplete: false });
                })
            )
        );
    }

    return Promise.resolve({ isComplete: false });
}
  public openSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 8000 });
  }

  /** Method to check and notify profile incompleteness on login */
  notifyProfileOnLogin(): void {
    // Only check and notify for SchoolAdmin users
    if (!this.authService.isUserSchoolAdmin()) {
      return; // Exit if not a SchoolAdmin
    }

    this.checkRequiredProfileData().then(({ isComplete }) => {
      if (!isComplete) {
        this.openSnackbar('Please upload School logo / input the School location coordinates to access other functions. Check Edit Profile');
      }
    });
  }
}