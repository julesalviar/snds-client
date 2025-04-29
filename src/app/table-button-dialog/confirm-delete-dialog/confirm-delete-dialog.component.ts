import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogActions } from '@angular/material/dialog';
import { MatDialogContent} from '@angular/material/dialog';
@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatDialogActions, MatDialogContent],
  templateUrl: './confirm-delete-dialog.component.html',
  styleUrl: './confirm-delete-dialog.component.css'
})
export class ConfirmDeleteDialogComponent {
  constructor(public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(false); // Close dialog and return false
  }

  onConfirm(): void {
    this.dialogRef.close(true); // Close dialog and return true
  }
}
