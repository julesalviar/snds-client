import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpService } from '../common/services/http.service';
import { API_ENDPOINT } from '../common/api-endpoints';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ]
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  token: string | null = null;
  isSubmitting: boolean = false;
  isError: boolean = false;
  isSuccess: boolean = false;
  errorMessage: string = '';
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private httpService: HttpService,
    private snackBar: MatSnackBar
  ) {
    this.resetPasswordForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Extract token from query parameters
    this.token = this.route.snapshot.queryParams['token'];
    
    if (!this.token) {
      this.isError = true;
      this.errorMessage = 'Invalid or missing reset token. Please request a new password reset.';
    }
  }

  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (!newPassword || !confirmPassword) {
      return null;
    }
    
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  toggleNewPasswordVisibility() {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.token) {
      const newPassword = this.resetPasswordForm.get('newPassword')?.value;
      
      this.isSubmitting = true;
      this.isError = false;
      this.isSuccess = false;
      this.errorMessage = '';

      this.httpService.post(API_ENDPOINT.mail.resetPasswordVerify, {
        token: this.token,
        newPassword: newPassword
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isSuccess = true;
          this.showSuccessNotification('Password reset successfully! Redirecting to sign in...');
          
          // Redirect to sign-in after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/sign-in']);
          }, 2000);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          this.isError = true;
          this.errorMessage = error.error?.message ?? 'Failed to reset password. The token may be invalid or expired. Please request a new password reset.';
          console.error('Reset password failed:', error);
        }
      });
    } else {
      this.resetPasswordForm.markAllAsTouched();
    }
  }

  goToSignIn() {
    this.router.navigate(['/sign-in']);
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }
}

