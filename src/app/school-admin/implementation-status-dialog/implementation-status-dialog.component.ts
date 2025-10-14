import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-implementation-status-dialog',
  standalone: true,
  templateUrl: './implementation-status-dialog.component.html',
  styleUrls: ['./implementation-status-dialog.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    MatDatepickerToggle
  ],
})
export class ImplementationStatusDialogComponent {
  selectedStatus: string = '';
  selectedDate: Date | null = null;
  statusOptions: string[] = [
    '5% Complete', '10% Complete', '15% Complete', '20% Complete', '25% Complete', '30% Complete', '35% Complete', '40% Complete', '45% Complete', '50% Complete',
    '55% Complete', '60% Complete', '65% Complete', '70% Complete', '75% Complete', '80% Complete', '85% Complete', '90% Complete',
    'Pending', 'Cancelled', 'Looking for Partners'
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly dialogRef: MatDialogRef<ImplementationStatusDialogComponent>
  ) {  this.selectedStatus = data.implementationStatus; }
  save(): void {
    // Emit the updated status and close the dialog
    this.dialogRef.close({
      implementationStatus: this.selectedStatus,
      dateModified: this.selectedDate
    });
  }

  close(): void {
    this.dialogRef.close(); // Close without saving
  }
  ngOnInit(): void {
    this.selectedDate = new Date();
    this.selectedStatus = this.data.implementationStatus || '';
  }
  update(): void {
    console.log('Updating status to:', this.selectedStatus);
  }

}
