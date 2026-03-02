import { Component, ViewChild, AfterViewInit, OnInit, ViewEncapsulation } from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { EngagementService } from '../../common/services/engagement.service';
import { Engagement, PopulatedStakeholderUser, PopulatedSchoolNeed } from '../../common/model/engagement.model';
import { getSchoolYear } from '../../common/date-utils';
import { SchoolInfo } from '../../common/model/school-need.model';
import { AuthService } from '../../auth/auth.service';

const COLUMN_STORAGE_KEY = 'dpds-data-table-columns';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface ColumnCategory {
  id: string;
  label: string;
  columns: ColumnConfig[];
}

@Component({
  selector: 'app-dpds-data',
  standalone: true,
  templateUrl: './dpds-data.component.html',
  styleUrls: ['./dpds-data.component.css'],
  encapsulation: ViewEncapsulation.None,
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
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatCardModule
  ],
})
export class DpdsDataComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  isLoading: boolean = false;
  allEngagements: Engagement[] = [];
  consolidatedData: MatTableDataSource<any> = new MatTableDataSource<any>([]);

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

  /* COLUMN VISIBILITY */
  columnCategories: ColumnCategory[] = [
    {
      id: 'partners',
      label: 'School / Learning Center Partners',
      columns: [
        { id: 'generalPartnerType', label: 'General Partner Type', visible: true },
        { id: 'specificPartnerType', label: 'Specific Partner Type', visible: true },
        { id: 'remarks', label: 'Remarks', visible: false },
        { id: 'partnerName', label: 'Partner Name', visible: true },
        { id: 'partnerContactDetails', label: 'Partner Contact Details', visible: true },
      ],
    },
    {
      id: 'contribution',
      label: "Partners' Contribution",
      columns: [
        { id: 'contributionType', label: 'Contribution Type', visible: true },
        { id: 'specificContributionType', label: 'Specific Contribution Type', visible: true },
        { id: 'unitOfContribution', label: 'Unit Of Contribution', visible: true },
        { id: 'quantityContributed', label: 'Quantity Contributed', visible: true },
        { id: 'actualAmountValue', label: 'Actual Amount / Value (₱)', visible: true },
        { id: 'noOfBeneficiaryLearners', label: 'No. of Beneficiary Learners', visible: true },
        { id: 'noOfBeneficiaryPersonnel', label: 'No. of Beneficiary Personnel', visible: true },
      ],
    },
    {
      id: 'agreements',
      label: 'Partnership Agreements',
      columns: [
        { id: 'formOfAgreement', label: 'Form of Agreement', visible: true },
        { id: 'signatoryName', label: 'Signatory Name', visible: true },
        { id: 'signatoryDesignation', label: 'Signatory Designation', visible: true },
        { id: 'agreementStartDate', label: 'Agreement Start Date', visible: true },
        { id: 'agreementEndDate', label: 'Agreement End Date', visible: true },
        { id: 'projectCategory', label: 'Project Category', visible: true },
        { id: 'projectName', label: 'Project Name', visible: true },
        { id: 'statusOfAgreement', label: 'Status of Agreement / Project', visible: true },
        { id: 'remarksPartnership', label: 'Remarks', visible: false },
        { id: 'initiatedBy', label: 'Initiated By', visible: false },
      ],
    },
  ];

  constructor(
    private readonly engagementService: EngagementService,
    private readonly authService: AuthService
  ) {
    this.schoolYears = this.generateSchoolYears();
    this.selectedSchoolYear = getSchoolYear();
  }

  ngOnInit(): void {
    this.loadColumnPreferences();
    this.loadEngagements();
  }

  toggleColumnVisibility(column: ColumnConfig): void {
    const totalVisible = this.columnCategories.reduce(
      (sum, cat) => sum + cat.columns.filter((c) => c.visible).length,
      0
    );
    if (!column.visible || totalVisible > 1) {
      column.visible = !column.visible;
      this.saveColumnPreferences();
    }
  }

  private loadColumnPreferences(): void {
    try {
      const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        this.columnCategories.forEach((cat) => {
          cat.columns.forEach((c) => {
            if (parsed[c.id] !== undefined) {
              c.visible = parsed[c.id];
            }
          });
        });
      }
    } catch {
      // ignore invalid stored data
    }
  }

  private saveColumnPreferences(): void {
    try {
      const prefs: Record<string, boolean> = {};
      this.columnCategories.forEach((cat) =>
        cat.columns.forEach((c) => (prefs[c.id] = c.visible))
      );
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }

  selectedRowIndex: number | null = null;

  onRowClicked(index: number): void {
    this.selectedRowIndex = index;
  }

  ngAfterViewInit(): void {
    this.consolidatedData.paginator = this.paginator;
  }

  private generateSchoolYears(): string[] {
    const currentSchoolYear = getSchoolYear();
    const currentStartYear = parseInt(currentSchoolYear.split('-')[0]);
    const years: string[] = [];

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
        this.transformAndPopulateTable();
        this.applyGlobalFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading engagements:', error);
        this.consolidatedData.data = [];
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

  private transformAndPopulateTable(): void {
    const partnerMap = new Map<string, any>();
    const transformedData: any[] = [];

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
            partnerContactDetails: stakeholder["contactNumber"] || '-',
            schoolYear: engagement.schoolYear,
            sector: sector
          });
        }
      }

      // Transform to Partners Contribution
      if (schoolNeed) {
        if (stakeholder?._id) {
          const partnerData = partnerMap.get(stakeholder._id);
          if (partnerData) {
            console.log(schoolNeed);
            transformedData.push({
              ...partnerData,
              contributionType: (schoolNeed as any).contributionType || '-',
              specificContributionType: (schoolNeed as any).specificContribution || '-',
              unitOfContribution: engagement.unit || '-',
              quantityContributed: engagement.quantity || 0,
              actualAmountValue: engagement.amount || 0,
              noOfBeneficiaryLearners: (schoolNeed as any).studentBeneficiaries || 0,
              noOfBeneficiaryPersonnel: (schoolNeed as any).personnelBeneficiaries || 0,
              formOfAgreement: (engagement as any).agreementType || '-',
              signatoryName: (engagement as any).signatoryName || '-',
              signatoryDesignation: (engagement as any).signatoryDesignation || '-',
              agreementStartDate: engagement.startDate ? new Date(engagement.startDate) : null,
              agreementEndDate: engagement.endDate ? new Date(engagement.endDate) : null,
              projectCategory: (engagement as any).projectCategory || '-',
              projectName: (engagement as any).projectName || '-',
              statusOfAgreement: (engagement as any).agreementStatus || '-',
              remarksPartnership: '',
              initiatedBy: (engagement as any).initiatedBy || '-',
            });
          }
        }
      }
    });

    // Update the consolidated data
    this.consolidatedData.data = transformedData;
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
    const typeMapping: { [key: string]: string } = {
      'Public Sector': 'Government',
      'Government': 'Government',
      'Private Sector': 'Private',
      'Civil Society Organization': 'NGO',
      'International': 'International'
    };
    return typeMapping[sector] || 'Other';
  }

  private getSpecificPartnerType(sector: string, stakeholder: PopulatedStakeholderUser): string {
    const typeMapping: { [key: string]: string } = {
      'Public Sector': 'Local Government Unit',
      'Government': 'Local Government Unit',
      'Private Sector': 'Private Organization',
      'Civil Society Organization': 'Non-Profit Organization',
      'International': 'International Organization'
    };
    const specificPartnerType = typeMapping[sector] || stakeholder["subsector"] || 'Other';
    console.log(specificPartnerType);
    return specificPartnerType;
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
    this.consolidatedData.paginator?.firstPage();
  }

  formatColumnName(column: string): string {
    if (!column) return '';
    const formatted = column.replace(/([a-z])([A-Z])/g, '$1 $2');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  getVisibleColumns(): string[] {
    return this.columnCategories.flatMap((cat) =>
      cat.columns.filter((c) => c.visible).map((c) => c.id)
    );
  }

  private resetDateFilters(): void {
    this.dateRangeType = null;
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
  }
}
