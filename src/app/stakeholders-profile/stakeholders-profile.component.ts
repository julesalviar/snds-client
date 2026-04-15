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
  totalCount = 0;
  schoolYearOptions = ['All School Year', ...getSchoolYearOptions()];
  sectorOptions = ['All Sectors', 'Private Sector', 'Public Sector', 'Civil Society Organization', 'International'];
  engagementOptions = ['All', 'Engaged', 'Not Engaged'];

  selectedSchoolYear = getDefaultSchoolYear();
  selectedSector = 'All Sectors';
  selectedEngagement = 'All';

  displayedColumns: string[] = ['contribution', 'name', 'contactNumber', 'address', 'engagementStatus'];
  allRecords: StakeholderProfile[] = [];
  totalRecords: StakeholderProfile[] = []; // Store all records for accurate counts
  pageIndex: number = 0;
  pageSize: number = 25;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private engagementService: EngagementService,
    private authService: AuthService
  ) { }

  openContributionDialog(row: StakeholderProfile): void {
    const schoolYearFilter = row.schoolYear === 'All School Year' || row.schoolYear === getDefaultSchoolYear() ? undefined : row.schoolYear;

    this.engagementService.getAllEngagement(
      1, // page
      1000, // limit
      row._id, // stakeholderUserId
      schoolYearFilter, // schoolYear - use stakeholder's school year/specific year
      undefined, // specificContribution
      undefined, // schoolId
      undefined, // startDate
      undefined, // endDate
      undefined // sector
    ).subscribe({
      next: (engagementResponse) => {
        const contributions = engagementResponse?.data?.map((engagement: Engagement) => ({
          schoolYear: engagement.schoolYear || 'N/A',
          school: this.getSchoolName(engagement.schoolId),
          specificContribution: engagement.specificContribution || 'N/A',
          amount: engagement.amount ? `₱${engagement.amount.toLocaleString()}` : '₱0',
          movs: 'View Documents',
          images: this.getImagesFromEngagement(engagement)
        })) || [];

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

  // get school name propery (schoolName)
  private getSchoolName(schoolId: any): string {
    if (!schoolId) {
      return 'No School ID';
    }

    if (typeof schoolId === 'string') {
      return 'School Name Not Available';
    }

    if (typeof schoolId === 'object') {
      if (schoolId.schoolName && typeof schoolId.schoolName === 'string' && schoolId.schoolName.trim()) {
        return schoolId.schoolName.trim();
      }

      // Fallback to division if school name is not available
      if (schoolId.division && typeof schoolId.division === 'string' && schoolId.division.trim()) {
        return schoolId.division.trim();
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

        // If user is school admin, filter stakeholders by their school
        if (activeRole === 'schoolAdmin' && schoolId) {
          // For school admins,get stakeholders that have engagements with their school
          this.engagementService.getAllEngagement(
            1, // page
            1000, // limit
            undefined, // stakeholderUserId (don't filter by stakeholder)
            this.selectedSchoolYear === 'All School Year' ? undefined : this.selectedSchoolYear,
            undefined, // specificContribution
            schoolId, // schoolId - filter by school admin's school
            undefined, // startDate from engage
            undefined, // endDate from engage
            this.selectedSector === 'All Sectors' ? undefined : this.selectedSector // sector
          ).subscribe({
            next: (engagementResponse) => {
              if (engagementResponse && engagementResponse.data) {
                // Get unique stakeholder IDs from engagements
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

                // Filter stakeholders to only include those engaged with this school
                filteredStakeholders = stakeholders.filter((stakeholder: any) =>
                  engagedStakeholderIds.has(stakeholder._id)
                );
              }

              this.processStakeholders(filteredStakeholders);
            },
            error: (error) => {
              // If there's an error getting engagements, show empty list
              this.allRecords = [];
              this.totalCount = 0;
              this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
            }
          });
        } else {
          // For division admin roles, show all stakeholders
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
    this.totalRecords = stakeholders.map((stakeholder: any) => ({
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
    const totalStakeholders = this.totalRecords.length;

    if (totalStakeholders === 0) {
      this.allRecords = [];
      this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
      this.applyFiltersDirectly();
      return;
    }

    this.totalRecords.forEach((stakeholder, index) => {
      this.engagementService.getAllEngagement(
        this.pageIndex + 1,
        this.pageSize,
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
            this.totalRecords[index].engagementStatus = 'Engaged';
          }

          completedChecks++;
          if (completedChecks === totalStakeholders) {
            // All checks completed, copy to allRecords and apply filters
            this.allRecords = [...this.totalRecords];
            this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
            this.applyFiltersDirectly();
          }
        },
        error: (error) => {
          completedChecks++;
          if (completedChecks === totalStakeholders) {
            // All checks completed, copy to allRecords and apply filters
            this.allRecords = [...this.totalRecords];
            this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
            this.applyFiltersDirectly();
          }
        }
      });
    });
  }

  dataSource = new MatTableDataSource<StakeholderProfile>([]);

  // Helper method to apply filters without triggering reload
  private applyFiltersDirectly(): void {
    const year = this.selectedSchoolYear;
    const sector = this.selectedSector;
    const engagement = this.selectedEngagement;

    // Filter all records for display
    const filteredRecords = this.totalRecords.filter((row) => {
      const matchYear = year === 'All School Year' || row.schoolYear === year;
      const matchSector = sector === 'All Sectors' || row.sector === sector;
      const matchEngagement = engagement === 'All' || row.engagementStatus === engagement;

      return matchYear && matchSector && matchEngagement;
    });

    // Calculate counts from all filtered records (not just current page)
    this.engagedCount = filteredRecords.filter(r => r.engagementStatus === 'Engaged').length;
    this.notEngagedCount = filteredRecords.filter(r => r.engagementStatus === 'Not Engaged').length;

    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allRecords = filteredRecords.slice(startIndex, endIndex);

    this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);

    if (this.paginator) {
      this.paginator.length = filteredRecords.length;
      this.paginator.pageIndex = this.pageIndex;
      this.paginator.pageSize = this.pageSize;
    }
  }

  applyFilter(): void {
    this.applyFiltersDirectly();
    // Reload stakeholders data when filters are applied to get fresh data
    this.reloadStakeholders();
  }

  reloadStakeholders(): void {
    const activeRole = this.authService.getActiveRole();
    const schoolId = this.authService.getSchoolId();

    this.userService.getUsersByRole('stakeholder').subscribe({
      next: (stakeholders) => {
        let filteredStakeholders = stakeholders;

        // If user is school admin, filter stakeholders by their school
        if (activeRole === 'schoolAdmin' && schoolId) {
          // For school admins,get stakeholders that have engagements with their school
          this.engagementService.getAllEngagement(
            1, // page
            1000, // limit
            undefined, // stakeholderUserId (don't filter by stakeholder)
            this.selectedSchoolYear === 'All School Year' ? undefined : this.selectedSchoolYear,
            undefined, // specificContribution
            schoolId, // schoolId - filter by school admin's school
            undefined, // startDate from engage
            undefined, // endDate from engage
            this.selectedSector === 'All Sectors' ? undefined : this.selectedSector // sector
          ).subscribe({
            next: (engagementResponse) => {
              if (engagementResponse && engagementResponse.data) {
                // Get unique stakeholder IDs from engagements
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
                
                // Filter stakeholders to only include those engaged with this school
                filteredStakeholders = stakeholders.filter((stakeholder: any) => 
                  engagedStakeholderIds.has(stakeholder._id)
                );
              }
              
              this.processStakeholders(filteredStakeholders);
            },
            error: (error) => {
              // If there's an error getting engagements, show empty list for school admin
              if (activeRole === 'schoolAdmin') {
                this.allRecords = [];
                this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
              } else {
                
                this.processStakeholders(stakeholders);
              }
            }
          });
        } else {
          // For division admin, show all stakeholders
          this.processStakeholders(stakeholders);
        }
      },
      error: (error) => {
        this.allRecords = [];
        this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
      }
    });
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
    
    this.applyFiltersDirectly();
  }
}

