import { Component, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { EngagementService } from '../../common/services/engagement.service';
import { Engagement, PopulatedStakeholderUser } from '../../common/model/engagement.model';
import { getSchoolYear } from '../../common/date-utils';
import {UserType} from "../../registration/user-type.enum";
import {AuthService} from "../../auth/auth.service";

@Component({
  selector: 'app-generated-resources',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './generated-resources.component.html',
  styleUrls: ['./generated-resources.component.css']
})
export class GeneratedResourcesComponent implements OnInit, AfterViewInit {

  private readonly allColumns: string[] = [
    'dateEngage',
    'recipientSchool',
    'stakeholder',
    'sector',
    'numberOfRepresentatives',
    'specificContribution',
    'quantity',
    'unit',
    'amount'
  ];

  get displayedColumns(): string[] {
    // Hide recipientSchool column for school admins
    if (this.isSchoolAdmin()) {
      return this.allColumns.filter(col => col !== 'recipientSchool');
    }
    return this.allColumns;
  }

  dataSource = new MatTableDataSource<Engagement>([]);
  allEngagements: Engagement[] = [];
  filteredEngagements: Engagement[] = [];
  isLoading: boolean = false;
  pageIndex: number = 0;
  pageSize: number = 25;
  totalItems: number = 0;
  totalAmount: number = 0; // Client-calculated total (for filtered results)
  backendTotalAmount: number = 0; // Total amount from backend (overall total)

  // Filter properties
  schoolYears: string[] = [];
  selectedSchoolYear: string | null = null;
  filterType: 'schoolYear' | 'dateRange' = 'schoolYear'; // Always requires a filter
  dateRangeType: 'period' | 'custom' = 'period';
  selectedPeriod: string | null = null;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;
  selectedSector: string[] = [];

  // Sector options
  sectorOptions = [
    { value: 'Private Sector', label: 'Private Sector' },
    { value: 'Public Sector', label: 'Public Sector' },
    { value: 'Civil Society Organization', label: 'Civil Society Organization' },
    { value: 'International', label: 'International' }
  ];

  // Period options
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private readonly engagementService: EngagementService,
    private readonly authService: AuthService
  ) {
    this.schoolYears = this.generateSchoolYears();
    // Set default filter to current school year
    this.selectedSchoolYear = getSchoolYear();
  }

  ngOnInit(): void {
    this.loadEngagements();
  }

  private generateSchoolYears(): string[] {
    const currentSchoolYear = getSchoolYear();
    const currentStartYear = parseInt(currentSchoolYear.split('-')[0]);
    const years: string[] = [];

    // Generate from 2015-2016 to the current school year
    for (let year = currentStartYear; year >= 2024; year--) {
      years.push(`${year}-${year + 1}`);
    }

    return years;
  }

  ngAfterViewInit() {
    // Disable MatPaginator for client-side filtering (school year and date range)
    // Both filter types use client-side pagination
    this.dataSource.paginator = null;
  }

  loadEngagements(): void {
    this.isLoading = true;

    // Get filter parameters
    const schoolYear = this.filterType === 'schoolYear' ? (this.selectedSchoolYear || undefined) : undefined;

    // Get date range parameters for date range filter
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (this.filterType === 'dateRange') {
      const dateRange = this.getDateRangeForAPI();
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Get sector filter - convert array to comma-separated string for API
    const sector = this.selectedSector.length > 0 ? this.selectedSector.join(',') : undefined;
    const schoolId = this.isSchoolAdmin() ? this.getSchoolId() : undefined;

    // Load data with filters applied on backend
    this.engagementService.getAllEngagement(1, 1000, undefined, schoolYear, undefined, schoolId, startDate, endDate, sector).subscribe({
      next: (response) => {
        this.allEngagements = response.data;
        this.filteredEngagements = response.data;
        // Get total amount from backend - this is the OVERALL total for the filter
        // For school year filter, this should be the total for that school year
        // For date range filter, this should be the total for that date range
        // The total should NOT change when paginating - it's the overall total for the filter
        this.backendTotalAmount = response.meta.totalAmount ?? 0;
        // If there are more pages, we might need to load them all
        // For now, we'll work with the first 1000 items
        if (response.meta.totalItems > 1000) {
          console.warn('Filter may not include all items. Consider adding pagination support for totals.');
        }
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading engagements:', error);
        this.dataSource.data = [];
        this.allEngagements = [];
        this.filteredEngagements = [];
        this.isLoading = false;
      }
    });
  }

  /**
   * Converts the selected date range (period or custom) to API format (YYYY-MM-DD)
   * Returns startDate and/or endDate as strings
   */
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

  /**
   * Formats a Date object to YYYY-MM-DD string format for API
   */
  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyFilters(): void {
    // Data is already filtered by backend using startDate/endDate parameters
    // We just need to paginate the results
    const filtered = [...this.allEngagements];
    this.filteredEngagements = filtered;

    // Update total items before pagination
    this.totalItems = filtered.length;

    // Apply client-side pagination for both filter types
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = filtered.slice(startIndex, endIndex);
    // Remove paginator to prevent double pagination
    this.dataSource.paginator = null;
  }

  getDateRange(): { start: Date | null; end: Date | null } {
    if (this.dateRangeType === 'custom') {
      return {
        start: this.customStartDate,
        end: this.customEndDate
      };
    }

    // Period-based date ranges
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

    // Set end time to end of day
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    if (this.filterType === 'dateRange' || this.filterType === 'schoolYear') {
      // For client-side pagination, just apply filters (total stays the same)
      this.applyFilters();
    } else {
      // For server-side pagination, reload data but keep the same total
      // The backend should provide the overall total in meta.totalAmount
      this.loadEngagements();
    }
  }

  onFilterTypeChange(): void {
    this.pageIndex = 0;
    if (this.filterType === 'schoolYear') {
      this.selectedPeriod = null;
      this.customStartDate = null;
      this.customEndDate = null;
      // Ensure school year is set if not already
      if (!this.selectedSchoolYear) {
        this.selectedSchoolYear = getSchoolYear();
      }
      this.dataSource.paginator = null; // Disable MatPaginator for client-side pagination
      this.loadEngagements();
    } else if (this.filterType === 'dateRange') {
      this.selectedSchoolYear = null;
      // Set default to period and this month
      this.dateRangeType = 'period';
      this.selectedPeriod = 'thisMonth';
      this.customStartDate = null;
      this.customEndDate = null;
      this.dataSource.paginator = null; // Disable MatPaginator for client-side pagination
      this.loadEngagements();
    }
  }

  onSchoolYearChange(schoolYear: string | null): void {
    // Ensure a school year is always selected (fallback to current if null)
    this.selectedSchoolYear = schoolYear || getSchoolYear();
    this.pageIndex = 0;
    this.loadEngagements();
  }

  onDateRangeTypeChange(): void {
    if (this.dateRangeType === 'period') {
      this.customStartDate = null;
      this.customEndDate = null;
      // Set default to "this month" when switching to period
      this.selectedPeriod = 'thisMonth';
    } else {
      // Set default dates when switching to custom: first day of current month to today
      const now = new Date();
      this.customStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this.customEndDate = new Date(now);
      this.selectedPeriod = null;
    }
    this.pageIndex = 0;
    // Trigger backend call when switching date range type
    this.loadEngagements();
  }

  onPeriodChange(): void {
    this.pageIndex = 0;
    // Trigger backend call when period changes
    this.loadEngagements();
  }

  onCustomDateChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.pageIndex = 0;
      // Trigger backend call when custom date range changes
      this.loadEngagements();
    }
  }

  onSectorChange(sectors: string[]): void {
    // Filter out the "Select All" marker if present
    const filteredSectors = sectors.filter(s => s !== '__SELECT_ALL__');
    this.selectedSector = filteredSectors;
    this.pageIndex = 0;
    this.loadEngagements();
  }

  clearFilters(): void {
    // Reset to default school year filter (always requires a filter)
    this.filterType = 'schoolYear';
    this.selectedSchoolYear = getSchoolYear();
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
    this.dateRangeType = 'period';
    this.selectedSector = [];
    this.pageIndex = 0;
    this.dataSource.paginator = null; // Disable MatPaginator for client-side pagination
    this.loadEngagements();
  }

  /**
   * Returns a descriptive label for what the total amount represents
   */
  getTotalAmountLabel(): string {
    let baseLabel = '';
    let sectorLabel = '';

    // Build base label based on filter type
    if (this.filterType === 'schoolYear' && this.selectedSchoolYear) {
      baseLabel = `Total for School Year ${this.selectedSchoolYear}`;
    } else if (this.filterType === 'dateRange') {
      if (this.dateRangeType === 'custom' && this.customStartDate && this.customEndDate) {
        const startDate = this.customStartDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' });
        const endDate = this.customEndDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' });
        baseLabel = `Total for Period: ${startDate} - ${endDate}`;
      } else if (this.dateRangeType === 'period' && this.selectedPeriod) {
        const periodLabel = this.periodOptions.find(p => p.value === this.selectedPeriod)?.label || '';
        baseLabel = `Total for ${periodLabel}`;
      } else {
        baseLabel = 'Total for Selected Date Range';
      }
    } else {
      baseLabel = 'Overall Total Amount';
    }

    // Add sector information if sectors are selected
    if (this.selectedSector && this.selectedSector.length > 0) {
      if (this.selectedSector.length === 1) {
        sectorLabel = ` (Sector: ${this.selectedSector[0]})`;
      } else if (this.selectedSector.length === this.sectorOptions.length) {
        sectorLabel = ' (All Sectors)';
      } else {
        sectorLabel = ` (Sectors: ${this.selectedSector.join(', ')})`;
      }
    }

    return baseLabel + sectorLabel;
  }

  getSector(engagement: Engagement): string {
    if (engagement.stakeholderUserId && typeof engagement.stakeholderUserId === 'object') {
      const stakeholder = engagement.stakeholderUserId as PopulatedStakeholderUser;
      return stakeholder['sector'] || '-';
    }
    return '-';
  }

  isSchoolAdmin(): boolean {
    return this.authService.getActiveRole() === UserType.SchoolAdmin;
  }

  getSchoolId(): string {
    return this.authService.getSchoolId();
  }
}
