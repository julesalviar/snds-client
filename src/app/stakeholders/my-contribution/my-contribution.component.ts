import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatHeaderRow, MatHeaderRowDef, MatRowDef } from '@angular/material/table';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MyContribution } from '../../common/model/my-contribution.model';
import {EngagementService} from "../../common/services/engagement.service";
import {getSchoolYear} from "../../common/date-utils";
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
    MatIconButton,
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
  displayedColumns: string[] = ['need', 'schoolName', 'schoolYear', 'quantity', 'amount', 'engagements', 'mov', 'feedback'];
  dataSource = new MatTableDataSource<Contribution>([]);
  schoolYears: string[] = [];
  selectedSchoolYear: string = getSchoolYear();
  loading = false;
  error: string | null = null;
  expandedRowId: string | null = null;
  isDesktop = window.innerWidth > 768;

  constructor(private readonly engagementService: EngagementService) {
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
        const contributions = this.transformContributionsData(response.data);
        this.dataSource.data = contributions;
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

  private transformContributionsData(myContributions: MyContribution[]): Contribution[] {
    return myContributions.map(contribution => ({
      need: contribution.specificContribution,
      schoolName: contribution.schoolId.schoolName,
      schoolYear: contribution.schoolYear,
      quantity: contribution.totalQuantity,
      amount: contribution.totalAmount,
      engagements: this.formatEngagementDates(contribution.engagementDates),
      mov: (contribution as any).mov || '',
      feedback: (contribution as any).feedback || ''
    }));
  }

  private formatEngagementDates(engagementDates: string): string {
    if (!engagementDates) return '';
    
    // Split by comma and trim whitespace
    const dates = engagementDates.split(',').map(date => date.trim());
    
    // Format each date to short date (MM/dd/yyyy)
    const formattedDates = dates.map(dateStr => {
      const date = new Date(dateStr);
      // Check if date is valid
      if (isNaN(date.getTime())) return dateStr;
      
      // Format as MM/dd/yyyy
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${month}/${day}/${year}`;
    });
    
    return formattedDates.join(', ');
  }

  onFeedbackClick(contribution: Contribution, feedbackValue: string): void {
    // Update the feedback value for this contribution
    contribution.feedback = feedbackValue;
    
    // Collapse the feedback buttons after selection
    this.expandedRowId = null;
    
    // TODO: Send feedback to backend API
    console.log('Feedback submitted:', {
      contribution: contribution,
      feedback: feedbackValue
    });
    
    // You can add a service call here to save the feedback
    // this.engagementService.submitFeedback(contribution.id, feedbackValue).subscribe(...);
  }

  getRowId(contribution: Contribution): string {
    // Create a unique ID for each row based on contribution properties
    const rowId = `${contribution.need}-${contribution.schoolName}-${contribution.schoolYear}`.replace(/\s+/g, '-');
    return rowId;
  }


  toggleFeedbackExpansion(contribution: Contribution): void {
    // Toggle on click for both desktop and mobile
    const rowId = this.getRowId(contribution);
    
    if (this.expandedRowId === rowId) {
      this.expandedRowId = null;
    } else {
      this.expandedRowId = rowId;
    }
  }

  getFeedbackEmoji(feedback: string): string {
    const emojiMap: { [key: string]: string } = {
      'very-dissatisfied': '😢',
      'dissatisfied': '😞',
      'neutral': '😐',
      'satisfied': '🙂',
      'very-satisfied': '😄'
    };
    return emojiMap[feedback] || '😊';
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

}

interface Contribution {
  need: string;
  schoolName: string;
  schoolYear: string;
  quantity: number;
  amount: number;
  engagements: string;
  mov: string;
  feedback: string;
}
