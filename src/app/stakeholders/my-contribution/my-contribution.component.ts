import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatHeaderRow, MatHeaderRowDef, MatRowDef } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
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
    MatCard,
    MatCardTitle,
    MatIcon,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule]
})
export class MyContributionComponent implements OnInit {
  displayedColumns: string[] = ['need', 'schoolName', 'schoolYear', 'quantity', 'amount', 'engagements'];
  dataSource = new MatTableDataSource<Contribution>([]);
  schoolYears: string[] = [];
  selectedSchoolYear: string = getSchoolYear();
  loading = false;
  error: string | null = null;

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
      engagements: this.formatEngagementDates(contribution.engagementDates)
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
}

interface Contribution {
  need: string;
  schoolName: string;
  schoolYear: string;
  quantity: number;
  amount: number;
  engagements: string;
}
