import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChangeRequestService } from '../../../common/services/change-request.service';

export interface RequestEmailChangeDialogData {
  currentEmail: string;
  currentUserName?: string;
  usernameSameAsEmail: boolean;
}

@Component({
  selector: 'app-request-email-change-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './request-email-change-dialog.component.html',
  styleUrl: './request-email-change-dialog.component.css',
})
export class RequestEmailChangeDialogComponent {
  newEmail = '';
  isSubmitting = false;

  constructor(
    private readonly dialogRef: MatDialogRef<RequestEmailChangeDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: RequestEmailChangeDialogData,
    private readonly changeRequestService: ChangeRequestService,
    private readonly snackBar: MatSnackBar,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onSubmit(): void {
    const trimmed = this.newEmail.trim();
    if (!trimmed) {
      this.showError('Please enter a new email address.');
      return;
    }
    if (!this.isValidEmail(trimmed)) {
      this.showError('Please enter a valid email address.');
      return;
    }
    if (trimmed.toLowerCase() === this.data.currentEmail.toLowerCase()) {
      this.showError('New email must be different from your current email.');
      return;
    }

    this.isSubmitting = true;
    this.changeRequestService.createEmailChangeRequest(trimmed).subscribe({
      next: () => {
        this.dialogRef.close(true);
        this.snackBar.open('Email change request submitted for review.', 'Close', {
          duration: 4000,
          panelClass: ['success-snackbar'],
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showError(this.extractErrorMessage(err));
      },
    });
  }

  private isValidEmail(value: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }

  private extractErrorMessage(err: unknown): string {
    const body = (err as { error?: { message?: string | string[] } })?.error;
    const msg = body?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
    return (err as { message?: string })?.message || 'Failed to submit request.';
  }
}
