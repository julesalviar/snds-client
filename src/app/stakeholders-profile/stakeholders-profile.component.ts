import { Component, ViewChild, OnInit } from '@angular/core';
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
import { UserService, GetUsersByRoleParams } from '../common/services/user.service';
import { EngagementService } from '../common/services/engagement.service';
import { Engagement } from '../common/model/engagement.model';
import { AuthService } from '../auth/auth.service';
import { ReferenceDataService } from '../common/services/reference-data.service';
import {
  getSectorNames,
  SECTOR_REF_DATA_KEY,
} from '../common/utils/sector-reference-data.util';
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
  sector: string;
  contributions: ContributionItem[];
  engagements?: Engagement[];
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
export class StakeholdersProfileComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    void this.loadSectorOptions();
    this.loadStakeholders();
  }

  private async loadSectorOptions(): Promise<void> {
    await this.referenceDataService.initialize();
    const names = getSectorNames(
      this.referenceDataService.get(SECTOR_REF_DATA_KEY),
    );
    this.sectorOptions = ['All Sectors', ...names];
  }
  engagedCount = 0;
  notEngagedCount = 0;
  totalCount = 0;
  
  // Check if user is school admin for mat-radio-button display hide
  isSchoolAdmin = this.authService.getActiveRole() === 'schoolAdmin';

  stakeholderDirectoryTotalItems = 0;
  schoolYearOptions = ['All School Year', ...getSchoolYearOptions()];
  sectorOptions: string[] = ['All Sectors'];
  engagementOptions = ['All', 'Engaged', 'Not Engaged']; 

  selectedSchoolYear = getDefaultSchoolYear();
  selectedSector = 'All Sectors';
  selectedEngagement = 'All'; //hide if user is schoolAdmin

  displayedColumns: string[] = ['contribution', 'name', 'contactNumber', 'address', 'engagementStatus'];
  allRecords: StakeholderProfile[] = [];
  totalRecords: StakeholderProfile[] = []; // Store all records for accurate counts
  pageIndex: number = 0;
  pageSize: number = 5;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private engagementService: EngagementService,
    private authService: AuthService,
    private readonly referenceDataService: ReferenceDataService,
  ) { }

  openContributionDialog(row: StakeholderProfile): void {
    const schoolYearFilter =
      row.schoolYear === 'All School Year' || row.schoolYear === getDefaultSchoolYear()
        ? undefined
        : row.schoolYear;

    const source = row.engagements ?? [];
    const filtered = schoolYearFilter
      ? source.filter((e) => e.schoolYear === schoolYearFilter)
      : source;

    const contributions = filtered.map((engagement: Engagement) => ({
      schoolYear: engagement.schoolYear || 'N/A',
      school: this.getSchoolName(engagement.schoolId),
      specificContribution: engagement.specificContribution || 'N/A',
      amount: engagement.amount ? `₱${engagement.amount.toLocaleString()}` : '₱0',
      movs: 'View Documents',
      images: this.getImagesFromEngagement(engagement),
    }));

    this.dialog.open(ContributionDialogComponent, {
      width: '95vw',
      height: '50vh',
      maxWidth: '95vw',
      maxHeight: '50vh',
      panelClass: 'full-screen-dialog',
      data: { stakeholder: row, contributions },
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

  private getStakeholderUsersByRoleParams(): GetUsersByRoleParams {
    const params: GetUsersByRoleParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      stakeholderInfo: true,
    };
    if (this.selectedEngagement === 'Engaged') {
      params.engaged = true;
    } else if (this.selectedEngagement === 'Not Engaged') {
      params.engaged = false;
    }
    return params;
  }

  private filterStakeholdersForSchoolAdmin(stakeholders: any[], schoolId: string): any[] {
    const schoolYear =
      this.selectedSchoolYear === 'All School Year' ? undefined : this.selectedSchoolYear;
    const sector = this.selectedSector === 'All Sectors' ? undefined : this.selectedSector;

    return stakeholders.filter((stakeholder: any) => {
      if (sector && stakeholder.sector !== sector) {
        return false;
      }
      const engagements: Engagement[] = stakeholder.engagements ?? [];
      return engagements.some((e) => {
        const sid =
          typeof e.schoolId === 'string' ? e.schoolId : (e.schoolId as { _id?: string })?._id;
        if (sid !== schoolId) {
          return false;
        }
        if (schoolYear && e.schoolYear !== schoolYear) {
          return false;
        }
        return true;
      });
    });
  }

  // load stakeholders data
  loadStakeholders(): void {
    const activeRole = this.authService.getActiveRole();
    const schoolId = this.authService.getSchoolId();

    this.userService
      .getUsersByRole('stakeholder', this.getStakeholderUsersByRoleParams())
      .subscribe({
      next: ({ data: stakeholders, meta }) => {
        this.stakeholderDirectoryTotalItems = meta.totalItems;
        let filteredStakeholders = stakeholders;

        if (activeRole === 'schoolAdmin' && schoolId) {
          filteredStakeholders = this.filterStakeholdersForSchoolAdmin(stakeholders, schoolId);
        }

        this.processStakeholders(filteredStakeholders);
      },
      error: (error) => {
        this.stakeholderDirectoryTotalItems = 0;
        this.allRecords = [];
        this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
      }
    });
  }

  private processStakeholders(stakeholders: any[]): void {
    this.totalRecords = stakeholders.map((stakeholder: any) => {
      const engagements: Engagement[] = stakeholder.engagements ?? [];
      const hasEngagement = engagements.length > 0;
      return {
        ...stakeholder,
        contribution: stakeholder.sector || 'Unknown',
        name: stakeholder.name || '',
        contactNumber: stakeholder.contactNumber || '',
        address: stakeholder.address || '',
        engagementStatus: hasEngagement ? 'Engaged' : 'Not Engaged',
        schoolYear: stakeholder.schoolYear || getDefaultSchoolYear(),
        sector: stakeholder.sector || 'Unknown',
        contributions: [],
        engagements,
      } as StakeholderProfile;
    });

    this.allRecords = [...this.totalRecords];
    this.dataSource = new MatTableDataSource<StakeholderProfile>(this.totalRecords);
    this.applyFiltersDirectly();
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

    this.allRecords = filteredRecords;
    this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);

    if (this.paginator) {
      this.paginator.length = this.stakeholderDirectoryTotalItems;
      this.paginator.pageIndex = this.pageIndex;
      this.paginator.pageSize = this.pageSize;
    }

    this.refreshEngagementStatistics();
  }

  private refreshEngagementStatistics(): void {
    const activeRole = this.authService.getActiveRole();
    const schoolId = this.authService.getSchoolId();

    this.engagementService
      .getEngagementStatistics({
        schoolYear: this.selectedSchoolYear === 'All School Year' ? undefined : this.selectedSchoolYear,
        sector: this.selectedSector === 'All Sectors' ? undefined : this.selectedSector,
        schoolId: activeRole === 'schoolAdmin' && schoolId ? schoolId : undefined,
      })
      .subscribe({
        next: (res) => {
          if (res?.success && res.data) {
            this.engagedCount = res.data.engaged ?? 0;
            this.notEngagedCount = res.data.notEngaged ?? 0;
          }
        },
        error: () => {
          this.engagedCount = 0;
          this.notEngagedCount = 0;
        },
      });
  }

  applyFilter(): void {
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.reloadStakeholders();
  }

  reloadStakeholders(): void {
    const activeRole = this.authService.getActiveRole();
    const schoolId = this.authService.getSchoolId();

    this.userService
      .getUsersByRole('stakeholder', this.getStakeholderUsersByRoleParams())
      .subscribe({
      next: ({ data: stakeholders, meta }) => {
        this.stakeholderDirectoryTotalItems = meta.totalItems;
        let filteredStakeholders = stakeholders;

        if (activeRole === 'schoolAdmin' && schoolId) {
          filteredStakeholders = this.filterStakeholdersForSchoolAdmin(stakeholders, schoolId);
        }

        this.processStakeholders(filteredStakeholders);
      },
      error: (error) => {
        this.stakeholderDirectoryTotalItems = 0;
        this.allRecords = [];
        this.dataSource = new MatTableDataSource<StakeholderProfile>(this.allRecords);
      }
    });
  }

  resetFilters(): void {
    this.selectedSchoolYear = getDefaultSchoolYear();
    this.selectedSector = 'All Sectors';
    this.selectedEngagement = this.isSchoolAdmin ? 'Engaged' : 'All';
    this.applyFilter();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    this.reloadStakeholders();
  }
}

