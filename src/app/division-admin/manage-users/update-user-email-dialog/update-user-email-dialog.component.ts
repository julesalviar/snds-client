import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserListItem } from '../../../registration/user.model';
import { UserService } from '../../../common/services/user.service';
import { shouldHideUserEmail } from '../../../common/utils/user-display.util';

export interface UpdateUserEmailDialogData {
  user: UserListItem;
}

@Component({
  selector: 'app-update-user-email-dialog',
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
  templateUrl: './update-user-email-dialog.component.html',
  styleUrl: './update-user-email-dialog.component.css',
})
export class UpdateUserEmailDialogComponent {
  readonly oldEmail: string;
  newEmail = '';
  isSubmitting = false;

  constructor(
    private readonly dialogRef: MatDialogRef<UpdateUserEmailDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UpdateUserEmailDialogData,
    private readonly userService: UserService,
    private readonly snackBar: MatSnackBar
  ) {
    this.oldEmail = shouldHideUserEmail(data.user)
      ? ''
      : (data.user?.email ?? '').trim();
    this.newEmail = this.oldEmail;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onUpdate(): void {
    const trimmed = this.newEmail.trim();
    if (!trimmed) {
      this.snackBar.open('Please enter a new email address.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }
    if (!this.isValidEmail(trimmed)) {
      this.snackBar.open('Please enter a valid email address.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }
    if (trimmed.toLowerCase() === this.oldEmail.toLowerCase()) {
      this.snackBar.open('New email must be different from the current email.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    const userId = this.data.user?._id;
    if (!userId) {
      this.snackBar.open('Cannot update email: missing user ID.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.isSubmitting = true;
    this.userService.updateManagedUserEmail(userId, trimmed).subscribe({
      next: () => {
        this.dialogRef.close(true);
        this.snackBar.open('Email and username updated successfully.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message;
        const text = Array.isArray(msg)
          ? msg.join(' ')
          : typeof msg === 'string'
            ? msg
            : err?.error && typeof err.error === 'string'
              ? err.error
              : err?.message || 'Failed to update email.';
        this.snackBar.open(text, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  private isValidEmail(value: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
  }
}
