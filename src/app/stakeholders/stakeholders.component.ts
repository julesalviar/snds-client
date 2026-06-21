import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, distinctUntilChanged, finalize, map, skip, take, takeUntil } from 'rxjs';
import { extractApiErrorMessage } from '../common/utils/division-lock.util';
import { AuthService } from '../auth/auth.service';
import { UserType } from '../registration/user-type.enum';
import { LoginRequiredDialogComponent } from '../common/components/login-required-dialog/login-required-dialog.component';
import { SchoolNeed } from '../common/model/school-need.model';
import { SchoolNeedService } from '../common/services/school-need.service';
import { UserService } from '../common/services/user.service';
import {
  getCurrentSchoolYear,
  getDefaultSchoolYear,
  getSchoolYearOptions,
} from '../common/date-utils';

/** Matches backend `school-need.controller` validation for `schoolYear` query param. */
const SCHOOL_YEAR_QUERY = /^\d{4}-\d{4}$/;

@Component({
  selector: 'app-stakeholders',
  imports: [
    CommonModule,
    MatTableModule,
    MatCard,
    MatCardTitle,
    MatIcon,
    MatTooltipModule,
    MatMenuModule,
    MatIconButton,
    MatPaginator,
    MatButton,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './stakeholders.component.html',
  styleUrl: './stakeholders.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class StakeholdersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly markingNeedIds = new Set<string>();

  displayedColumns: string[] = [
    'school',
    'specificContribution',
    'quantity',
    'unit',
    'amount',
    'beneficiaryStudents',
    'beneficiaryPersonnel',
    'implementationStatus',
    'actions',
  ];

  get isDivisionAdmin(): boolean {
    return this.authService.getActiveRole() === UserType.DivisionAdmin;
  }

  get isSchoolAdmin(): boolean {
    return this.authService.getActiveRole() === UserType.SchoolAdmin;
  }

  schoolNeeds: SchoolNeed[] = [];
  schoolName: string = '';
  schoolLocation: string = '';
  profileDocUrl: string | null = null;
  schoolLogoUrl: string | null = null;
  logoError: boolean = false;
  pageIndex: number = 0;
  pageSize: number = 25;
  dataSource = new MatTableDataSource<SchoolNeed>();
  totalItems: number = 0;
  totalQuantity: number = 0;
  totalCompleted: number = 0;
  totalBySchool: number = 0;
  selectedContribution: string | null = null;
  schoolId: string | null = null;
  isLoading: boolean = true;

  readonly schoolYearOptions: string[] = getSchoolYearOptions();
  selectedSchoolYear: string = StakeholdersComponent.initialSchoolYearFromCalendar();

  /** Quantity still ongoing (total − completed). */
  get ongoingQuantity(): number {
    return Math.max(0, this.totalQuantity - this.totalCompleted);
  }

  constructor(
    private readonly router: Router,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly route: ActivatedRoute,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.initSchoolYear(() => {
      this.selectedContribution =
        this.route.snapshot.queryParamMap.get('selectedContribution') ?? null;
      this.schoolId = this.route.snapshot.queryParamMap.get('schoolId') ?? null;
      this.updateDisplayedColumns();

      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
        const contribution = params['selectedContribution'] ?? null;
        const schoolId = params['schoolId'] ?? null;
        const contributionChanged = contribution !== this.selectedContribution;
        const schoolIdChanged = schoolId !== this.schoolId;

        this.selectedContribution = contribution;
        this.schoolId = schoolId;

        if (contributionChanged || schoolIdChanged) {
          this.updateDisplayedColumns();
          this.pageIndex = 0;
          this.loadSchoolNeeds();
        }
      });

      this.route.queryParamMap
        .pipe(
          map((p) => p.get('schoolYear')),
          distinctUntilChanged(),
          skip(1),
          takeUntil(this.destroy$),
        )
        .subscribe((syParam) => {
          const next = this.resolveSchoolYear(syParam);
          if (next !== this.selectedSchoolYear) {
            this.selectedSchoolYear = next;
            this.pageIndex = 0;
            this.loadSchoolNeeds();
          }
        });

      this.loadSchoolNeeds();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private static initialSchoolYearFromCalendar(): string {
    const cur = getCurrentSchoolYear();
    const opts = getSchoolYearOptions();
    return opts.includes(cur) ? cur : getDefaultSchoolYear();
  }

  private resolveSchoolYear(param: string | null): string {
    if (
      param &&
      SCHOOL_YEAR_QUERY.test(param) &&
      this.schoolYearOptions.includes(param)
    ) {
      return param;
    }
    return StakeholdersComponent.initialSchoolYearFromCalendar();
  }

  private initSchoolYear(done: () => void): void {
    const syParam = this.route.snapshot.queryParamMap.get('schoolYear');
    if (
      syParam &&
      SCHOOL_YEAR_QUERY.test(syParam) &&
      this.schoolYearOptions.includes(syParam)
    ) {
      this.selectedSchoolYear = syParam;
      done();
      return;
    }
    this.userService.schoolYear$
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((sy) => {
        this.selectedSchoolYear = this.resolveSchoolYear(sy);
        done();
      });
  }

  updateDisplayedColumns(): void {
    const base = [
      'specificContribution',
      'quantity',
      'unit',
      'amount',
      'beneficiaryStudents',
      'beneficiaryPersonnel',
      'implementationStatus',
      'actions',
    ];

    const singleSchoolView = this.schoolId || this.isSchoolAdmin;

    if (singleSchoolView) {
      if (this.isDivisionAdmin) {
        base.unshift('marker');
      }
    } else if (this.isDivisionAdmin) {
      base.unshift('marker', 'school');
    } else {
      base.unshift('school');
    }

    this.displayedColumns = base;
  }

  onPageChange(event: PageEvent): void {
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
    this.userService.setSchoolYear(year);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { schoolYear: year },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadSchoolNeeds();
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedSchoolYear !==
      StakeholdersComponent.initialSchoolYearFromCalendar()
    );
  }

  clearFilters(): void {
    const def = StakeholdersComponent.initialSchoolYearFromCalendar();
    this.selectedSchoolYear = def;
    this.pageIndex = 0;
    this.userService.setSchoolYear(def);
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
      .getSchoolNeeds(
        page,
        this.pageSize,
        this.selectedSchoolYear,
        this.selectedContribution ?? undefined,
        this.schoolId ?? undefined,
      )
      .subscribe({
        next: (response) => {
          this.schoolName = response.school?.schoolName;
          this.schoolLocation = response.school?.location;
          this.profileDocUrl = response.school?.profileDocUrl || null;
          this.schoolLogoUrl = response.school?.logoUrl || null;
          this.logoError = false;
          this.dataSource.data = response.data;
          this.totalItems = response.meta.totalItems;
          this.totalQuantity = response.meta.totalQuantity ?? 0;
          this.totalCompleted = response.meta.totalCompleted ?? 0;
          this.totalBySchool = response.meta.totalBySchool ?? 0;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching school needs:', err);
          this.isLoading = false;
        },
      });
  }

  toggleMarker(need: SchoolNeed): void {
    if (!this.isDivisionAdmin || !need._id || this.markingNeedIds.has(need._id)) {
      return;
    }

    const checked = !need.checkedByDivisionAdmin;
    need.checkedByDivisionAdmin = checked;
    this.markingNeedIds.add(need._id);

    this.schoolNeedService
      .updateSchoolNeed(need._id, { checkedByDivisionAdmin: checked } as SchoolNeed)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.markingNeedIds.delete(need._id!)),
      )
      .subscribe({
        error: (err) => {
          need.checkedByDivisionAdmin = !checked;
          console.error('Error updating marker:', err);
          this.snackBar.open(
            extractApiErrorMessage(err, 'Failed to update marker. Please try again.'),
            'Close',
            { duration: 5000 },
          );
        },
      });
  }

  viewSchoolNeed(schoolNeed: SchoolNeed): void {
    if (!this.authService.isLoggedIn()) {
      this.dialog.open(LoginRequiredDialogComponent, {
        width: '400px',
      });
      return;
    }

    if (!schoolNeed.code) {
      return;
    }

    this.router.navigate(this.getSchoolNeedViewRoute(schoolNeed.code));
  }

  private getSchoolNeedViewRoute(code: string): string[] {
    switch (this.authService.getActiveRole()) {
      case UserType.DivisionAdmin:
        return ['/division-admin/school-need-view', code];
      case UserType.SchoolAdmin:
        return ['/school-admin/school-need-view', code];
      default:
        return ['/stakeholder/school-need-view', code];
    }
  }

  deleteSchoolNeed(schoolNeed: SchoolNeed): void {
    console.log('Delete school need:', schoolNeed);
  }

  viewAnnualImplementationPlan(): void {
    this.router.navigate(['/stakeholder/aip/', this.schoolId]);
  }

  getEngagementStatus(schoolNeed: SchoolNeed): string {
    return schoolNeed.implementationStatus ?? 'Looking for partner';
  }

  seeSchoolLocation(): void {
    const encodedLocation = encodeURIComponent(this.schoolLocation);
    const googleMapsUrl = `https://www.google.com/maps?q=${encodedLocation}`;
    window.open(googleMapsUrl, '_blank');
  }

  downloadSchoolProfile(): void {
    if (this.profileDocUrl) {
      window.open(this.profileDocUrl, '_blank');
    }
  }

  onLogoError(): void {
    this.logoError = true;
  }
}
