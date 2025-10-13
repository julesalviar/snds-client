import {Component, OnInit} from '@angular/core';
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
import {MyContribution} from '../../common/model/my-contribution.model';
import {EngagementService} from "../../common/services/engagement.service";
import {getSchoolYear} from "../../common/date-utils";
import {ThumbnailUtils} from "../../common/utils/thumbnail.utils";
import {SchoolNeedImage} from "../../common/model/school-need.model";

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
    MatFormFieldModule]
})
export class MyContributionComponent implements OnInit {
  displayedColumns: string[] = ['need', 'schoolName', 'schoolYear', 'quantity', 'amount', 'engagements', 'mov'];
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
        this.dataSource.data = this.transformContributionsData(response.data);
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
      need: contribution.schoolNeedId?.specificContribution ?? '',
      schoolName: contribution.schoolId?.schoolName,
      schoolYear: contribution.schoolYear,
      quantity: contribution.quantity,
      amount: contribution.amount,
      engagement: contribution.startDate,
      images: contribution.schoolNeedId?.images ?? []
    }));
  }

  getThumbnailImages(contribution: any): SchoolNeedImage[] {
    return ThumbnailUtils.getThumbnailImages(contribution);
  }

  onImageError(event: any): void {
    ThumbnailUtils.onImageError(event);
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
