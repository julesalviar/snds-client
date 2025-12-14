import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpService } from '../common/services/http.service';
import { API_ENDPOINT } from '../common/api-endpoints';

@Component({
  selector: 'app-forgot-password-dialog',
  standalone: true,
  templateUrl: './forgot-password-dialog.component.html',
  styleUrls: ['./forgot-password-dialog.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDialogActions,
    MatDialogContent,
    MatProgressSpinnerModule,
  ]
})
export class ForgotPasswordDialogComponent {
  forgotPasswordForm: FormGroup;
  isSubmitting: boolean = false;
  isError: boolean = false;
  isSuccess: boolean = false;
  errorMessage: string = '';

  constructor(
    private dialogRef: MatDialogRef<ForgotPasswordDialogComponent>,
    private formBuilder: FormBuilder,
    private httpService: HttpService
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, this.customEmailValidator()]],
    });
  }

  private customEmailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const trimmedValue = control.value.trim();
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailPattern.test(trimmedValue) ? null : { email: true };
    };
  }

  onSend() {
    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.get('email')?.value?.trim() ?? '';
      
      this.isSubmitting = true;
      this.isError = false;
      this.isSuccess = false;
      this.errorMessage = '';

      this.httpService.post(API_ENDPOINT.mail.resetPassword, { to: email }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isSuccess = true;
          // Keep dialog open to show success message, user can close it
        },
        error: (error: any) => {
          this.isSubmitting = false;
          this.isError = true;
          this.errorMessage = error.error?.message ?? 'Failed to send reset password email. Please try again.';
          console.error('Reset password request failed:', error);
        }
      });
    } else {
      this.forgotPasswordForm.markAllAsTouched();
    }
  }

  onClose() {
    this.dialogRef.close(this.isSuccess ? this.forgotPasswordForm.get('email')?.value : null);
  }
}