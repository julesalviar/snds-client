import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import {MatMenu, MatMenuModule} from '@angular/material/menu';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { SharedDataService } from '../../common/services/shared-data.service';
import {Router, RouterModule} from "@angular/router";
import {MatButton, MatIconButton} from "@angular/material/button";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {SchoolNeed} from "../../common/model/school-need.model"
import {SchoolNeedService} from "../../common/services/school-need.service";

@Component({
  selector: 'app-list-of-school-needs',
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
    RouterModule,
    MatButton,
    MatIconButton,
    MatPaginator,
    MatProgressBarModule,
    MatBadgeModule
  ],
  templateUrl: './list-of-school-needs.component.html',
  styleUrls: ['./list-of-school-needs.component.css']
})
export class ListOfSchoolNeedsComponent implements OnInit {
  displayedColumns: string[] = [
    'code',
    'engaged',
    'year',
    'specificContribution',
    'quantity',
    'amount',
    'beneficiaryStudents',
    'beneficiaryPersonnel',
    'implementationStatus',
    'actions'
  ];
  schoolName: string = '';
  pageIndex: number = 0;
  pageSize: number = 10;
  dataSource = new MatTableDataSource<SchoolNeed>();
  totalItems: number = 0;
  isLoading: boolean = true;

  constructor(
    private readonly sharedDataService: SharedDataService,
    private readonly router: Router,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSchoolNeeds();
  }

  navigateToEngage(code: string): void {
    this.router.navigate(['/school-admin/school-needs-engage', code]);
  }

  view(need: SchoolNeed): void {
  this.router.navigate(['/school-admin/school-need-view/', need.code]);
}
  edit(need: SchoolNeed): void {
    this.router.navigate(['/school-admin/school-need/', need.code]);
  }

  delete(need: SchoolNeed): void {
    this.router.navigate(['/school-admin/school-need/', need.code]);
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadSchoolNeeds();
  }

  loadSchoolNeeds(): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;

    this.schoolNeedService.getSchoolNeeds(page, this.pageSize, undefined, undefined, undefined, true).subscribe({
      next: (response) => {
        this.schoolName = response.school?.schoolName;
        this.dataSource.data = response.data;
        this.totalItems = response.meta.totalItems;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching school needs:', err);
        this.isLoading = false;
      }
    });
  }

  getEngagementStatus(schoolNeed: SchoolNeed): string {
    return schoolNeed.implementationStatus ?? 'Looking for partner';
  }
}
