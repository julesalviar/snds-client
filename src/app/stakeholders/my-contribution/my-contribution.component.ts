import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatHeaderRow, MatHeaderRowDef, MatRowDef } from '@angular/material/table'; 
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UserService } from '../../common/services/user.service';
import { MyContribution, MyContributionEngagement } from '../../common/model/my-contribution.model';
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
    MatProgressBarModule]
})
export class MyContributionComponent implements OnInit {
  displayedColumns: string[] = ['need', 'schoolName', 'engaged', 'amount', 'status', 'movs'];
  dataSource = new MatTableDataSource<Contribution>([]);
  loading = false;
  error: string | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadMyContributions();
  }

  loadMyContributions(): void {
    this.loading = true;
    this.error = null;
    
    this.userService.getMyContributions().subscribe({
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

  private transformContributionsData(myContributions: MyContribution[]): Contribution[] {
    const contributions: Contribution[] = [];
    
    myContributions.forEach(contribution => {
      contribution.myEngagements.forEach(engagement => {
        contributions.push({
          need: contribution.description,
          schoolName: contribution.schoolId.schoolName,
          engaged: new Date(engagement.signingDate),
          amount: engagement.donatedAmount,
          status: this.getEngagementStatus(engagement),
          movs: this.getEngagementMovs(engagement)
        });
      });
    });
    
    return contributions;
  }

  private getEngagementStatus(engagement: MyContributionEngagement): string {
    const now = new Date();
    const startDate = new Date(engagement.startDate);
    const endDate = new Date(engagement.endDate);
    
    if (now < startDate) {
      return 'Pending';
    } else if (now >= startDate && now <= endDate) {
      return 'In Progress';
    } else {
      return 'Completed';
    }
  }

  private getEngagementMovs(engagement: MyContributionEngagement): string {
    // For now, return a placeholder. This could be enhanced based on actual MOVs data
    return `Receipt #${engagement.stakeholderId.slice(-4)}`;
  }
}

interface Contribution {
  need: string;
  schoolName: string;
  engaged: Date;
  amount: number;
  status: string;
  movs: string;
}