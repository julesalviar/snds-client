import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../auth/auth.service';
import { UserType } from '../../registration/user-type.enum';
import { DocumentViewerComponent } from '../document-viewer/document-viewer.component';

interface ContributionItem {
  schoolYear: string;
  school: string;
  specificContribution: string;
  amount: string;
  movs: string;
  images: any[];
}

interface StakeholderProfile {
  _id: string;
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
  imports: [CommonModule, MatDialogModule, MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule]
})
export class ContributionDialogComponent implements OnInit {
  displayedColumns = ['schoolYear', 'school', 'specificContribution', 'amount', 'movs'];
  contributions: ContributionItem[] = [];
  dataSource = new MatTableDataSource<ContributionItem>();

  constructor(
    public dialogRef: MatDialogRef<ContributionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { stakeholder: StakeholderProfile; contributions: ContributionItem[] },
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.contributions = data.contributions;
    this.dataSource.data = this.contributions;
    this.setColumnsBasedOnRole();
  }

  ngOnInit(): void {
    
    setTimeout(() => {
      this.dataSource.data = [...this.contributions];
    }, 0);
  }

  // set column base on role
  private setColumnsBasedOnRole(): void {
    const baseColumns = ['schoolYear', 'specificContribution', 'amount', 'movs'];
    const activeRole = this.authService.getActiveRole();

    if (activeRole === UserType.DivisionAdmin) {
      this.displayedColumns = ['schoolYear', 'school', 'specificContribution', 'amount', 'movs'];
    } else {
      this.displayedColumns = baseColumns;
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  viewDocuments(item: ContributionItem): void {
  
    if (!item.images || item.images.length === 0) {
      return;
    }

    this.dialog.open(DocumentViewerComponent, {
      width: '70vw',
      maxWidth: '70vw',
      height: '70vh',
      panelClass: 'document-viewer-dialog',
      data: {
        title: `Documents for ${item.specificContribution}`,
        images: item.images
      }
    });
  }
}