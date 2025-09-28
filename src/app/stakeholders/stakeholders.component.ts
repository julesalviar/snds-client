import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
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
    MatMenu,
    MatMenuModule,
    MatIconButton,
    MatPaginator
  ],
  templateUrl: './stakeholders.component.html',
  styleUrl: './stakeholders.component.css'
})
export class StakeholdersComponent implements OnInit {
  displayedColumns: string[] = [
    'code',
    'year',
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
  selectedContribution: string | null = null;

  constructor(
    private readonly schoolNeedService: SchoolNeedService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Get the selectedContribution from query parameters
    this.route.queryParams.subscribe(params => {
      this.selectedContribution = params['selectedContribution'] || null;
      this.loadSchoolNeeds();
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadSchoolNeeds();
  }

  loadSchoolNeeds(): void {
    const page = this.pageIndex + 1;

    this.schoolNeedService.getSchoolNeeds(page, this.pageSize, undefined, this.selectedContribution || undefined).subscribe(response => {
      this.schoolName = response.school?.schoolName;
      this.dataSource.data = response.data;
      this.totalItems = response.meta.totalItems;
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

  engageWithNeed(schoolNeed: SchoolNeed): void {
    console.log('Engage with school need:', schoolNeed);
    // Implement engagement logic
  }

  viewEngagement(schoolNeed: SchoolNeed): void {
    console.log('View engagement for:', schoolNeed);
    // Implement engagement view logic
  }

  deleteSchoolNeed(schoolNeed: SchoolNeed): void {
    console.log('Delete school need:', schoolNeed);
    // Implement delete logic
  }
}
