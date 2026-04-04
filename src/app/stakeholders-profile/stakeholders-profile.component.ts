import { Component, ViewChild, AfterViewInit, OnInit } from '@angular/core';
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
import { getSchoolYearOptions, getDefaultSchoolYear } from '../common/date-utils';
import { UserService } from '../common/services/user.service';
import { EngagementService } from '../common/services/engagement.service';
import { Engagement } from '../common/model/engagement.model';
import { AuthService } from '../auth/auth.service';
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
export class StakeholdersProfileComponent implements AfterViewInit, OnInit{
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit(): void {
  this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.loadStakeholders();
  }
  engagedCount = 0;
  notEngagedCount = 0;
  schoolYearOptions = ['All School Year', ...getSchoolYearOptions()];
  sectorOptions = ['All Sectors', 'Private Sector', 'Public Sector', 'Civil Society Organization', 'International'];
  engagementOptions = ['All', 'Engaged', 'Not Engaged'];

  selectedSchoolYear = getDefaultSchoolYear();
  selectedSector = 'All Sectors';
  selectedEngagement = 'All';

  displayedColumns: string[] = ['contribution', 'name', 'contactNumber', 'address', 'engagementStatus'];
  allRecords: StakeholderProfile[] = [];
  pageIndex: number = 0;
  pageSize: number = 25;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private engagementService: EngagementService,
    private authService: AuthService
  ) { }

  openContributionDialog(row: StakeholderProfile): void {
    this.engagementService.getAllEngagement(
      1,
      100, // Get up to 100 contributions
      row._id, // stakeholderUserId
      undefined, // schoolYear
      undefined, // specificContribution
      undefined, // schoolId
      undefined, // startDate
      undefined, // endDate
      row.sector // sector
    ).subscribe({
      next: (engagementResponse) => {
        if (!engagementResponse || !engagementResponse.data || engagementResponse.data.length === 0) {
          this.engagementService.getAllEngagement(
            1,
            100,
            row._id,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined // no sector filter
          ).subscribe({
            next: (responseWithoutSector) => {
              if (responseWithoutSector?.data?.length > 0) {
                const contributions = responseWithoutSector.data.map((engagement: Engagement) => ({
                  schoolYear: engagement.schoolYear || 'N/A',
                  school: this.getSchoolName(engagement.schoolId),
                  specificContribution: engagement.specificContribution || 'N/A',
                  amount: engagement.amount ? `₱${engagement.amount.toLocaleString()}` : '₱0',
                  movs: 'View Documents',
                  images: this.getImagesFromEngagement(engagement)
                }));

                this.dialog.open(ContributionDialogComponent, {
                  width: '95vw',
                  height: '50vh',
                  maxWidth: '95vw',
                  maxHeight: '50vh',
                  panelClass: 'full-screen-dialog',
                  data: { stakeholder: row, contributions }
                });
              } else {
                this.dialog.open(ContributionDialogComponent, {
                  width: '95vw',
                  height: '50vh',
                  maxWidth: '95vw',
                  maxHeight: '50vh',
                  panelClass: 'full-screen-dialog',
                  data: { stakeholder: row, contributions: [] }
                });
              }
            },
            error: (error) => {
              this.dialog.open(ContributionDialogComponent, {
                width: '95vw',
                height: '50vh',
                maxWidth: '95vw',
                maxHeight: '50vh',
                panelClass: 'full-screen-dialog',
                data: { stakeholder: row, contributions: [] }
              });
            }
          });
          return;
        }

        const contributions = engagementResponse.data.map((engagement: Engagement) => ({
          schoolYear: engagement.schoolYear || 'N/A',
          school: this.getSchoolName(engagement.schoolId),
          specificContribution: engagement.specificContribution || 'N/A',
          amount: engagement.amount ? `₱${engagement.amount.toLocaleString()}` : '₱0',
          movs: 'View Documents',
          images: this.getImagesFromEngagement(engagement)
        }));

        this.dialog.open(ContributionDialogComponent, {
          width: '95vw',
          height: '50vh',
          maxWidth: '95vw',
          maxHeight: '50vh',
          panelClass: 'full-screen-dialog',
          data: { stakeholder: row, contributions }
        });
      },
      error: (error) => {
        this.dialog.open(ContributionDialogComponent, {
          width: '95vw',
          height: '50vh',
          maxWidth: '95vw',
          maxHeight: '50vh',
          panelClass: 'full-screen-dialog',
          data: { stakeholder: row, contributions: [] }
        });
      }
    });
}
// get the school name propery (schoolName)
private getSchoolName(schoolId: any): string {
  if (!schoolId) {
    return 'No School ID';
  }
  
  if (typeof schoolId === 'string') {
    return schoolId;
  }
  
  if (typeof schoolId === 'object') {
    if (schoolId.schoolName) {
      return schoolId.schoolName;
    }
    if (schoolId.name) {
      return schoolId.name;
    }
  }
  
  return 'Unknown School';
}

// get images from engagement data
private getImagesFromEngagement(engagement: Engagement): any[] {
  if (engagement.schoolNeedId && typeof engagement.schoolNeedId === 'object' && engagement.schoolNeedId.images) {
    return engagement.schoolNeedId.images;
  }
  return [];
}
// load stakeholders data
loadStakeholders(): void {
  const activeRole = this.authService.getActiveRole();
  const schoolId = this.authService.getSchoolId();
  
  this.userService.getUsersByRole('stakeholder').subscribe({
    next: (stakeholders) => {
      let filteredStakeholders = stakeholders;
      
      // If user is school admin, filter stakeholders to only show those relevant on that school
      if (activeRole === 'schoolAdmin' && schoolId) {
        // For school admins, show all stakeholders belong to the school admin account only
        
        // Get all stakeholders engaged with this school admin's school
        this.engagementService.getAllEngagement(
          1,
          1000, // Get a large number to get all engagements
          undefined, // stakeholderUserId (don't filter by stakeholder)
          undefined, // schoolYear
          undefined, // specificContribution
          schoolId, // schoolId - filter by school admin's school
          undefined, // startDate
          undefined, // endDate
          undefined // sector
        ).subscribe({
          next: (engagementResponse) => {
            if (engagementResponse && engagementResponse.data) {
              // Get unique stakeholder IDs from engagements with this school
              const engagedStakeholderIds = new Set(
                engagementResponse.data.map((engagement: Engagement) => {
                  if (typeof engagement.stakeholderUserId === 'string') {
                    return engagement.stakeholderUserId;
                  } else if (engagement.stakeholderUserId && typeof engagement.stakeholderUserId === 'object') {
                    return engagement.stakeholderUserId._id;
                  }
                  return null;
                }).filter(Boolean)
              );
              
              filteredStakeholders = stakeholders.filter((stakeholder: any) => {
                return engagedStakeholderIds.has(stakeholder._id);
              });
            }
            
            this.processStakeholders(filteredStakeholders);
          },
          error: (error) => {
            // If there's an error getting engagements, show all stakeholders for school admin
            this.processStakeholders(stakeholders);
          }
        });
      } else {
        // For non-school admin roles, show all stakeholders
        this.processStakeholders(stakeholders);
      }
    },
    error: (error) => {
      this.allRecords = [];
      this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
    }
  });
}

private processStakeholders(stakeholders: any[]): void {
  // Map stakeholders and check engagement status for each
  this.allRecords = stakeholders.map((stakeholder: any) => ({
    ...stakeholder,
    contribution: stakeholder.sector || 'Unknown',
    name: stakeholder.name || '',
    contactNumber: stakeholder.contactNumber || '',
    address: stakeholder.address || '',
    engagementStatus: 'Not Engaged', 
    schoolYear: stakeholder.schoolYear || getDefaultSchoolYear(),
    sector: stakeholder.sector || 'Unknown',
    contributions: []
  }));

  // check engagement status for each stakeholder
  this.checkEngagementStatusForAllStakeholders();
}
//checks all records for engage or not engage
private checkEngagementStatusForAllStakeholders(): void {
  let completedChecks = 0;
  const totalStakeholders = this.allRecords.length;

  if (totalStakeholders === 0) {
    this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
    if (this.paginator) {this.dataSource.paginator = this.paginator;}
    this.applyFilter();
    return;
  }

  this.allRecords.forEach((stakeholder, index) => {
    this.engagementService.getAllEngagement(
      1,
      1, // Just need to know if at least one engagement exists
      stakeholder._id,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    ).subscribe({
      next: (engagementResponse) => {
        if (engagementResponse && engagementResponse.data && engagementResponse.data.length > 0) {
          this.allRecords[index].engagementStatus = 'Engaged';
        }
        
        completedChecks++;
        if (completedChecks === totalStakeholders) {
          // All checks completed, update data source
          this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
          if (this.paginator) {this.dataSource.paginator = this.paginator;}
          this.applyFilter();
        }
      },
      error: (error) => {
        completedChecks++;
        if (completedChecks === totalStakeholders) {
          // All checks completed, update data source
          this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
          if (this.paginator) {this.dataSource.paginator = this.paginator;}
          this.applyFilter();
        }
      }
    });
  });
}

private determineEngagementStatus(stakeholder: any): 'Engaged' | 'Not Engaged' {
  
  // Check if the stakeholder object has any engagement-related data
  if (stakeholder.engagementStatus) {
    return stakeholder.engagementStatus;
  }
  
  return 'Not Engaged';
}

  dataSource = new MatTableDataSource<StakeholderProfile>([]);

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
    if (this.paginator) {this.dataSource.paginator = this.paginator;}
  }

  resetFilters(): void {
    this.selectedSchoolYear = getDefaultSchoolYear();
    this.selectedSector = 'All Sectors';
    this.selectedEngagement = 'All';
    this.applyFilter();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    
  }
}

