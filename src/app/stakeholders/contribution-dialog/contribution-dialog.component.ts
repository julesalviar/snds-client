import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
interface ContributionItem {
  schoolYear: string;
  school: string;
  specificContribution: string;
  amount: string;
  movs: string;
}
interface StakeholderProfile {
  contribution: string;
  name: string;
  contactNumber: string;
  address: string;
  engagementStatus: 'Engaged' | 'Not Engaged';
  schoolYear: string;
  sector: 'Private Sector' | 'Public Sector' | 'Civil Society Organization' | 'International';
  contributions: ContributionItem[];
}

@Component({
  selector: 'app-contribution-dialog',
  templateUrl: './contribution-dialog.component.html',
  styleUrls: ['./contribution-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTableModule, MatButtonModule, MatIconModule]
})
export class ContributionDialogComponent {
  displayedColumns = ['schoolYear', 'school', 'specificContribution', 'amount', 'movs'];
  contributions: ContributionItem[] = [];

 constructor(
    public dialogRef: MatDialogRef<ContributionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { stakeholder: StakeholderProfile; contributions: ContributionItem[] }
  ) {
    this.contributions = data.contributions;
  }

  closeDialog(): void {
    this.dialogRef.close();
}
}