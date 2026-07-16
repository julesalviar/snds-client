import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { UserType } from '../../registration/user-type.enum';
import { EngagementService } from '../../common/services/engagement.service';
import { Engagement, PopulatedStakeholderUser } from '../../common/model/engagement.model';
import { getSchoolYear, getSchoolYearOptions } from '../../common/date-utils';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { SchoolService } from '../../common/services/school.service';
import { School } from '../../common/model/school.model';
import {
  getSectorNames,
  SECTOR_REF_DATA_KEY,
} from '../../common/utils/sector-reference-data.util';
import {
  getRatingCssColor,
  getRatingIcon,
  getRatingLabel,
  RATING_OPTIONS,
  RatingValue,
} from '../../common/utils/rating.util';

export type FeedbackStatusFilter = 'all' | 'rated' | 'unrated';

export interface RatingSummary {
  average: number | null;
  ratedCount: number;
  unratedCount: number;
  distribution: Record<RatingValue, number>;
}

@Component({
  selector: 'app-feedback-ratings',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './feedback-ratings.component.html',
  styleUrls: ['./feedback-ratings.component.css'],
})
export class FeedbackRatingsComponent implements OnInit, OnDestroy {
  private readonly allColumns: string[] = [
    'dateEngage',
    'recipientSchool',
    'stakeholder',
    'sector',
    'specificContribution',
    'quantity',
    'unit',
    'amount',
    'feedback',
  ];

  get displayedColumns(): string[] {
    if (this.isSchoolAdmin()) {
      return this.allColumns.filter((col) => col !== 'recipientSchool');
    }
    return this.allColumns;
  }

  readonly ratingOptions = RATING_OPTIONS;
  readonly getRatingIcon = getRatingIcon;
  readonly getRatingCssColor = getRatingCssColor;
  readonly getRatingLabel = getRatingLabel;
  readonly schoolSearchLimit = 40;

  dataSource = new MatTableDataSource<Engagement>([]);
  allEngagements: Engagement[] = [];
  filteredEngagements: Engagement[] = [];
  isLoading = false;
  pageIndex = 0;
  pageSize = 25;
  totalItems = 0;

  schoolYears: string[] = getSchoolYearOptions();
  selectedSchoolYear: string = getSchoolYear();
  selectedSector: string[] = [];
  selectedSchoolId: string | null = null;
  selectedCluster = '';
  feedbackStatus: FeedbackStatusFilter = 'all';
  sectorOptions: { value: string; label: string }[] = [];
  clusterOptions: Array<{ value: string; label: string }> = [];

  schoolSearchControl = new FormControl('');
  filteredSchools: School[] = [];
  private cachedSchools: School[] = [];

  summary: RatingSummary = {
    average: null,
    ratedCount: 0,
    unratedCount: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  private readonly schoolSearchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly engagementService: EngagementService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly schoolService: SchoolService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    if (this.isSchoolAdmin()) {
      this.selectedSchoolId = this.authService.getSchoolId() || null;
    } else {
      void this.loadClusterOptions();
      this.schoolSearchSubject
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntil(this.destroy$),
        )
        .subscribe((term) => this.performSchoolSearch(term));
    }

    void this.loadSectorOptions();
    this.loadEngagements();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadSectorOptions(): Promise<void> {
    await this.referenceDataService.initialize();
    const names = getSectorNames(
      this.referenceDataService.get(SECTOR_REF_DATA_KEY),
    );
    this.sectorOptions = names.map((name) => ({ value: name, label: name }));
  }

  private async loadClusterOptions(): Promise<void> {
    try {
      await this.internalReferenceDataService.initialize();
      const clusters: string[] = this.internalReferenceDataService.getClusters();
      this.clusterOptions = [
        { value: '', label: 'All Districts/Clusters' },
        ...clusters.map((cluster) => ({ value: cluster, label: cluster })),
      ];
    } catch (error) {
      console.error('Error loading cluster options:', error);
      this.clusterOptions = [{ value: '', label: 'All Districts/Clusters' }];
    }
  }

  private performSchoolSearch(searchTerm: string): void {
    const district = this.selectedCluster.trim();
    this.schoolService
      .listSchools({
        page: 1,
        limit: this.schoolSearchLimit,
        search: searchTerm.trim() || undefined,
        districtOrCluster: district ? [district] : undefined,
      })
      .subscribe({
        next: (res) => {
          this.filteredSchools = res?.data ?? [];
          for (const school of this.filteredSchools) {
            this.cacheSchool(school);
          }
        },
        error: () => {
          this.filteredSchools = [];
        },
      });
  }

  loadEngagements(): void {
    this.isLoading = true;
    const sector =
      this.selectedSector.length > 0
        ? this.selectedSector.join(',')
        : undefined;
    const schoolId = this.isSchoolAdmin()
      ? this.authService.getSchoolId() || undefined
      : this.selectedSchoolId || undefined;

    this.engagementService
      .getAllEngagement(
        1,
        1000,
        undefined,
        this.selectedSchoolYear,
        undefined,
        schoolId,
        undefined,
        undefined,
        sector,
      )
      .subscribe({
        next: (response) => {
          this.allEngagements = response.data ?? [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading engagements for feedback ratings:', error);
          this.allEngagements = [];
          this.filteredEngagements = [];
          this.dataSource.data = [];
          this.totalItems = 0;
          this.recomputeSummary([]);
          this.isLoading = false;
        },
      });
  }

  applyFilters(): void {
    // Summary always reflects the loaded set (school year / sector / school),
    // and does not change when Feedback Status filters the table.
    this.recomputeSummary(this.allEngagements);

    let filtered = [...this.allEngagements];

    if (this.feedbackStatus === 'rated') {
      filtered = filtered.filter(
        (e) => e.rating != null && e.rating >= 1 && e.rating <= 5,
      );
    } else if (this.feedbackStatus === 'unrated') {
      filtered = filtered.filter(
        (e) => e.rating == null || e.rating < 1 || e.rating > 5,
      );
    }

    this.filteredEngagements = filtered;
    this.totalItems = filtered.length;

    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = filtered.slice(startIndex, endIndex);
  }

  private recomputeSummary(engagements: Engagement[]): void {
    const distribution: Record<RatingValue, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let ratedSum = 0;
    let ratedCount = 0;

    for (const engagement of engagements) {
      const rating = engagement.rating;
      if (rating != null && rating >= 1 && rating <= 5) {
        const value = rating as RatingValue;
        distribution[value] += 1;
        ratedSum += value;
        ratedCount += 1;
      }
    }

    this.summary = {
      average: ratedCount > 0 ? ratedSum / ratedCount : null,
      ratedCount,
      unratedCount: engagements.length - ratedCount,
      distribution,
    };
  }

  onSchoolYearChange(schoolYear: string): void {
    this.selectedSchoolYear = schoolYear || getSchoolYear();
    this.pageIndex = 0;
    this.loadEngagements();
  }

  onSectorChange(sectors: string[]): void {
    this.selectedSector = sectors.filter((s) => s !== '__SELECT_ALL__');
    this.pageIndex = 0;
    this.loadEngagements();
  }

  onFeedbackStatusChange(status: FeedbackStatusFilter): void {
    this.feedbackStatus = status;
    this.pageIndex = 0;
    this.applyFilters();
  }

  onClusterChange(cluster: string): void {
    if (this.isSchoolAdmin()) {
      return;
    }
    this.selectedCluster = cluster ?? '';
    const hadSchool = !!this.selectedSchoolId;
    this.selectedSchoolId = null;
    this.schoolSearchControl.setValue('', { emitEvent: false });
    this.filteredSchools = [];
    this.performSchoolSearch('');
    if (hadSchool) {
      this.pageIndex = 0;
      this.loadEngagements();
    }
  }

  getSchoolId(school: School): string {
    const id = school._id;
    return typeof id === 'string' ? id : id?.$oid ?? '';
  }

  getSchoolDisplayName(school: School): string {
    return school.schoolName || '—';
  }

  onSchoolSearchInput(event: Event): void {
    if (this.isSchoolAdmin()) {
      return;
    }
    const value = (event.target as HTMLInputElement)?.value ?? '';
    if (this.selectedSchoolId) {
      const school = this.findSchoolById(this.selectedSchoolId);
      const label = school ? this.getSchoolDisplayName(school) : '';
      if (label && value !== label) {
        this.selectedSchoolId = null;
        this.pageIndex = 0;
        this.loadEngagements();
      }
    }
    this.schoolSearchSubject.next(value.trim());
  }

  onSchoolInputFocus(event: FocusEvent): void {
    if (this.isSchoolAdmin()) {
      return;
    }
    const input = event.target as HTMLInputElement | null;
    if (input?.value) {
      setTimeout(() => input.select(), 0);
    } else {
      this.schoolSearchSubject.next('');
    }
  }

  onSchoolOptionSelected(schoolId: string): void {
    if (this.isSchoolAdmin() || !schoolId) {
      return;
    }
    const school = this.findSchoolById(schoolId);
    if (school) {
      this.cacheSchool(school);
      this.schoolSearchControl.setValue(this.getSchoolDisplayName(school), {
        emitEvent: false,
      });
    }
    this.selectedSchoolId = schoolId;
    this.pageIndex = 0;
    this.loadEngagements();
  }

  clearSchoolFilter(): void {
    if (this.isSchoolAdmin()) {
      return;
    }
    this.selectedSchoolId = null;
    this.schoolSearchControl.setValue('', { emitEvent: false });
    this.filteredSchools = [];
    this.pageIndex = 0;
    this.loadEngagements();
  }

  private cacheSchool(school: School): void {
    const id = this.getSchoolId(school);
    if (!id || this.cachedSchools.some((s) => this.getSchoolId(s) === id)) {
      return;
    }
    this.cachedSchools = [...this.cachedSchools, school];
  }

  private findSchoolById(schoolId: string): School | undefined {
    if (!schoolId) {
      return undefined;
    }
    return (
      this.cachedSchools.find((s) => this.getSchoolId(s) === schoolId) ??
      this.filteredSchools.find((s) => this.getSchoolId(s) === schoolId)
    );
  }

  clearFilters(): void {
    this.selectedSchoolYear = getSchoolYear();
    this.selectedSector = [];
    this.feedbackStatus = 'all';
    this.pageIndex = 0;

    if (!this.isSchoolAdmin()) {
      this.selectedCluster = '';
      this.selectedSchoolId = null;
      this.schoolSearchControl.setValue('', { emitEvent: false });
      this.filteredSchools = [];
    } else {
      this.selectedSchoolId = this.authService.getSchoolId() || null;
    }

    this.loadEngagements();
  }

  hasActiveFilters(): boolean {
    const base =
      this.selectedSector.length > 0 ||
      this.feedbackStatus !== 'all' ||
      this.selectedSchoolYear !== getSchoolYear();

    if (this.isSchoolAdmin()) {
      return base;
    }

    return base || !!this.selectedCluster || !!this.selectedSchoolId;
  }

  isSchoolAdmin(): boolean {
    return this.authService.getActiveRole() === UserType.SchoolAdmin;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }

  getSector(engagement: Engagement): string {
    if (
      engagement.stakeholderUserId &&
      typeof engagement.stakeholderUserId === 'object'
    ) {
      const stakeholder = engagement.stakeholderUserId as PopulatedStakeholderUser;
      return stakeholder['sector'] || '-';
    }
    return '-';
  }

  getSchoolName(engagement: Engagement): string {
    if (engagement.schoolId && typeof engagement.schoolId === 'object') {
      return (engagement.schoolId as { schoolName?: string }).schoolName || '-';
    }
    return '-';
  }

  getStakeholderName(engagement: Engagement): string {
    if (
      engagement.stakeholderUserId &&
      typeof engagement.stakeholderUserId === 'object'
    ) {
      return (
        (engagement.stakeholderUserId as PopulatedStakeholderUser).name || '-'
      );
    }
    return '-';
  }

  formatAverage(): string {
    if (this.summary.average == null) {
      return '—';
    }
    return this.summary.average.toFixed(1);
  }
}
