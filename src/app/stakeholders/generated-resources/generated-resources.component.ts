import { Component, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EngagementService } from '../../common/services/engagement.service';
import { Engagement, PopulatedStakeholderUser } from '../../common/model/engagement.model';

@Component({
  selector: 'app-generated-resources',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatPaginatorModule, MatProgressBarModule],
  templateUrl: './generated-resources.component.html',
  styleUrls: ['./generated-resources.component.css'] 
})
export class GeneratedResourcesComponent implements OnInit, AfterViewInit {
  
  displayedColumns: string[] = [
    'dateEngage',
    'stakeholder',
    'numberOfRepresentatives',
    'specificContribution',
    'quantity',
    'unit',
    'amount'
  ];

  dataSource = new MatTableDataSource<Engagement>([]);
  isLoading: boolean = false;
  pageIndex: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;
  totalAmount: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private readonly engagementService: EngagementService
  ) {}

  ngOnInit(): void {
    this.loadEngagements();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator; 
  }

  loadEngagements(): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;

    this.engagementService.getAllEngagement(page, this.pageSize).subscribe({
      next: (response) => {
        this.dataSource.data = response.data;
        this.totalItems = response.meta.totalItems;
        this.calculateTotal();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading engagements:', error);
        this.dataSource.data = [];
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEngagements();
  }

  calculateTotal(): void {
    this.totalAmount = this.dataSource.data.reduce((total, engagement) => {
      return total + (engagement.amount || 0);
    }, 0);
  }

  getStakeholderName(engagement: Engagement): string {
    if (engagement.stakeholderUserId && typeof engagement.stakeholderUserId === 'object') {
      const stakeholder = engagement.stakeholderUserId as PopulatedStakeholderUser;
      return stakeholder.name || stakeholder.email || '-';
    }
    return '-';
  }
}