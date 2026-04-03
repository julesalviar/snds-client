import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { ContributionDialogComponent } from '../stakeholders/contribution-dialog/contribution-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
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
  selector: 'app-stakeholders-profile',
  templateUrl: './stakeholders-profile.component.html',
  styleUrls: ['./stakeholders-profile.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    FormsModule,
    MatPaginator,
    MatDialogModule
  ]
})
export class StakeholdersProfileComponent implements AfterViewInit{
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit(): void {
  this.dataSource.paginator = this.paginator;
  }
  engagedCount = 0;
  notEngagedCount = 0;
  schoolYearOptions = ['All School Year', '2025-2026', '2026-2027'];
  sectorOptions = ['All Sectors', 'Private Sector', 'Public Sector', 'Civil Society Organization', 'International'];
  engagementOptions = ['All', 'Engaged', 'Not Engaged'];

  selectedSchoolYear = 'All School Year';
  selectedSector = 'All Sectors';
  selectedEngagement = 'All';

  displayedColumns: string[] = ['contribution', 'name', 'contactNumber', 'address', 'engagementStatus'];
  //sample data
  allRecords: StakeholderProfile[] = [
  {
    contribution: 'Technology',
    name: 'Juan dela Cruz',
    contactNumber: '09171234567',
    address: 'Barangay 1, Gensan',
    engagementStatus: 'Engaged',
    schoolYear: '2025-2026',
    sector: 'Public Sector',
    contributions: [
      {
        schoolYear: '2025-2026',
        school: 'Gensan National High School',
        specificContribution: 'Laptops',
        amount: '₱15,000',
        movs: 'link to pictures'
      },
      
    ]
  },
  {
    contribution: 'Office Supplies',
    name: 'Maria Santos',
    contactNumber: '09179876543',
    address: 'Barangay 2, Gensan',
    engagementStatus: 'Not Engaged',
    schoolYear: '2026-2027',
    sector: 'Private Sector',
    contributions: [
      {
        schoolYear: '2025-2026',
        school: 'Eastside Elementary',
        specificContribution: 'Bond Paper',
        amount: '₱5,200',
        movs: 'link to pictures'
      }
    ]
  }
];
  pageIndex: number = 0;
  pageSize: number = 25;

constructor(private dialog: MatDialog) {}
openContributionDialog(row: StakeholderProfile): void {
this.dialog.open(ContributionDialogComponent, {
width: '95vw',
height: '50vh',
maxWidth: '95vw',
maxHeight: '50vh',
panelClass: 'full-screen-dialog',
data: { stakeholder: row, contributions: row.contributions }
});
}

  dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);

  applyFilter(): void {
    const year = this.selectedSchoolYear;
    const sector = this.selectedSector;
    const engagement = this.selectedEngagement;

    this.dataSource.data = this.allRecords.filter((row) => {
      const matchYear = year === 'All School Year' || row.schoolYear === year;
      const matchSector = sector === 'All Sectors' || row.sector === sector;
      const matchEngagement = engagement === 'All' || row.engagementStatus === engagement;

      return matchYear && matchSector && matchEngagement;
    });
    this.engagedCount = this.dataSource.data.filter(r => r.engagementStatus === 'Engaged').length;
    this.notEngagedCount = this.dataSource.data.filter(r => r.engagementStatus === 'Not Engaged').length;
    
    if (this.paginator) {this.paginator.pageIndex = 0;}
  }

  resetFilters(): void {
    this.selectedSchoolYear = 'All School Year';
    this.selectedSector = 'All Sectors';
    this.selectedEngagement = 'All';
    this.applyFilter();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}

