import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EngagementService } from '../../common/services/engagement.service';
import { Engagement, PopulatedStakeholderUser } from '../../common/model/engagement.model';
import { getSchoolYear, getSchoolYearOptions } from '../../common/date-utils';
import { ReferenceDataService } from '../../common/services/reference-data.service';
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
    MatTableModule,
    MatCardModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './feedback-ratings.component.html',
  styleUrls: ['./feedback-ratings.component.css'],
})
export class FeedbackRatingsComponent implements OnInit {
  readonly displayedColumns: string[] = [
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

  readonly ratingOptions = RATING_OPTIONS;
  readonly getRatingIcon = getRatingIcon;
  readonly getRatingCssColor = getRatingCssColor;
  readonly getRatingLabel = getRatingLabel;

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
  feedbackStatus: FeedbackStatusFilter = 'all';
  sectorOptions: { value: string; label: string }[] = [];

  summary: RatingSummary = {
    average: null,
    ratedCount: 0,
    unratedCount: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  constructor(
    private readonly engagementService: EngagementService,
    private readonly referenceDataService: ReferenceDataService,
  ) {}

  ngOnInit(): void {
    void this.loadSectorOptions();
    this.loadEngagements();
  }

  private async loadSectorOptions(): Promise<void> {
    await this.referenceDataService.initialize();
    const names = getSectorNames(
      this.referenceDataService.get(SECTOR_REF_DATA_KEY),
    );
    this.sectorOptions = names.map((name) => ({ value: name, label: name }));
  }

  loadEngagements(): void {
    this.isLoading = true;
    const sector =
      this.selectedSector.length > 0
        ? this.selectedSector.join(',')
        : undefined;

    this.engagementService
      .getAllEngagement(
        1,
        1000,
        undefined,
        this.selectedSchoolYear,
        undefined,
        undefined,
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
    this.recomputeSummary(filtered);

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

  clearFilters(): void {
    this.selectedSchoolYear = getSchoolYear();
    this.selectedSector = [];
    this.feedbackStatus = 'all';
    this.pageIndex = 0;
    this.loadEngagements();
  }

  hasActiveFilters(): boolean {
    return (
      this.selectedSector.length > 0 ||
      this.feedbackStatus !== 'all' ||
      this.selectedSchoolYear !== getSchoolYear()
    );
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
