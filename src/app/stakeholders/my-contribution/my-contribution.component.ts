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
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MyContribution} from '../../common/model/my-contribution.model';
import {EngagementService} from "../../common/services/engagement.service";
import {getSchoolYear} from "../../common/date-utils";
import {ThumbnailUtils} from "../../common/utils/thumbnail.utils";
import {SchoolNeedImage} from "../../common/model/school-need.model";
import {Router} from "@angular/router";

@Component({
  selector: 'app-my-contribution',
  standalone: true,
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
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule]
})
export class MyContributionComponent implements OnInit {
  displayedColumns: string[] = ['need', 'schoolName', 'schoolYear', 'quantity', 'amount', 'engagements', 'mov', 'feedback', 'actions'];
  dataSource = new MatTableDataSource<MyContribution>([]);
  schoolYears: string[] = [];
  selectedSchoolYear: string = getSchoolYear();
  loading = false;
  error: string | null = null;
  expandedRowId: string | null = null;

  constructor(
    private readonly engagementService: EngagementService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {
    this.schoolYears = this.generateSchoolYears();
  }

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

  private generateSchoolYears(): string[] {
    const currentSchoolYear = getSchoolYear();
    const currentStartYear = parseInt(currentSchoolYear.split('-')[0]);
    const years: string[] = [];

    // Generate from 2015-2016 to current school year
    for (let year = currentStartYear; year >= 2015; year--) {
      years.push(`${year}-${year + 1}`);
    }

    return years;
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

  onFeedbackClick(contribution: Contribution, feedbackValue: string): void {
    (contribution as any).feedback = feedbackValue;

    this.expandedRowId = null;

    this.snackBar.open('Feedback feature is work in progress', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    });

    // TODO: Send feedback to backend API
    console.log('Feedback submitted:', {
      contribution: contribution,
      feedback: feedbackValue
    });

    // this.engagementService.submitFeedback(contribution.engagement, feedbackValue).subscribe(...);
  }

  getRowId(contribution: Contribution): string {
    const rowId = `${contribution.need}-${contribution.schoolName}-${contribution.engagement}`.replace(/\s+/g, '-');
    return rowId;
  }

  toggleFeedbackExpansion(contribution: Contribution): void {
    const rowId = this.getRowId(contribution);

    if (this.expandedRowId === rowId) {
      this.expandedRowId = null;
    } else {
      this.expandedRowId = rowId;
    }
  }

  getFeedbackIcon(feedback: string): string {
    const iconMap: { [key: string]: string } = {
      'very-dissatisfied': 'sentiment_very_dissatisfied',
      'dissatisfied': 'sentiment_dissatisfied',
      'neutral': 'sentiment_neutral',
      'satisfied': 'sentiment_satisfied',
      'very-satisfied': 'sentiment_very_satisfied'
    };
    return iconMap[feedback] || 'rate_review';
  }

  getFeedbackColor(feedback: string): string {
    if (feedback === 'very-dissatisfied' || feedback === 'dissatisfied') {
      return 'warn';
    } else if (feedback === 'neutral') {
      return 'accent';
    } else if (feedback === 'satisfied' || feedback === 'very-satisfied') {
      return 'primary';
    }
    return '';
  }

  getFeedbackLabel(feedback: string): string {
    const labelMap: { [key: string]: string } = {
      'very-dissatisfied': 'Very Dissatisfied',
      'dissatisfied': 'Dissatisfied',
      'neutral': 'Neutral',
      'satisfied': 'Satisfied',
      'very-satisfied': 'Very Satisfied'
    };
    return labelMap[feedback] || '';
  }

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

interface Contribution {
  need: string;
  schoolName: string;
  schoolYear: string;
  quantity: number;
  amount: number;
  engagement: string;
  images: SchoolNeedImage[];
}
