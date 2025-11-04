import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDeleteData {
  title?: string;
  message?: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './confirm-delete-dialog.component.html',
  styleUrl: './confirm-delete-dialog.component.css'
})
export class ConfirmDeleteDialogComponent {
  title: string;
  message: string;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteData
  ) {
    this.title = data?.title || 'Confirm Deletion';
    this.message = data?.message || 'This will delete the record. Are you sure?';
  }

  onCancel(): void {
    this.dialogRef.close(false); // Close dialog and return false
  }

  onConfirm(): void {
    this.dialogRef.close(true); // Close dialog and return true
  }
}
