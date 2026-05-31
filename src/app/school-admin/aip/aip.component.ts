import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AIPProject } from '../../interfaces/aip.model';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmDeleteDialogComponent } from '../../table-button-dialog/confirm-delete-dialog/confirm-delete-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AipDetailViewComponent } from '../../table-button-dialog/confirm-delete-dialog/view button/aip-detail-view/aip-detail-view.component';
import { AipService } from '../../common/services/aip.service';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Aip } from '../../common/model/aip.model';
import {
  formatAipSchoolYearsDisplay,
  getCurrentSchoolYear,
  getDefaultSchoolYear,
  getSchoolYearOptions,
} from '../../common/date-utils';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../auth/auth.service';
import { UserType } from '../../registration/user-type.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, map, distinctUntilChanged, skip } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AipFormComponent } from '../aip-form/aip-form.component';
import { AIP_STATUSES } from '../../common/enums/aip-status.enum';
import { DivisionSettingsService } from '../../common/services/division-settings.service';
import {
  extractApiErrorMessage,
  isSchoolMutationRole,
} from '../../common/utils/division-lock.util';

@Component({
  selector: 'app-aip',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatMenuModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconButton,
    MatTableModule,
    MatIcon,
    MatPaginator,
  ],
  templateUrl: './aip.component.html',
  styleUrls: ['./aip.component.css'],
  providers: [MatDialog],
})
export class AipComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  schoolId: string = '';
  displayedColumns: string[] = [
    'apn',
    'title',
    'totalBudget',
    'schoolYear',
    'status',
    'actions',
  ];
  projects: AIPProject[] = [];
  pageIndex: number = 0;
  pageSize: number = 25;
  dataSource = new MatTableDataSource<Aip>();
  totalItems: number = 0;
  isLoading: boolean = true;
  readonly schoolYearOptions = getSchoolYearOptions();
  readonly formatAipSchoolYearsDisplay = formatAipSchoolYearsDisplay;
  /** Default filter matches calendar school year when present in options. */
  selectedSchoolYear: string = AipComponent.initialSchoolYearFromCalendar();
  /** Empty string = all statuses. */
  selectedStatus: string = '';
  readonly aipStatusOptions: readonly string[] = AIP_STATUSES;
  aipLocksLoaded = false;

  protected readonly UserType = UserType;

  private static initialSchoolYearFromCalendar(): string {
    const cur = getCurrentSchoolYear();
    const opts = getSchoolYearOptions();
    return opts.includes(cur) ? cur : getDefaultSchoolYear();
  }

  constructor(
    protected dialog: MatDialog,
    private readonly aipService: AipService,
    private readonly snackBar: MatSnackBar,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly breakpointObserver: BreakpointObserver,
    private readonly divisionSettingsService: DivisionSettingsService,
  ) {}

  ngOnInit() {
    void this.divisionSettingsService.initializeLocks().then(() => {
      this.aipLocksLoaded = true;
    });

    this.schoolId = this.route.snapshot.params['schoolId'];
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    if (
      statusParam &&
      (AIP_STATUSES as readonly string[]).includes(statusParam)
    ) {
      this.selectedStatus = statusParam;
    }
    this.loadAips(this.schoolId);

    this.route.queryParamMap
      .pipe(
        map((p) => p.get('status') ?? ''),
        distinctUntilChanged(),
        skip(1),
        takeUntil(this.destroy$),
      )
      .subscribe((statusFromUrl) => {
        const valid =
          statusFromUrl === '' ||
          (AIP_STATUSES as readonly string[]).includes(statusFromUrl);
        const next = valid && statusFromUrl ? statusFromUrl : '';
        if (next !== this.selectedStatus) {
          this.selectedStatus = next;
          this.pageIndex = 0;
          this.loadAips(this.schoolId);
        }
      });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const open = params['openCreate'];
      if (open === '1' || open === 'true') {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { openCreate: undefined },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        queueMicrotask(() => {
          if (this.userRole === UserType.SchoolAdmin) {
            this.onCreate();
          }
        });
        return;
      }

      const editId = params['editId'];
      if (!editId || this.userRole !== UserType.SchoolAdmin) {
        return;
      }
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editId: undefined },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      queueMicrotask(() => {
        this.openAipFormDialog({ projectId: editId, isEdit: true });
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCreate(): void {
    if (this.isFilterYearAipLocked) {
      this.showAipLockedNotification();
      return;
    }
    this.openAipFormDialog();
  }

  isProjectAipLocked(project: Aip): boolean {
    if (!this.isSchoolMutator || !this.aipLocksLoaded) {
      return false;
    }
    return this.divisionSettingsService.isAipLockedForRawSchoolYear(
      project.schoolYear,
    );
  }

  get isSchoolMutator(): boolean {
    return isSchoolMutationRole(this.userRole);
  }

  get isFilterYearAipLocked(): boolean {
    if (!this.isSchoolMutator || !this.aipLocksLoaded) {
      return false;
    }
    return this.divisionSettingsService.isAipYearLocked(
      this.selectedSchoolYear,
    );
  }

  get aipLockBanner(): string | null {
    if (!this.isFilterYearAipLocked) {
      return null;
    }
    return `AIPs for school year ${this.selectedSchoolYear} are locked. Contact your division office if you need changes.`;
  }

  private showAipLockedNotification(): void {
    this.showErrorNotification(
      this.aipLockBanner ??
        'AIPs for the selected school year are locked.',
    );
  }

  private openAipFormDialog(
    data?: {
      projectId?: string;
      isDuplicate?: boolean;
      isEdit?: boolean;
      sourceProject?: Aip;
    },
  ): void {
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const ref = this.dialog.open(AipFormComponent, {
      width: isMobile ? '100vw' : data?.isEdit ? 'min(720px, 95vw)' : 'min(640px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      disableClose: false,
      autoFocus: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
      data,
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadAips(this.schoolId);
      }
    });
  }

  viewProject(project: Aip): void {
    this.dialog.open(AipDetailViewComponent, {
      data: project,
    });
  }

  editProject(project: Aip): void {
    if (this.userRole !== UserType.SchoolAdmin) {
      this.showErrorNotification('Unauthorized: Only School Admins can edit projects.');
      console.warn('Unauthorized edit attempt by user role:', this.userRole);
      return;
    }
    if (this.isProjectAipLocked(project)) {
      this.showAipLockedNotification();
      return;
    }

    this.openAipFormDialog({
      projectId: project._id,
      isEdit: true,
      sourceProject: project,
    });
  }

  deleteProject(project: Aip): void {
    // Security check: Only School Admins can delete
    if (this.userRole !== UserType.SchoolAdmin) {
      this.showErrorNotification('Unauthorized: Only School Admins can delete projects.');
      console.warn('Unauthorized delete attempt by user role:', this.userRole);
      return;
    }
    if (this.isProjectAipLocked(project)) {
      this.showAipLockedNotification();
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete AIP Project',
        message: `Are you sure you want to delete the project "${project.title}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Double-check authorization before API call
        if (this.userRole !== UserType.SchoolAdmin) {
          this.showErrorNotification('Unauthorized: Only School Admins can delete projects.');
          console.warn('Unauthorized delete attempt by user role:', this.userRole);
          return;
        }

        this.aipService.deleteAip(project._id).subscribe({
          next: () => {
            this.showSuccessNotification('AIP project deleted successfully!');
            this.loadAips(this.schoolId);
          },
          error: (err) => {
            console.error('Error deleting AIP project:', err);

            this.showErrorNotification(
              extractApiErrorMessage(
                err,
                'Failed to delete AIP project. Please try again.',
              ),
            );
          },
        });
      } else {
        console.log('Deletion canceled');
      }
    });
  }

  onDuplicate(project: Aip): void {
    this.openAipFormDialog({
      projectId: project._id,
      isDuplicate: true,
      sourceProject: project,
    });
  }

  loadAips(schoolId?: string): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;
    this.aipService
      .getAips(
        page,
        this.pageSize,
        schoolId,
        this.selectedSchoolYear,
        this.selectedStatus || undefined,
      )
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.data;
          this.totalItems = response.meta.totalItems;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching AIP projects:', err);
          this.isLoading = false;

          let errorMessage = 'Failed to load AIP projects. Please try again.';

          if (err?.error?.message) {
            if (Array.isArray(err.error.message)) {
              errorMessage = err.error.message.join('\n• ');
              if (err.error.message.length > 1) {
                errorMessage = `Please fix the following errors:\n• ${errorMessage}`;
              }
            } else if (typeof err.error.message === 'string') {
              errorMessage = err.error.message;
            }
          } else if (err?.error && typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err?.message) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }

          this.showErrorNotification(errorMessage);
        },
      });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadAips(this.schoolId);
  }

  onSchoolYearFilterChange(year: string): void {
    if (year === this.selectedSchoolYear) {
      return;
    }
    this.selectedSchoolYear = year;
    this.pageIndex = 0;
    this.syncFilterQueryParams();
    this.loadAips(this.schoolId);
  }

  onStatusFilterChange(status: string): void {
    if (status === this.selectedStatus) {
      return;
    }
    this.selectedStatus = status;
    this.pageIndex = 0;
    this.syncFilterQueryParams();
    this.loadAips(this.schoolId);
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedSchoolYear !== AipComponent.initialSchoolYearFromCalendar() ||
      this.selectedStatus !== ''
    );
  }

  clearFilters(): void {
    this.selectedSchoolYear = AipComponent.initialSchoolYearFromCalendar();
    this.selectedStatus = '';
    this.pageIndex = 0;
    this.syncFilterQueryParams();
    this.loadAips(this.schoolId);
  }

  private syncFilterQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.selectedStatus || undefined,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  get userRole(): string {
    return this.authService.getActiveRole();
  }

  private showErrorNotification(message: string): void {
    const duration = message.includes('\n') ? 8000 : 5000;

    this.snackBar.open(message, 'Close', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }
}
