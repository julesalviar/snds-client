import {Component, OnInit, HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  MatCellDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRowDef,
  MatTableDataSource,
  MatTableModule
} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatCard, MatCardTitle} from '@angular/material/card';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {MyContribution} from '../../common/model/my-contribution.model';
import {EngagementService} from "../../common/services/engagement.service";
import {getSchoolYear, getSchoolYearOptions} from "../../common/date-utils";
import {ThumbnailUtils} from "../../common/utils/thumbnail.utils";
import {SchoolNeedImage} from "../../common/model/school-need.model";
import {Router} from "@angular/router";
import {
  getRatingCssColor,
  getRatingIcon,
  getRatingLabel,
  RATING_OPTIONS,
  RatingValue,
} from "../../common/utils/rating.util";

@Component({
  selector: 'app-my-contribution',
  templateUrl: './my-contribution.component.html',
  styleUrls: ['./my-contribution.component.css'],
  imports: [CommonModule,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRowDef,
    MatTableModule,
    MatButtonModule,
    MatCard,
    MatCardTitle,
    MatIcon,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSnackBarModule],
})
export class MyContributionComponent implements OnInit {
  displayedColumns: string[] = ['need', 'schoolName', 'schoolYear', 'quantity', 'amount', 'engagements', 'mov', 'feedback', 'actions'];
  dataSource = new MatTableDataSource<MyContribution>([]);
  schoolYears: string[] = getSchoolYearOptions();
  selectedSchoolYear: string = getSchoolYear();
  loading = false;
  error: string | null = null;
  expandedRowId: string | null = null;
  submittingRatingId: string | null = null;
  readonly ratingOptions = RATING_OPTIONS;

  constructor(
    private readonly engagementService: EngagementService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMyContributions(this.selectedSchoolYear);
  }

  loadMyContributions(schoolYear?: string): void {
    this.loading = true;
    this.error = null;

    this.engagementService.getMyContributions(schoolYear).subscribe({
      next: (response) => {
        this.dataSource.data = response.data;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load contributions. Please try again.';
        this.loading = false;
        console.error('Error loading contributions:', error);
      }
    });
  }

  onSchoolYearChange(schoolYear: string): void {
    this.selectedSchoolYear = schoolYear;
    this.loadMyContributions(schoolYear);
  }

  getThumbnailImages(contribution: any): SchoolNeedImage[] {
    return ThumbnailUtils.getThumbnailImages(contribution);
  }

  onImageError(event: any): void {
    ThumbnailUtils.onImageError(event);
  }

  onRatingClick(contribution: MyContribution, rating: RatingValue | null): void {
    if (!contribution._id || this.submittingRatingId === contribution._id) {
      return;
    }

    const previousRating = contribution.rating;
    contribution.rating = rating ?? undefined;
    this.expandedRowId = null;
    this.submittingRatingId = contribution._id;

    this.engagementService.submitRating(contribution._id, rating).subscribe({
      next: () => {
        this.submittingRatingId = null;
        this.snackBar.open(
          rating === null ? 'Feedback cleared' : 'Feedback saved',
          'Close',
          {
            duration: 2500,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['info-snackbar']
          }
        );
      },
      error: (error) => {
        contribution.rating = previousRating;
        this.submittingRatingId = null;
        console.error('Error submitting rating:', error);
        this.snackBar.open('Failed to save feedback. Please try again.', 'Close', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  clearRating(contribution: MyContribution): void {
    this.onRatingClick(contribution, null);
  }

  getRowId(contribution: MyContribution): string {
    return contribution._id;
  }

  toggleFeedbackExpansion(contribution: MyContribution): void {
    if (this.submittingRatingId === contribution._id) {
      return;
    }

    const rowId = this.getRowId(contribution);

    if (this.expandedRowId === rowId) {
      this.expandedRowId = null;
    } else {
      this.expandedRowId = rowId;
    }
  }

  getRatingIcon = getRatingIcon;
  getRatingCssColor = getRatingCssColor;
  getRatingLabel = getRatingLabel;

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.expandedRowId) {
      return;
    }

    const target = event.target as HTMLElement;

    const clickedInsidePopup = target.closest('.feedback-popup');
    const clickedInsideTrigger = target.closest('.feedback-trigger');

    if (!clickedInsidePopup && !clickedInsideTrigger) {
      this.expandedRowId = null;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.expandedRowId) {
      this.expandedRowId = null;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  viewContribution(contribution: MyContribution): void {
    this.router.navigate(['/stakeholder/school-need-view/', contribution.schoolNeedId?.code]);
  }

}
