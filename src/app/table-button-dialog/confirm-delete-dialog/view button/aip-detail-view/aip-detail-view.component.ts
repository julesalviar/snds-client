import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardTitle, MatCard, MatCardContent } from '@angular/material/card';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-aip-detail-view',
  standalone: true,
  imports: [ MatCardTitle, MatCard, MatCardContent, ReactiveFormsModule, CommonModule ],
  templateUrl: './aip-detail-view.component.html',
  styleUrl: './aip-detail-view.component.css'
})
export class AipDetailViewComponent {
  constructor(
    private dialogRef: MatDialogRef<AipDetailViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}

