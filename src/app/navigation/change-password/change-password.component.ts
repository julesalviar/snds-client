import {CommonModule} from '@angular/common';
import {Component, OnDestroy} from '@angular/core';
import {ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import {MatError, MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {Router} from "@angular/router";
import {Subject, takeUntil} from "rxjs";
import {UserService} from "../../common/services/user.service";
import {NavigationService} from "../../common/services/navigation.service";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-change-password',
  standalone: true,
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
  imports: [MatFormFieldModule, MatError, MatInputModule, CommonModule, ReactiveFormsModule, MatButtonModule, MatIcon]
})
export class ChangePasswordComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  changePasswordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, {validators: this.passwordMatchValidator});

  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly navigationService: NavigationService,
    private readonly snackBar: MatSnackBar,
  ) {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator(form: any) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value ? null : {mismatch: true};
  }

  toggleCurrentPasswordVisibility() {
    this.hideCurrentPassword = !this.hideCurrentPassword;
  }

  toggleNewPasswordVisibility() {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  onSubmitChangePassword() {
    if (this.changePasswordForm.valid) {
      const currentPassword = this.changePasswordForm.value.currentPassword ?? '';
      const newPassword = this.changePasswordForm.value.newPassword ?? '';

      this.userService.changePassword(currentPassword, newPassword)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.showSuccessNotification('Password changed successfully!');
            this.router.navigateByUrl(this.navigationService.getPreviousUrl());
          },
          error: (err: any) => {
            this.showErrorNotification('Error changing password!');
            console.error('Error changing password:', err);
          }
        });

    }
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showErrorNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}
