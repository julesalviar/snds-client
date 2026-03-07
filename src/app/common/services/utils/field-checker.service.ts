import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolService } from '../school.service';
import { AuthService } from '../../../auth/auth.service';
import { FormGroup } from '@angular/forms';
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

  checkRequiredProfileData(): Promise<boolean> {
  const schoolId = this.authService.getSchoolId();

  if (schoolId) {
    return new Promise((resolve) => {
      this.schoolService.getSchoolById(schoolId).subscribe((school) => {
        const hasLogo = !!school.logoUrl; // Check for uploaded logo
        const hasLocation = !!school.location; // Check for location coordinates

        if (!hasLogo || !hasLocation) {
          this.openSnackbar('Please upload School logo / input the School location coordinates To Access other Functions. Check Edit Profile');
        }

        resolve(hasLogo && hasLocation); 
      });
    });
  }

  return Promise.resolve(false); 
}
 public openSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 8000 });
  }
}