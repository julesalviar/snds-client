import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, distinctUntilChanged, map, skip, takeUntil } from 'rxjs';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SchoolNeed } from '../../common/model/school-need.model';
import { SchoolNeedService } from '../../common/services/school-need.service';
import { getDefaultSchoolYear, getSchoolYearOptions } from '../../common/date-utils';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { SchoolNeedCreateDialogComponent } from '../school-need-create-dialog/school-need-create-dialog.component';
import { SchoolNeedComponent } from '../school-need/school-need.component';

/** Matches backend `school-need.controller` validation for `schoolYear` query param. */
const SCHOOL_YEAR_QUERY = /^\d{4}-\d{4}$/;

@Component({
  selector: 'app-list-of-school-needs',
  imports: [
    CommonModule,
    MatTableModule,
    MatCard,
    MatCardTitle,
    MatIcon,
    MatTooltipModule,
    MatMenu,
    MatMenuModule,
    RouterModule,
    MatIconButton,
    MatButtonModule,
    MatPaginator,
    MatBadgeModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './list-of-school-needs.component.html',
  styleUrls: ['./list-of-school-needs.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ListOfSchoolNeedsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  displayedColumns: string[] = [
    'code',
    'engaged',
    'year',
    'specificContribution',
    'quantity',
    'unit',
    'amount',
    'beneficiaryStudents',
    'beneficiaryPersonnel',
    'implementationStatus',
    'actions'
  ];
  schoolName: string = '';
  schoolLogoUrl: string | null = null;
  logoError: boolean = false;
  pageIndex: number = 0;
  pageSize: number = 25;
  dataSource = new MatTableDataSource<SchoolNeed>();
  totalItems: number = 0;
  isLoading: boolean = true;

  readonly schoolYearOptions: string[] = getSchoolYearOptions();
  selectedSchoolYear: string = getDefaultSchoolYear();

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit(): void {
    const initialYear = this.route.snapshot.queryParamMap.get('schoolYear');
    if (
      initialYear &&
      SCHOOL_YEAR_QUERY.test(initialYear) &&
      this.schoolYearOptions.includes(initialYear)
    ) {
      this.selectedSchoolYear = initialYear;
    }

    this.loadSchoolNeeds();

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const open = params['openCreate'];
      if (open !== '1' && open !== 'true') {
        return;
      }
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openCreate: undefined },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      queueMicrotask(() => this.onCreate());
    });

    this.route.queryParamMap
      .pipe(
        map((p) => p.get('schoolYear')),
        distinctUntilChanged(),
        skip(1),
        takeUntil(this.destroy$),
      )
      .subscribe((syParam) => {
        const valid =
          !!syParam &&
          SCHOOL_YEAR_QUERY.test(syParam) &&
          this.schoolYearOptions.includes(syParam);
        const next = valid ? syParam! : getDefaultSchoolYear();
        if (next !== this.selectedSchoolYear) {
          this.selectedSchoolYear = next;
          this.pageIndex = 0;
          this.loadSchoolNeeds();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateToEngage(code: string): void {
    this.router.navigate(['/school-admin/school-needs-engage', code]);
  }

  view(need: SchoolNeed): void {
  this.router.navigate(['/school-admin/school-need-view/', need.code]);
}
  onCreate(): void {
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const ref = this.dialog.open(SchoolNeedCreateDialogComponent, {
      width: isMobile ? '100vw' : 'min(640px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      disableClose: false,
      autoFocus: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadSchoolNeeds();
      }
    });
  }

  edit(need: SchoolNeed): void {
    if (!need.code) {
      return;
    }
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const ref = this.dialog.open(SchoolNeedComponent, {
      width: isMobile ? '100vw' : 'min(720px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      disableClose: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
      data: { needCode: need.code },
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadSchoolNeeds();
      }
    });
  }

  delete(need: SchoolNeed): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete School Need',
        message: `Are you sure you want to delete the school need "${need.code ?? 'Unknown'}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performDelete(need);
      }
    });
  }

  private performDelete(need: SchoolNeed): void {
    if (!need.code) {
      this.snackBar.open('Cannot delete school need: missing code', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Show loading state
    this.isLoading = true;

    this.schoolNeedService.deleteSchoolNeed(need?.code).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('School need deleted successfully', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.loadSchoolNeeds(); // Refresh the list
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error deleting school need:', err);

        // Extract specific error message from server response
        let errorMessage = 'Failed to delete school need';

        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.status === 404) {
          errorMessage = 'School need not found';
        } else if (err.status === 403) {
          errorMessage = 'You do not have permission to delete this school need';
        } else if (err.status === 500) {
          errorMessage = 'Server error occurred while deleting school need';
        } else if (err.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your internet connection';
        }

        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadSchoolNeeds();
  }

  onSchoolYearFilterChange(year: string): void {
    if (year === this.selectedSchoolYear) {
      return;
    }
    this.selectedSchoolYear = year;
    this.pageIndex = 0;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { schoolYear: year },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadSchoolNeeds();
  }

  get hasActiveFilters(): boolean {
    return this.selectedSchoolYear !== getDefaultSchoolYear();
  }

  clearFilters(): void {
    const def = getDefaultSchoolYear();
    this.selectedSchoolYear = def;
    this.pageIndex = 0;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { schoolYear: def },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadSchoolNeeds();
  }

  loadSchoolNeeds(): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;

    this.schoolNeedService
      .getSchoolNeeds(page, this.pageSize, this.selectedSchoolYear, undefined, undefined, true)
      .subscribe({
      next: (response) => {
        this.schoolName = response.school?.schoolName;
        this.schoolLogoUrl = response.school?.logoUrl || null;
        this.logoError = false;
        this.dataSource.data = response.data;
        this.totalItems = response.meta.totalItems;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching school needs:', err);
        this.isLoading = false;
      }
    });
  }

  getEngagementStatus(schoolNeed: SchoolNeed): string {
    return schoolNeed.implementationStatus ?? 'Looking for partner';
  }

  onLogoError(): void {
    this.logoError = true;
  }
}
