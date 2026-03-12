import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserInviteService } from '../../../common/services/user-invite.service';

const MAX_EMAILS = 10;

@Component({
  selector: 'app-invite-user-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './invite-user-dialog.component.html',
  styleUrl: './invite-user-dialog.component.css',
})
export class InviteUserDialogComponent {
  form: FormGroup;
  isSubmitting = false;
  readonly maxEmails = MAX_EMAILS;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<InviteUserDialogComponent>,
    private readonly userInviteService: UserInviteService,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      emails: this.fb.array([
        this.fb.control('', [Validators.required, this.emailValidator()]),
      ]),
    });
  }

  private emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || typeof control.value !== 'string') return null;
      const trimmed = control.value.trim();
      if (!trimmed) return null;
      const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return pattern.test(trimmed) ? null : { email: true };
    };
  }

  get emailsArray(): FormArray {
    return this.form.get('emails') as FormArray;
  }

  getEmailControl(index: number): FormControl {
    return this.emailsArray.at(index) as FormControl;
  }

  addEmail(): void {
    if (this.emailsArray.length >= this.maxEmails) return;
    this.emailsArray.push(
      this.fb.control('', [this.emailValidator()]) // optional for additional fields
    );
  }

  get canAddMoreEmails(): boolean {
    return this.emailsArray.length < this.maxEmails;
  }

  removeEmail(index: number): void {
    if (this.emailsArray.length > 1) {
      this.emailsArray.removeAt(index);
    }
  }

  hasValidEmails(): boolean {
    const emails = this.emailsArray.controls
      .map((c) => (c.value ?? '').trim())
      .filter((e) => e.length > 0);
    if (emails.length === 0) return false;
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emails.every((e) => pattern.test(e));
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onSend(): void {
    const emails = this.emailsArray.controls
      .map((c) => (c.value ?? '').trim())
      .filter((e) => e.length > 0);
    if (emails.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const invalid = emails.some(
      (e) => !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e)
    );
    if (invalid || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.userInviteService.sendInvite(emails).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message;
        const errorMessage =
          Array.isArray(msg)
            ? msg.join(' ')
            : typeof msg === 'string'
              ? msg
              : err?.error && typeof err.error === 'string'
                ? err.error
                : err?.message || 'Failed to send invite. Please try again.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
