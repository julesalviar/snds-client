import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserListItem } from '../../../registration/user.model';
import { UserService } from '../../../common/services/user.service';
import { InternalReferenceDataService } from '../../../common/services/internal-reference-data.service';
import {
  parseUserTagsRefData,
  USER_TAGS_REF_DATA_KEY,
  UserTagRef,
} from '../../../common/utils/user-tags-reference-data.util';

export interface ManageUserTagsDialogData {
  user: UserListItem;
}

@Component({
  selector: 'app-manage-user-tags-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './manage-user-tags-dialog.component.html',
  styleUrl: './manage-user-tags-dialog.component.css',
})
export class ManageUserTagsDialogComponent implements OnInit {
  readonly displayName: string;
  tagOptions: UserTagRef[] = [];
  selectedTags: string[] = [];
  isSubmitting = false;
  isLoadingOptions = true;

  constructor(
    private readonly dialogRef: MatDialogRef<ManageUserTagsDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ManageUserTagsDialogData,
    private readonly userService: UserService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly snackBar: MatSnackBar,
  ) {
    const user = data.user;
    this.displayName = user?.name || user?.userName || user?.email || 'User';
    this.selectedTags = [...(user?.tags ?? [])];
  }

  ngOnInit(): void {
    this.internalReferenceDataService.initialize().then(() => {
      const raw = this.internalReferenceDataService.get(USER_TAGS_REF_DATA_KEY);
      this.tagOptions = parseUserTagsRefData(raw);
      this.isLoadingOptions = false;
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onSave(): void {
    const userId = this.data.user?._id;
    if (!userId) {
      this.snackBar.open('Cannot update tags: missing user ID.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.isSubmitting = true;
    this.userService.updateManagedUserTags(userId, this.selectedTags).subscribe({
      next: () => {
        this.dialogRef.close(true);
        this.snackBar.open('Tags updated successfully.', 'Close', {
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
              : err?.message || 'Failed to update tags.';
        this.snackBar.open(text, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
