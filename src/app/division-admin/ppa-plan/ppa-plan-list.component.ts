import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { AuthService } from '../../auth/auth.service';
import { UserType } from '../../registration/user-type.enum';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { PpaPlan } from '../../common/model/ppa-plan.model';
import { PLAN_CLASSIFICATION } from '../../common/enums/plan-classification.enum';
import { PLAN_IMPLEMENTATION_STATUS } from '../../common/enums/plan-implementation-status.enum';
import {
  formatDateString,
  getDateRangeForPeriod,
  getDateRangeParamsForAPI,
  DateRangePeriod,
} from '../../common/date-utils';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { PpaPlanFormComponent } from './ppa-plan-form.component';
import {
  canActOnPpaPlan,
  formatUserRefDisplay,
} from '../../common/utils/ppa-plan-user-display.util';

const COLUMN_STORAGE_KEY = 'ppa-plan-table-columns';

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
  selector: 'app-ppa-plan-list',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './ppa-plan-list.component.html',
  styleUrl: './ppa-plan-list.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class PpaPlanListComponent implements OnInit, OnDestroy {
  readonly UserType = UserType;
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  get userActiveRole(): string {
    return this.authService.getActiveRole();
  }

  /** True if the user can see any action buttons (ProgramHolder or OfficeAdmin; OfficeAdminAssistant sees none). */
  get canShowActions(): boolean {
    const role = this.userActiveRole;
    return role === UserType.ProgramHolder || role === UserType.OfficeAdmin;
  }

  /** True if the Duplicate button should be shown (ProgramHolder only; OfficeAdmin hides it). */
  showDuplicateButton(): boolean {
    return this.userActiveRole === UserType.ProgramHolder;
  }

  /** True if action buttons (Edit, Delete, Duplicate) should be enabled for this row. ProgramHolder: only when assigned to current user; OfficeAdmin: always. */
  canActOnPlan(row: PpaPlan): boolean {
    return canActOnPpaPlan(
      this.userActiveRole,
      this.authService.getUserId(),
      this.getAssignedUserId(row),
    );
  }

  /** Resolve assignedUserId from row (string or populated User object). */
  private getAssignedUserId(row: PpaPlan): string | null {
    const v = row.assignedUserId;
    if (v == null) return null;
    if (typeof v === 'string') return v;
    return (v as { _id?: string })?._id ?? null;
  }

  /** Column categories for visibility toggle. Actions column is always visible. */
  columnCategories: ColumnCategory[] = [
    {
      id: 'basic',
      label: 'Basic',
      columns: [
        { id: 'kra', label: 'KRA', visible: true },
        { id: 'title', label: 'Program Title', visible: true },
        { id: 'activity', label: 'Activity', visible: true },
        { id: 'ppaObjective', label: 'PPA Objective', visible: false },
        { id: 'classification', label: 'Classification', visible: true },
        { id: 'expectedOutput', label: 'Expected Output', visible: true },
      ],
    },
    {
      id: 'budget',
      label: 'Budget & Dates',
      columns: [
        { id: 'implementationStartDate', label: 'Implementation Date', visible: true },
        { id: 'venue', label: 'Venue', visible: true },
        { id: 'budgetaryRequirement', label: 'Budgetary Requirement', visible: true },
        { id: 'materialsAndSupplies', label: 'Materials and Supplies', visible: false },
        { id: 'fundSource', label: 'Fund Source', visible: true },
      ],
    },
    {
      id: 'stakeholder',
      label: 'Stakeholder & Support',
      columns: [
        { id: 'participants', label: 'Participants', visible: false },
        { id: 'supportNeed', label: 'Support Needed From Stakeholder', visible: false },
        { id: 'supportReceivedValue', label: 'Support Received From Stakeholder', visible: false },
        { id: 'stakeholderUserId', label: 'Stakeholder', visible: true },
      ],
    },
    {
      id: 'utilization',
      label: 'Utilization',
      columns: [
        { id: 'amountUtilized', label: 'Amount Utilized', visible: true },
        { id: 'variance', label: 'Variance', visible: false },
        { id: 'percentOfUtilization', label: 'Percent of Utilization', visible: false },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      columns: [
        { id: 'implementationStatus', label: 'Implementation Status', visible: true },
        { id: 'assignee', label: 'Assignee', visible: false },
        { id: 'timeliness', label: 'Timeliness', visible: false },
      ],
    },
    {
      id: 'other',
      label: 'Other',
      columns: [
        { id: 'factors', label: 'Factors', visible: false },
        { id: 'reportDocument', label: 'Report Document', visible: false },
      ],
    },
  ];

  /** Visible columns for the table (computed from columnCategories + actions). Assignee column hidden when "Assigned to me" filter is checked. */
  get displayedColumns(): string[] {
    const visible = this.columnCategories.flatMap((cat) =>
      cat.columns.filter((c) => c.visible).map((c) => c.id)
    );

    return [...visible, 'actions'];
  }
  dataSource = new MatTableDataSource<PpaPlan>([]);
  isLoading = true;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalItems = 0;

  searchTerm = '';
  filterClassification = '';
  filterImplementationStatus = '';
  filterAssignedToMe = true;

  // Date filter: implementationStartDate >= filterStart, implementationEndDate <= filterEnd (overlap)
  dateRangeType: 'period' | 'custom' | null = null;
  selectedPeriod: string | null = null;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  periodOptions = [
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'lastQuarter', label: 'Last Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'last3Months', label: 'Last 3 Months' },
    { value: 'last6Months', label: 'Last 6 Months' },
  ];

  get classificationOptions(): (string | (typeof PLAN_CLASSIFICATION)[number])[] {
    const opts = ['', ...PLAN_CLASSIFICATION];
    return opts.sort((a, b) => {
      if (!a) return -1;
      if (!b) return 1;
      return this.classificationDisplay.getDisplayText(a).localeCompare(this.classificationDisplay.getDisplayText(b));
    });
  }
  readonly implementationStatusOptions = ['', ...PLAN_IMPLEMENTATION_STATUS];

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.filterClassification !== '' ||
      this.filterImplementationStatus !== '' ||
      (this.userActiveRole === UserType.ProgramHolder && !this.filterAssignedToMe) ||
      this.hasDateFilter()
    );
  }

  private hasDateFilter(): boolean {
    if (!this.dateRangeType) return false;
    if (this.dateRangeType === 'period') return !!this.selectedPeriod;
    if (this.dateRangeType === 'custom') return !!(this.customStartDate && this.customEndDate);
    return false;
  }

  constructor(
    private readonly ppaPlanService: PpaPlanService,
    private readonly authService: AuthService,
    public readonly classificationDisplay: PlanClassificationDisplayService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.loadColumnPreferences();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadPlans();
      });
    this.loadPlans();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPlans();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onClassificationChange(): void {
    this.pageIndex = 0;
    this.loadPlans();
  }

  onImplementationStatusChange(): void {
    this.pageIndex = 0;
    this.loadPlans();
  }

  onAssignedToMeChange(): void {
    this.pageIndex = 0;
    this.loadPlans();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterClassification = '';
    this.filterImplementationStatus = '';
    this.filterAssignedToMe = true;
    this.dateRangeType = null;
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
    this.pageIndex = 0;
    this.loadPlans();
  }

  onDateRangeTypeChange(): void {
    if (this.dateRangeType === 'period') {
      this.customStartDate = null;
      this.customEndDate = null;
      this.selectedPeriod = 'thisMonth';
    } else if (this.dateRangeType === 'custom') {
      const now = new Date();
      this.customStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this.customEndDate = new Date(now);
      this.selectedPeriod = null;
    } else {
      this.selectedPeriod = null;
      this.customStartDate = null;
      this.customEndDate = null;
    }
    this.pageIndex = 0;
    this.loadPlans();
  }

  onPeriodChange(): void {
    this.pageIndex = 0;
    this.loadPlans();
  }

  onCustomDateChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.pageIndex = 0;
      this.loadPlans();
    }
  }

  private getDateRange(): { start: Date | null; end: Date | null } {
    if (this.dateRangeType === 'custom') {
      return { start: this.customStartDate, end: this.customEndDate };
    }
    if (this.dateRangeType !== 'period' || !this.selectedPeriod) {
      return { start: null, end: null };
    }
    const { start, end } = getDateRangeForPeriod(this.selectedPeriod as DateRangePeriod, new Date());
    return { start, end };
  }

  private getDateRangeForAPI(): { startDateFrom?: string; endDateTo?: string } {
    const { start, end } = this.getDateRange();
    return getDateRangeParamsForAPI(start, end);
  }

  loadPlans(): void {
    this.isLoading = true;
    const dateParams = this.hasDateFilter() ? this.getDateRangeForAPI() : {};
    this.ppaPlanService
      .getList({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
        classification: this.filterClassification || undefined,
        implementationStatus: this.filterImplementationStatus || undefined,
        assignedUserId: this.filterAssignedToMe && this.userActiveRole === UserType.ProgramHolder ? this.authService.getUserId() || undefined : undefined,
        ...dateParams,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data ?? [];
          this.totalItems = res.totalItems ?? 0;
        },
        error: (err) => {
          console.error('Failed to load PPA plans', err);
          this.dataSource.data = [];
          this.totalItems = 0;
          this.showError(this.getErrorMessage(err, 'Failed to load PPA plans.'));
        },
      });
  }

  onCreate(): void {
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(PpaPlanFormComponent, {
      width: isMobile ? '100vw' : 'min(900px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { planId: undefined },
      disableClose: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadPlans();
      }
    });
  }

  onEdit(row: PpaPlan): void {
    if (!row._id) return;
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(PpaPlanFormComponent, {
      width: isMobile ? '100vw' : 'min(900px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { planId: row._id },
      disableClose: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadPlans();
      }
    });
  }

  onDuplicate(row: PpaPlan): void {
    if (!row._id) return;
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(PpaPlanFormComponent, {
      width: isMobile ? '100vw' : 'min(900px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { planId: row._id, isDuplicate: true },
      disableClose: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadPlans();
      }
    });
  }

  onDelete(row: PpaPlan): void {
    const title = row.title || 'this plan';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete PPA Plan',
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && row._id) {
        this.performDelete(row._id);
      }
    });
  }

  private performDelete(id: string): void {
    this.ppaPlanService.delete(id).subscribe({
      next: () => {
        this.showSuccess('PPA plan deleted successfully.');
        this.loadPlans();
      },
      error: (err) => {
        console.error('Failed to delete PPA plan', err);
        this.showError(this.getErrorMessage(err, 'Failed to delete PPA plan.'));
      },
    });
  }

  formatDate(value: string | undefined): string {
    return formatDateString(value);
  }

  /** Format implementation date: if both same day show one; if different show "start - end"; else show whichever is present */
  formatImplementationDate(row: PpaPlan): string {
    const start = row.implementationStartDate;
    const end = row.implementationEndDate;
    if (start && end) {
      const dStart = new Date(start);
      const dEnd = new Date(end);
      const sameDay = dStart.getFullYear() === dEnd.getFullYear() &&
        dStart.getMonth() === dEnd.getMonth() &&
        dStart.getDate() === dEnd.getDate();
      return sameDay ? formatDateString(start) : `${formatDateString(start)} - ${formatDateString(end)}`;
    }
    if (start) return formatDateString(start);
    if (end) return formatDateString(end);
    return '—';
  }

  /** Display assignee name from assignedUserId (string or populated User object). */
  getAssigneeDisplay(row: PpaPlan): string {
    return formatUserRefDisplay(row.assignedUserId);
  }

  /** Display stakeholder name only (no email) from either id string or populated user object from API. */
  /** Display fundSource (string[] or legacy string) as comma-separated string */
  getFundSourceDisplay(fundSource: string | string[] | null | undefined): string {
    if (fundSource == null) return '—';
    if (Array.isArray(fundSource)) return fundSource.length > 0 ? fundSource.join(', ') : '—';
    return typeof fundSource === 'string' ? fundSource : '—';
  }

  getStakeholderDisplay(stakeholderUserId: string | { _id?: string; name?: string; userName?: string; email?: string } | null | undefined): string {
    return formatUserRefDisplay(stakeholderUserId);
  }

  getVariance(row: PpaPlan) {
    return (row.budgetaryRequirement ?? 0) - (row.amountUtilized ?? 0);
  }

  getPercentOfUtilization(row: PpaPlan) {
    return (row.amountUtilized ?? 0) / (row.budgetaryRequirement ?? 1) * 100;
  }

  hasReportDocument(row: PpaPlan): boolean {
    return Array.isArray(row.reportUrls) && row.reportUrls.length > 0;
  }

  /** Label for report document link (e.g. "Report 1" or "Download" when single). */
  getReportLinkLabel(urls: string[], index: number): string {
    if (urls.length <= 1) return 'Download';
    return `Report ${index + 1}`;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string): void {
    const duration = message.includes('\n') ? 8000 : 5000;
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (err?.error?.message) {
      if (Array.isArray(err.error.message)) return err.error.message.join('\n• ') || fallback;
      if (typeof err.error.message === 'string') return err.error.message;
    }
    if (err?.error && typeof err.error === 'string') return err.error;
    if (err?.message && typeof err.message === 'string') return err.message;
    if (typeof err === 'string') return err;
    return fallback;
  }
}
