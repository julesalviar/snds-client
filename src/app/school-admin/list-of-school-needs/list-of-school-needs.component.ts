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
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { SchoolNeed } from '../../common/model/school-need.model';
import { SchoolNeedService } from '../../common/services/school-need.service';
import {
  getCurrentSchoolYear,
  getDefaultSchoolYear,
  getSchoolYearOptions,
} from '../../common/date-utils';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { SchoolNeedCreateDialogComponent } from '../school-need-create-dialog/school-need-create-dialog.component';
import { SchoolNeedComponent } from '../school-need/school-need.component';

/** Matches backend `school-need.controller` validation for `schoolYear` query param. */
const SCHOOL_YEAR_QUERY = /^\d{4}-\d{4}$/;

/** Matches backend `filterBy` query for implementation-date search. */
const FILTER_BY_IMPLEMENTATION = 'implementationDate';

type SchoolNeedsFilterMode = 'schoolYear' | 'implementationDate';

/** Templated presets for the implementation-date range. `'custom'` = user-picked. */
type ImplementationDatePreset =
  | 'thisWeek'
  | 'thisMonth'
  | 'previousMonth'
  | 'thisQuarter'
  | 'previousQuarter'
  | 'thisYear'
  | 'previousYear'
  | 'nextYear'
  | 'next3Years'
  | 'custom';

/** Default preset shown when the user switches to implementation-date filter. */
const DEFAULT_IMPLEMENTATION_PRESET: ImplementationDatePreset = 'thisYear';

/** Order matters: drives the dropdown layout. */
const IMPLEMENTATION_DATE_PRESET_OPTIONS: ReadonlyArray<{
  value: ImplementationDatePreset;
  label: string;
}> = [
  { value: 'thisWeek', label: 'This week' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'previousMonth', label: 'Previous month' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'previousQuarter', label: 'Previous quarter' },
  { value: 'thisYear', label: 'This year' },
  { value: 'previousYear', label: 'Previous year' },
  { value: 'nextYear', label: 'Next year' },
  { value: 'next3Years', label: 'Next 3 years' },
  { value: 'custom', label: 'Custom' },
];

const KNOWN_IMPLEMENTATION_PRESETS = new Set<ImplementationDatePreset>(
  IMPLEMENTATION_DATE_PRESET_OPTIONS.map((o) => o.value),
);

@Component({
  selector: 'app-list-of-school-needs',
  providers: [provideNativeDateAdapter()],
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
    MatInputModule,
    MatDatepickerModule,
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
  /** Default filter matches backend `getCurrentSchoolYear()` / list query when `schoolYear` is omitted. */
  selectedSchoolYear: string = ListOfSchoolNeedsComponent.initialSchoolYearFromCalendar();

  /** Whether the list is filtered by school year or by implementation (`targetDate`) range. */
  filterMode: SchoolNeedsFilterMode = 'schoolYear';

  /** Implementation date (targetDate) range filter. `null` means unset. */
  targetDateFrom: Date | null = null;
  targetDateTo: Date | null = null;

  /** Selected preset; `'custom'` means user manually picked a from/to date. */
  targetDatePreset: ImplementationDatePreset = DEFAULT_IMPLEMENTATION_PRESET;

  /** Exposed to the template for the preset dropdown. */
  readonly presetOptions = IMPLEMENTATION_DATE_PRESET_OPTIONS;

  private static parseFilterModeFromQuery(v: string | null): SchoolNeedsFilterMode {
    return v?.trim().toLowerCase() === FILTER_BY_IMPLEMENTATION.toLowerCase()
      ? 'implementationDate'
      : 'schoolYear';
  }

  private static parsePresetFromQuery(
    v: string | null,
  ): ImplementationDatePreset | null {
    if (!v) return null;
    const trimmed = v.trim() as ImplementationDatePreset;
    return KNOWN_IMPLEMENTATION_PRESETS.has(trimmed) ? trimmed : null;
  }

  // ----- Calendar helpers (local time, no time-of-day) -----

  /** Sunday-first week to match the Material calendar (S-M-T-W-T-F-S). */
  private static startOfWeek(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay());
    return x;
  }
  private static endOfWeek(d: Date): Date {
    const start = ListOfSchoolNeedsComponent.startOfWeek(d);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  }
  private static startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  /** Last day of a month: day 0 of next month. */
  private static endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }
  private static startOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3, 1);
  }
  private static endOfQuarter(d: Date): Date {
    const start = ListOfSchoolNeedsComponent.startOfQuarter(d);
    return new Date(start.getFullYear(), start.getMonth() + 3, 0);
  }
  private static startOfYear(d: Date): Date {
    return new Date(d.getFullYear(), 0, 1);
  }
  private static endOfYear(d: Date): Date {
    return new Date(d.getFullYear(), 11, 31);
  }

  /**
   * Compute the `[from, to]` range for a preset. Returns `null` for `'custom'`
   * (the caller keeps the user-picked dates).
   */
  private static rangeForPreset(
    preset: ImplementationDatePreset,
    now: Date = new Date(),
  ): { from: Date; to: Date } | null {
    switch (preset) {
      case 'thisWeek':
        return {
          from: this.startOfWeek(now),
          to: this.endOfWeek(now),
        };
      case 'thisMonth':
        return {
          from: this.startOfMonth(now),
          to: this.endOfMonth(now),
        };
      case 'previousMonth': {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          from: this.startOfMonth(prev),
          to: this.endOfMonth(prev),
        };
      }
      case 'thisQuarter':
        return {
          from: this.startOfQuarter(now),
          to: this.endOfQuarter(now),
        };
      case 'previousQuarter': {
        const start = this.startOfQuarter(now);
        const prev = new Date(start.getFullYear(), start.getMonth() - 3, 1);
        return {
          from: this.startOfQuarter(prev),
          to: this.endOfQuarter(prev),
        };
      }
      case 'thisYear':
        return {
          from: this.startOfYear(now),
          to: this.endOfYear(now),
        };
      case 'previousYear': {
        const prev = new Date(now.getFullYear() - 1, 0, 1);
        return {
          from: this.startOfYear(prev),
          to: this.endOfYear(prev),
        };
      }
      case 'nextYear': {
        const next = new Date(now.getFullYear() + 1, 0, 1);
        return {
          from: this.startOfYear(next),
          to: this.endOfYear(next),
        };
      }
      case 'next3Years': {
        const start = new Date(now.getFullYear() + 1, 0, 1);
        const end = new Date(now.getFullYear() + 3, 11, 31);
        return { from: start, to: end };
      }
      case 'custom':
      default:
        return null;
    }
  }

  private static initialSchoolYearFromCalendar(): string {
    const cur = getCurrentSchoolYear();
    const opts = getSchoolYearOptions();
    return opts.includes(cur) ? cur : getDefaultSchoolYear();
  }

  /** Matches a `YYYY-MM-DD` calendar date (no time component). */
  private static readonly DATE_ONLY_QUERY = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Format a Date as `YYYY-MM-DD` using the local calendar day so the day the
   * user picked is preserved regardless of timezone offset (calling
   * `.toISOString()` would convert to UTC and can shift the date).
   */
  private static toDateOnlyString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Parse a `YYYY-MM-DD` query-string value into a local-midnight Date so
   * `<input matDatepicker>` displays the same calendar day. Returns `null`
   * for empty/invalid input or anything that isn't date-only.
   */
  private static parseDateParam(v: string | null): Date | null {
    if (!v || !ListOfSchoolNeedsComponent.DATE_ONLY_QUERY.test(v)) {
      return null;
    }
    const [y, m, d] = v.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit(): void {
    this.filterMode = ListOfSchoolNeedsComponent.parseFilterModeFromQuery(
      this.route.snapshot.queryParamMap.get('filterBy'),
    );

    if (this.filterMode === 'schoolYear') {
      const initialYear = this.route.snapshot.queryParamMap.get('schoolYear');
      if (
        initialYear &&
        SCHOOL_YEAR_QUERY.test(initialYear) &&
        this.schoolYearOptions.includes(initialYear)
      ) {
        this.selectedSchoolYear = initialYear;
      }
      this.targetDateFrom = null;
      this.targetDateTo = null;
      this.targetDatePreset = DEFAULT_IMPLEMENTATION_PRESET;
    } else {
      const pm = this.route.snapshot.queryParamMap;
      const presetParam = ListOfSchoolNeedsComponent.parsePresetFromQuery(
        pm.get('targetDatePreset'),
      );
      const fromParam = ListOfSchoolNeedsComponent.parseDateParam(
        pm.get('targetDateFrom'),
      );
      const toParam = ListOfSchoolNeedsComponent.parseDateParam(
        pm.get('targetDateTo'),
      );

      if (presetParam && presetParam !== 'custom') {
        this.targetDatePreset = presetParam;
        const range = ListOfSchoolNeedsComponent.rangeForPreset(presetParam);
        this.targetDateFrom = range?.from ?? null;
        this.targetDateTo = range?.to ?? null;
        // Make sure the URL reflects the canonical "preset only" form.
        this.syncImplementationDateUrl({ replaceUrl: true });
      } else if (fromParam || toParam) {
        // Backwards-compat: existing links with explicit dates → custom.
        this.targetDatePreset = 'custom';
        this.targetDateFrom = fromParam;
        this.targetDateTo = toParam;
      } else {
        // Fresh entry into implementation-date mode → default preset.
        this.applyPreset(DEFAULT_IMPLEMENTATION_PRESET);
        this.syncImplementationDateUrl({ replaceUrl: true });
      }
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
        if (this.filterMode !== 'schoolYear') {
          return;
        }
        const valid =
          !!syParam &&
          SCHOOL_YEAR_QUERY.test(syParam) &&
          this.schoolYearOptions.includes(syParam);
        const next = valid
          ? syParam!
          : ListOfSchoolNeedsComponent.initialSchoolYearFromCalendar();
        if (next !== this.selectedSchoolYear) {
          this.selectedSchoolYear = next;
          this.pageIndex = 0;
          this.loadSchoolNeeds();
        }
      });

    this.route.queryParamMap
      .pipe(
        map((p) => p.get('filterBy')),
        distinctUntilChanged(),
        skip(1),
        takeUntil(this.destroy$),
      )
      .subscribe((fb) => {
        const next = ListOfSchoolNeedsComponent.parseFilterModeFromQuery(fb);
        if (next === this.filterMode) {
          return;
        }
        this.filterMode = next;
        this.pageIndex = 0;
        if (next === 'schoolYear') {
          this.targetDateFrom = null;
          this.targetDateTo = null;
          this.targetDatePreset = DEFAULT_IMPLEMENTATION_PRESET;
        } else {
          const pm = this.route.snapshot.queryParamMap;
          const presetParam = ListOfSchoolNeedsComponent.parsePresetFromQuery(
            pm.get('targetDatePreset'),
          );
          if (presetParam && presetParam !== 'custom') {
            this.applyPreset(presetParam);
          } else {
            const fromParam = ListOfSchoolNeedsComponent.parseDateParam(
              pm.get('targetDateFrom'),
            );
            const toParam = ListOfSchoolNeedsComponent.parseDateParam(
              pm.get('targetDateTo'),
            );
            if (fromParam || toParam) {
              this.targetDatePreset = 'custom';
              this.targetDateFrom = fromParam;
              this.targetDateTo = toParam;
            } else {
              this.applyPreset(DEFAULT_IMPLEMENTATION_PRESET);
              this.syncImplementationDateUrl({ replaceUrl: true });
            }
          }
        }
        this.loadSchoolNeeds();
      });

    this.route.queryParamMap
      .pipe(
        map((p) => p.get('targetDatePreset')),
        distinctUntilChanged(),
        skip(1),
        takeUntil(this.destroy$),
      )
      .subscribe((p) => {
        if (this.filterMode !== 'implementationDate') {
          return;
        }
        const next = ListOfSchoolNeedsComponent.parsePresetFromQuery(p);
        if (!next || next === 'custom' || next === this.targetDatePreset) {
          return;
        }
        this.applyPreset(next);
        this.pageIndex = 0;
        this.loadSchoolNeeds();
      });
  }

  /** Mutates `targetDatePreset` + `targetDateFrom/To` to match the given preset. */
  private applyPreset(preset: ImplementationDatePreset): void {
    this.targetDatePreset = preset;
    if (preset === 'custom') {
      return;
    }
    const range = ListOfSchoolNeedsComponent.rangeForPreset(preset);
    this.targetDateFrom = range?.from ?? null;
    this.targetDateTo = range?.to ?? null;
  }

  /**
   * Push the current implementation-date filter state into the URL query
   * params. When a preset is active we keep ONLY `targetDatePreset` (dates
   * are derived); when `'custom'` we keep ONLY the explicit from/to dates.
   */
  private syncImplementationDateUrl(opts: { replaceUrl?: boolean } = {}): void {
    const isCustom = this.targetDatePreset === 'custom';
    const queryParams = {
      filterBy: FILTER_BY_IMPLEMENTATION,
      targetDatePreset: isCustom ? null : this.targetDatePreset,
      targetDateFrom:
        isCustom && this.targetDateFrom
          ? ListOfSchoolNeedsComponent.toDateOnlyString(this.targetDateFrom)
          : null,
      targetDateTo:
        isCustom && this.targetDateTo
          ? ListOfSchoolNeedsComponent.toDateOnlyString(this.targetDateTo)
          : null,
    } as const;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: opts.replaceUrl ?? true,
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

  onDuplicate(need: SchoolNeed): void {
    if (!need.code) return;
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const ref = this.dialog.open(SchoolNeedComponent, {
      width: isMobile ? '100vw' : 'min(720px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      disableClose: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
      data: { needCode: need.code, isDuplicate: true },
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

  onFilterModeChange(mode: SchoolNeedsFilterMode): void {
    if (mode === this.filterMode) {
      return;
    }
    this.filterMode = mode;
    this.pageIndex = 0;

    if (mode === 'schoolYear') {
      this.targetDateFrom = null;
      this.targetDateTo = null;
      this.targetDatePreset = DEFAULT_IMPLEMENTATION_PRESET;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          filterBy: null,
          targetDateFrom: null,
          targetDateTo: null,
          targetDatePreset: null,
          schoolYear: this.selectedSchoolYear,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    } else {
      this.applyPreset(DEFAULT_IMPLEMENTATION_PRESET);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          filterBy: FILTER_BY_IMPLEMENTATION,
          schoolYear: null,
          targetDateFrom: null,
          targetDateTo: null,
          targetDatePreset: this.targetDatePreset,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    this.loadSchoolNeeds();
  }

  onTargetDatePresetChange(preset: ImplementationDatePreset): void {
    if (this.filterMode !== 'implementationDate') {
      return;
    }
    if (preset === this.targetDatePreset) {
      return;
    }
    if (preset === 'custom') {
      // Switching to Custom keeps the currently-displayed dates so the user
      // can edit them; just drop the preset query param.
      this.targetDatePreset = 'custom';
    } else {
      this.applyPreset(preset);
    }
    this.pageIndex = 0;
    this.syncImplementationDateUrl();
    this.loadSchoolNeeds();
  }

  onSchoolYearFilterChange(year: string): void {
    if (this.filterMode !== 'schoolYear') {
      return;
    }
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

  onTargetDateFromChange(date: Date | null): void {
    if (this.filterMode !== 'implementationDate') {
      return;
    }
    // Manual date edits switch the preset to "Custom" so the URL/state stay consistent.
    this.targetDatePreset = 'custom';
    this.targetDateFrom = date ?? null;
    this.pageIndex = 0;
    this.syncImplementationDateUrl();
    this.loadSchoolNeeds();
  }

  onTargetDateToChange(date: Date | null): void {
    if (this.filterMode !== 'implementationDate') {
      return;
    }
    this.targetDatePreset = 'custom';
    this.targetDateTo = date ?? null;
    this.pageIndex = 0;
    this.syncImplementationDateUrl();
    this.loadSchoolNeeds();
  }

  get hasActiveFilters(): boolean {
    if (this.filterMode === 'schoolYear') {
      return (
        this.selectedSchoolYear !==
        ListOfSchoolNeedsComponent.initialSchoolYearFromCalendar()
      );
    }
    // In implementation-date mode the page is always "filtered" — Clear takes
    // the user back to the school-year default.
    return true;
  }

  clearFilters(): void {
    const def = ListOfSchoolNeedsComponent.initialSchoolYearFromCalendar();
    this.filterMode = 'schoolYear';
    this.selectedSchoolYear = def;
    this.targetDateFrom = null;
    this.targetDateTo = null;
    this.targetDatePreset = DEFAULT_IMPLEMENTATION_PRESET;
    this.pageIndex = 0;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        filterBy: null,
        schoolYear: def,
        targetDateFrom: null,
        targetDateTo: null,
        targetDatePreset: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadSchoolNeeds();
  }

  loadSchoolNeeds(): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;

    const byImplementation = this.filterMode === 'implementationDate';

    const schoolYearForApi = byImplementation ? undefined : this.selectedSchoolYear;

    // Send date-only (YYYY-MM-DD) so the filter ignores the time component;
    // the backend expands these to start/end-of-day for the range query.
    const fromParam =
      byImplementation && this.targetDateFrom
        ? ListOfSchoolNeedsComponent.toDateOnlyString(this.targetDateFrom)
        : undefined;
    const toParam =
      byImplementation && this.targetDateTo
        ? ListOfSchoolNeedsComponent.toDateOnlyString(this.targetDateTo)
        : undefined;

    this.schoolNeedService
      .getSchoolNeeds(
        page,
        this.pageSize,
        schoolYearForApi,
        undefined,
        undefined,
        true,
        undefined,
        fromParam,
        toParam,
        byImplementation ? FILTER_BY_IMPLEMENTATION : undefined,
      )
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
