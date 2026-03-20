import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { finalize } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivityService } from '../../common/services/activity.service';
import { Activity } from '../../common/model/activity.model';
import { UserListItem } from '../../registration/user.model';
import { AuthService } from '../../auth/auth.service';
import { UserType } from '../../registration/user-type.enum';
import { formatDateString, formatDateTimeString, formatTimeString } from '../../common/date-utils';
import { getActivityTypeLabel } from '../../common/enums/activity-type.enum';
import { getActivityTypeIcon, getActivityTypeColor } from '../../common/enums/activity-type-icons';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { ActivityFormComponent } from './activity-form.component';

@Component({
    selector: 'app-activity-list',
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatCardModule,
        MatTableModule,
        MatIconModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
    ],
    templateUrl: './activity-list.component.html',
    styleUrl: './activity-list.component.css',
    encapsulation: ViewEncapsulation.None
})
export class ActivityListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  readonly displayedColumns: string[] = [
    'type',
    'school',
    'title',
    'description',
    'date',
    'time',
    'location',
    'stakeholder',
    'actions',
  ];

  logoErrorIds = new Set<string>();

  dataSource = new MatTableDataSource<Activity>([]);
  isLoading = true;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalItems = 0;

  searchTerm = '';
  onlyShowMySchool = false;

  get isSchoolAdmin(): boolean {
    return this.activeRole === UserType.SchoolAdmin;
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || (this.isSchoolAdmin && this.onlyShowMySchool);
  }

  get activeRole(): string {
    return this.authService.getActiveRole() || '';
  }

  get currentSchoolId(): string {
    return this.authService.getSchoolId() || '';
  }

  get canCreateActivity(): boolean {
    const role = this.activeRole;
    return role === UserType.SchoolAdmin || role === UserType.DivisionAdmin;
  }

  canEditActivity(row: Activity): boolean {
    const role = this.activeRole;
    if (role !== UserType.SchoolAdmin && role !== UserType.DivisionAdmin) return false;
    if (role === UserType.DivisionAdmin) return true;
    const activitySchoolId = this.getActivitySchoolId(row);
    return !!activitySchoolId && activitySchoolId === this.currentSchoolId;
  }

  canDeleteActivity(row: Activity): boolean {
    return this.canEditActivity(row);
  }

  private getActivitySchoolId(activity: Activity): string | null {
    const raw = activity.schoolId;
    if (!raw) return null;
    if (typeof raw === 'string') return raw;
    const obj = raw as { _id?: string; schoolId?: string | number };
    return obj._id ?? (obj.schoolId != null ? String(obj.schoolId) : null);
  }

  formatSchool(activity: Activity): string {
    const raw = activity.schoolId;
    if (!raw) return '—';
    if (typeof raw === 'object' && raw !== null && 'schoolName' in raw) {
      return (raw as { schoolName?: string }).schoolName ?? '—';
    }
    return typeof raw === 'string' ? raw : '—';
  }

  formatStakeholder(activity: Activity): string {
    const raw = activity.stakeholderId;
    if (!raw) return '—';
    if (typeof raw === 'object' && raw !== null) {
      const item = raw as UserListItem;
      return item.name ?? '—';
    }
    return typeof raw === 'string' ? raw : '—';
  }

  getSchoolLogoUrl(activity: Activity): string | null {
    const raw = activity.schoolId;
    if (!raw || typeof raw !== 'object' || !('logoUrl' in raw)) return null;
    return (raw as { logoUrl?: string }).logoUrl ?? null;
  }

  hasLogoError(activity: Activity): boolean {
    const key = activity._id ?? this.getActivitySchoolId(activity) ?? '';
    return this.logoErrorIds.has(key);
  }

  onLogoError(activity: Activity): void {
    const key = activity._id ?? this.getActivitySchoolId(activity) ?? '';
    this.logoErrorIds.add(key);
  }

  constructor(
    private readonly activityService: ActivityService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadActivities();
      });
    this.loadActivities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadActivities();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.onlyShowMySchool = false;
    this.pageIndex = 0;
    this.loadActivities();
  }

  onOnlyShowMySchoolChange(): void {
    this.pageIndex = 0;
    this.loadActivities();
  }

  loadActivities(): void {
    this.isLoading = true;
    const schoolId = this.isSchoolAdmin && this.onlyShowMySchool ? this.currentSchoolId : undefined;
    this.activityService
      .getList({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
        schoolId: schoolId || undefined,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data ?? [];
          this.totalItems = res.totalItems ?? 0;
          this.logoErrorIds.clear();
        },
        error: (err) => {
          console.error('Failed to load activities', err);
          this.dataSource.data = [];
          this.totalItems = 0;
          this.showError(this.getErrorMessage(err, 'Failed to load activities.'));
        },
      });
  }

  onCreate(): void {
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const schoolId = this.authService.getSchoolId() || undefined;
    const dialogRef = this.dialog.open(ActivityFormComponent, {
      width: isMobile ? '100vw' : 'min(700px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { activityId: undefined, schoolId },
      disableClose: false,
      panelClass: isMobile ? 'activity-dialog-mobile' : 'activity-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadActivities();
      }
    });
  }

  onEdit(row: Activity): void {
    if (!row._id || !this.canEditActivity(row)) return;
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const schoolId = this.authService.getSchoolId() || undefined;
    const dialogRef = this.dialog.open(ActivityFormComponent, {
      width: isMobile ? '100vw' : 'min(700px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { activityId: row._id, schoolId },
      disableClose: false,
      panelClass: isMobile ? 'activity-dialog-mobile' : 'activity-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadActivities();
      }
    });
  }

  onDelete(row: Activity): void {
    if (!this.canDeleteActivity(row)) return;
    const title = row.title || 'this activity';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Activity',
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
    this.activityService.delete(id).subscribe({
      next: () => {
        this.showSuccess('Activity deleted successfully.');
        this.loadActivities();
      },
      error: (err) => {
        console.error('Failed to delete activity', err);
        this.showError(this.getErrorMessage(err, 'Failed to delete activity.'));
      },
    });
  }

  formatType(type: string | undefined): string {
    return type ? getActivityTypeLabel(type) : '—';
  }

  getActivityTypeIcon = getActivityTypeIcon;
  getActivityTypeColor = getActivityTypeColor;

  formatDate(value: string | undefined): string {
    return formatDateString(value);
  }

  formatDateTime(value: string | undefined): string {
    return formatDateTimeString(value);
  }

  formatTime(value: string | undefined): string {
    return formatTimeString(value);
  }

  /** One date: startDate. Two dates: startDate - endDate */
  formatDateRange(row: Activity): string {
    const start = formatDateString(row.startDatetime);
    if (!row.endDatetime) return start;
    const end = formatDateString(row.endDatetime);
    return start === end ? start : `${start} - ${end}`;
  }

  /** No time: —. One time: startTime. Two times: startTime - endTime */
  formatTimeRange(row: Activity): string {
    if (!row.hasTime) return '—';
    const start = formatTimeString(row.startDatetime);
    if (!row.endDatetime) return start;
    const end = formatTimeString(row.endDatetime);
    return start === end ? start : `${start} - ${end}`;
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
