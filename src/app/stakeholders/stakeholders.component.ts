import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {SchoolNeed} from "../common/model/school-need.model";
import {SchoolNeedService} from "../common/services/school-need.service";

@Component({
  selector: 'app-stakeholders',
  standalone: true,
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
    MatProgressBarModule,
    MatButton
  ],
  templateUrl: './stakeholders.component.html',
  styleUrl: './stakeholders.component.css'
})
export class StakeholdersComponent implements OnInit {
  displayedColumns: string[] = [
    'school',
    'specificContribution',
    'quantity',
    'amount',
    'beneficiaryStudents',
    'beneficiaryPersonnel',
    'implementationStatus',
    'actions'
  ];

  schoolNeeds: SchoolNeed[] = [];
  schoolName: string = '';
  pageIndex: number = 0;
  pageSize: number = 10;
  dataSource = new MatTableDataSource<SchoolNeed>();
  totalItems: number = 0;
  totalQuantity: number = 0;
  totalBySchool: number = 0;
  selectedContribution: string | null = null;
  schoolId: string | null = null;
  isLoading: boolean = true;

  constructor(
    private readonly router: Router,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Get the selectedContribution and schoolId from query parameters
    this.route.queryParams.subscribe(params => {
      this.selectedContribution = params['selectedContribution'] ?? null;
      this.schoolId = params['schoolId'] ?? null;
      this.loadSchoolNeeds();
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadSchoolNeeds();
  }

  loadSchoolNeeds(): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;

    this.schoolNeedService.getSchoolNeeds(page, this.pageSize, undefined, this.selectedContribution ?? undefined, this.schoolId ?? undefined).subscribe({
      next: (response) => {
        this.schoolName = response.school?.schoolName;
        this.dataSource.data = response.data;
        this.totalItems = response.meta.totalItems;
        this.totalQuantity = response.meta.totalQuantity;
        this.totalBySchool = response.meta.totalBySchool;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching school needs:', err);
        this.isLoading = false;
      }
    });
  }

  viewDetails(schoolNeed: SchoolNeed): void {
    console.log('View details for:', schoolNeed);
    // Implement view details logic
  }

  editSchoolNeed(schoolNeed: SchoolNeed): void {
    console.log('Edit school need:', schoolNeed);
    // Implement edit logic
  }

  viewSchoolNeed(schoolNeed: SchoolNeed): void {
    this.router.navigate(['/stakeholder/school-need-view/', schoolNeed.code]);
  }

  deleteSchoolNeed(schoolNeed: SchoolNeed): void {
    console.log('Delete school need:', schoolNeed);
  }

  viewAnnualImplementationPlan() {
    this.router.navigate(['/stakeholder/aip/', this.schoolId]);
  }
}
