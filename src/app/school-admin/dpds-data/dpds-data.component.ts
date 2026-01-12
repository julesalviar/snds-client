import { Component, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatDatepicker, MatDatepickerToggle, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { EngagementService } from '../../common/services/engagement.service';
import { Engagement, PopulatedStakeholderUser, PopulatedSchoolNeed } from '../../common/model/engagement.model';
import { SchoolInfo } from '../../common/model/school-need.model';
import { getSchoolYear } from '../../common/date-utils';
import { AuthService } from '../../auth/auth.service';

type SectionKey = 'school' | 'contribution' | 'partnership';
type ColumnVisibility = Record<string, boolean>;

@Component({
  selector: 'app-dpds-data',
  standalone: true,
  templateUrl: './dpds-data.component.html',
  styleUrls: ['./dpds-data.component.css'],
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    DatePipe,
    MatSelect,
    MatOption,
    MatFormField,
    MatLabel,
    MatDatepicker,
    MatDatepickerToggle,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatButtonModule
  ],
})
export class DpdsDataComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  isLoading: boolean = false;
  allEngagements: Engagement[] = [];

  /*FILTER STATE*/
  filterType: 'schoolYear' | 'dateRange' | null = null;
  schoolYears: string[] = [];
  selectedSchoolYear: string | null = null;

  dateRangeType: 'period' | 'custom' | null = null;
  selectedPeriod: string | null = null;

  periodOptions = [
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'lastQuarter', label: 'Last Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'last3Months', label: 'Last 3 Months' },
    { value: 'last6Months', label: 'Last 6 Months' }
  ];
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  sectorOptions = [
    { value: 'Private Sector', label: 'Private Sector' },
    { value: 'Public Sector', label: 'Public Sector' },
    { value: 'Civil Society Organization', label: 'Civil Society Organization' },
    { value: 'International', label: 'International' }
  ];

  selectedSector: string[] = [];

  /*DISPLAYED COLUMNS*/
  schoolPartnersDisplayedColumns: string[] = [
    'generalPartnerType',
    'specificPartnerType',
    'remarks',
    'partnerName',
    'partnerContactDetails'
  ];

  partnersContributionDisplayedColumns: string[] = [
    'contributionType',
    'specificContributionType',
    'unitOfContribution',
    'quantityContributed',
    'actualAmountValue',
    'noOfBeneficiaryLearners',
    'noOfBeneficiaryPersonnel'
  ];

  partnershipAgreementsDisplayedColumns: string[] = [
    'formOfAgreement',
    'signatoryName',
    'signatoryDesignation',
    'agreementStartDate',
    'agreementEndDate',
    'projectCategory',
    'projectName',
    'statusOfAgreement',
    'remarks',
    'initiatedBy'
  ];

  /*COLUMN VISIBILITY*/
  columnsVisible: Record<SectionKey, ColumnVisibility> = {
    school: {
      generalPartnerType: true,
      specificPartnerType: true,
      remarks: true,
      partnerName: true,
      partnerContactDetails: true
    },
    contribution: {
      contributionType: true,
      specificContributionType: true,
      unitOfContribution: true,
      quantityContributed: true,
      actualAmountValue: true,
      noOfBeneficiaryLearners: true,
      noOfBeneficiaryPersonnel: true
    },
    partnership: {
      formOfAgreement: true,
      signatoryName: true,
      signatoryDesignation: true,
      agreementStartDate: true,
      agreementEndDate: true,
      projectCategory: true,
      projectName: true,
      statusOfAgreement: true,
      remarks: true,
      initiatedBy: true
    }
  };

  /* DATA SOURCES*/
  schoolPartnersData = new MatTableDataSource<any>([]);
  partnersContributionData = new MatTableDataSource<any>([]);
  partnershipAgreementsData = new MatTableDataSource<any>([]);

  constructor(
    private readonly engagementService: EngagementService,
    private readonly authService: AuthService
  ) {
    this.schoolYears = this.generateSchoolYears();
    this.selectedSchoolYear = getSchoolYear();
  }

  ngOnInit(): void {
    this.loadEngagements();
  }

  selectedRowIndex: number | null = null;

  onRowClicked(index: number): void {
    this.selectedRowIndex = index;
  }

  ngAfterViewInit(): void {
    this.schoolPartnersData.paginator = this.paginator;
    this.partnersContributionData.paginator = this.paginator;
    this.partnershipAgreementsData.paginator = this.paginator;
  }

  private generateSchoolYears(): string[] {
    const currentSchoolYear = getSchoolYear();
    const currentStartYear = parseInt(currentSchoolYear.split('-')[0]);
    const years: string[] = [];

    // Generate from current year back to 2024
    for (let year = currentStartYear; year >= 2024; year--) {
      years.push(`${year}-${year + 1}`);
    }

    return years;
  }

  loadEngagements(): void {
    this.isLoading = true;

    const schoolYear = this.filterType === 'schoolYear' ? (this.selectedSchoolYear || undefined) : undefined;

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (this.filterType === 'dateRange') {
      const dateRange = this.getDateRangeForAPI();
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    const sector = this.selectedSector.length > 0 ? this.selectedSector.join(',') : undefined;
    const schoolId = this.getSchoolId();

    this.engagementService.getAllEngagement(1, 1000, undefined, schoolYear, undefined, schoolId, startDate, endDate, sector).subscribe({
      next: (response) => {
        this.allEngagements = response.data;
        this.transformAndPopulateTables();
        this.applyGlobalFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading engagements:', error);
        this.allEngagements = [];
        this.schoolPartnersData.data = [];
        this.partnersContributionData.data = [];
        this.partnershipAgreementsData.data = [];
        this.isLoading = false;
      }
    });
  }

  private getSchoolId(): string | undefined {
    return this.authService.getSchoolId() || undefined;
  }

  getDateRangeForAPI(): { startDate?: string; endDate?: string } {
    const dateRange = this.getDateRange();
    const result: { startDate?: string; endDate?: string } = {};

    if (dateRange.start) {
      result.startDate = this.formatDateForAPI(dateRange.start);
    }

    if (dateRange.end) {
      result.endDate = this.formatDateForAPI(dateRange.end);
    }

    return result;
  }

  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDateRange(): { start: Date | null; end: Date | null } {
    if (this.dateRangeType === 'custom') {
      return {
        start: this.customStartDate,
        end: this.customEndDate
      };
    }

    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (this.selectedPeriod) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
        start = new Date(lastQuarterYear, lastQuarterMonth, 1);
        end = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'last3Months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'last6Months':
        start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      default:
        return { start: null, end: null };
    }

    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private transformAndPopulateTables(): void {
    const schoolPartners: any[] = [];
    const partnersContribution: any[] = [];
    const partnershipAgreements: any[] = [];

    const partnerMap = new Map<string, any>();

    this.allEngagements.forEach((engagement) => {
      const stakeholder = this.getStakeholder(engagement);
      const schoolNeed = this.getSchoolNeed(engagement);
      const sector = this.getSector(engagement);

      if (stakeholder) {
        const partnerKey = stakeholder._id || stakeholder.name || '';
        if (!partnerMap.has(partnerKey)) {
          partnerMap.set(partnerKey, {
            generalPartnerType: this.getGeneralPartnerType(sector),
            specificPartnerType: this.getSpecificPartnerType(sector, stakeholder),
            remarks: '',
            partnerName: stakeholder.name || '-',
            partnerContactDetails: stakeholder.email || '-',
            schoolYear: engagement.schoolYear,
            sector: sector
          });
        }
      }

      // Transform to Partners Contribution
      if (schoolNeed) {
        partnersContribution.push({
          contributionType: (schoolNeed as any).contributionType || '-',
          specificContributionType: engagement.specificContribution || '-',
          unitOfContribution: engagement.unit || '-',
          quantityContributed: engagement.quantity || 0,
          actualAmountValue: engagement.amount || 0,
          noOfBeneficiaryLearners: (schoolNeed as any).studentBeneficiaries || 0,
          noOfBeneficiaryPersonnel: (schoolNeed as any).personnelBeneficiaries || 0,
          schoolYear: engagement.schoolYear,
          sector: sector
        });
      }

      // Transform to Partnership Agreements
      const agreementData: any = {
        formOfAgreement: (engagement as any).agreementType || '-',
        signatoryName: (engagement as any).signatoryName || '-',
        signatoryDesignation: (engagement as any).signatoryDesignation || '-',
        agreementStartDate: engagement.startDate ? new Date(engagement.startDate) : null,
        agreementEndDate: engagement.endDate ? new Date(engagement.endDate) : null,
        projectCategory: (engagement as any).projectCategory || '-',
        projectName: (engagement as any).projectName || '-',
        statusOfAgreement: (engagement as any).agreementStatus || '-',
        remarks: '',
        initiatedBy: (engagement as any).initiatedBy || '-',
        schoolYear: engagement.schoolYear,
        sector: sector
      };
      partnershipAgreements.push(agreementData);
    });

    // Convert Set to Array for school partners
    this.schoolPartnersData.data = Array.from(partnerMap.values());
    this.partnersContributionData.data = partnersContribution;
    this.partnershipAgreementsData.data = partnershipAgreements;
  }

  private getStakeholder(engagement: Engagement): PopulatedStakeholderUser | null {
    if (engagement.stakeholderUserId && typeof engagement.stakeholderUserId === 'object') {
      return engagement.stakeholderUserId as PopulatedStakeholderUser;
    }
    return null;
  }

  private getSchoolNeed(engagement: Engagement): PopulatedSchoolNeed | null {
    if (engagement.schoolNeedId && typeof engagement.schoolNeedId === 'object') {
      return engagement.schoolNeedId as PopulatedSchoolNeed;
    }
    return null;
  }

  private getSector(engagement: Engagement): string {
    const stakeholder = this.getStakeholder(engagement);
    if (stakeholder && (stakeholder as any).sector) {
      return (stakeholder as any).sector;
    }
    return '-';
  }

  private getGeneralPartnerType(sector: string): string {
    if (sector === 'Public Sector' || sector === 'Government') {
      return 'Government';
    } else if (sector === 'Private Sector') {
      return 'Private';
    } else if (sector === 'Civil Society Organization') {
      return 'NGO';
    } else if (sector === 'International') {
      return 'International';
    }
    return 'Other';
  }

  private getSpecificPartnerType(sector: string, stakeholder: PopulatedStakeholderUser): string {
    if (sector === 'Public Sector' || sector === 'Government') {
      return 'Local Government Unit';
    } else if (sector === 'Private Sector') {
      return 'Private Organization';
    } else if (sector === 'Civil Society Organization') {
      return 'Non-Profit Organization';
    } else if (sector === 'International') {
      return 'International Organization';
    }
    return 'Other';
  }

  onFilterTypeChange(): void {
    this.resetDateFilters();
    if (this.filterType === 'schoolYear') {
      if (!this.selectedSchoolYear) {
        this.selectedSchoolYear = getSchoolYear();
      }
    } else if (this.filterType === 'dateRange') {
      this.dateRangeType = 'period';
      this.selectedPeriod = 'thisMonth';
    }
    this.loadEngagements();
  }

  onSchoolYearChange(year: string): void {
    this.selectedSchoolYear = year;
    this.loadEngagements();
  }

  onDateRangeTypeChange(): void {
    if (this.dateRangeType === 'period') {
      this.customStartDate = null;
      this.customEndDate = null;
      if (!this.selectedPeriod) {
        this.selectedPeriod = 'thisMonth';
      }
    } else {
      const now = new Date();
      this.customStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this.customEndDate = new Date(now);
      this.selectedPeriod = null;
    }
    this.loadEngagements();
  }

  onPeriodChange(): void {
    this.loadEngagements();
  }

  onCustomDateChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.loadEngagements();
    }
  }

  onSectorChange(sectors: string[]): void {
    this.selectedSector = sectors;
    this.loadEngagements();
  }

  clearFilters(): void {
    this.filterType = null;
    this.selectedSchoolYear = getSchoolYear();
    this.dateRangeType = null;
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
    this.selectedSector = [];

    this.loadEngagements();
  }

  applyGlobalFilter(): void {
    [this.schoolPartnersData,
     this.partnersContributionData,
     this.partnershipAgreementsData].forEach(ds => {
      ds.paginator?.firstPage();
    });
  }

  /*COLUMN TOGGLE*/
  toggleSingleColumn(section: SectionKey, column: string): void {
    this.columnsVisible[section][column] = !this.columnsVisible[section][column];
  }

  getVisibleColumns(section: SectionKey): string[] {
    return Object.keys(this.columnsVisible[section])
      .filter(col => this.columnsVisible[section][col]);
  }

  private resetDateFilters(): void {
    this.dateRangeType = null;
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
  }
}
