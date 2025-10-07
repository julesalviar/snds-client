import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import {MatMenu, MatMenuModule} from '@angular/material/menu';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SharedDataService } from '../../common/services/shared-data.service';
import { ImplementationStatusDialogComponent } from '../implementation-status-dialog/implementation-status-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import {Router, RouterModule} from "@angular/router";
import {MatButton, MatIconButton} from "@angular/material/button";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {SchoolNeed} from "../../common/model/school-need.model"
import {SchoolNeedService} from "../../common/services/school-need.service";
import { SchoolNeedViewComponent } from '../school-need-view/school-need-view.component';

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
    MatProgressBarModule
  ],
  templateUrl: './list-of-school-needs.component.html',
  styleUrls: ['./list-of-school-needs.component.css']
})
export class ListOfSchoolNeedsComponent implements OnInit {
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
  isLoading: boolean = true;
  schoolneedsview = SchoolNeedViewComponent;

  constructor(
    private readonly sharedDataService: SharedDataService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly schoolNeedService: SchoolNeedService,
  ) {}

  ngOnInit(): void {
    this.loadSchoolNeeds();
  }

  openStatusDialog(need: SchoolNeed): void {
    const dialogRef = this.dialog.open(ImplementationStatusDialogComponent, {
      data: {
        implementationStatus: need.implementationStatus,
        schoolName: this.schoolName // Pass the school name
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed with result:', result);
    });
  }

  navigateToEngage(code: string): void {
    this.router.navigate(['/school-admin/school-needs-engage', code]);
  }

  engage(need: SchoolNeed): void {
    need.engaged = true; // Mark as engaged locally
    console.log('Engaging with:', need);
  }

  progress(need: SchoolNeed): void {
    const dialogRef = this.dialog.open(ImplementationStatusDialogComponent, {
      data: {
        implementationStatus: need.implementationStatus,
        schoolName: this.schoolName,
        code: need.code,
        engaged: need.engaged,
        specificContribution:need.specificContribution,

      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update the implementation status in the list
        const updatedNeed = this.schoolNeeds.find(n => n.code === need.code);
        if (updatedNeed) {
          updatedNeed.implementationStatus = result.implementationStatus; // Update status
        }
        console.log('Dialog closed with updated status:', result);
      }
    });
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

    this.schoolNeedService.getSchoolNeeds(page, this.pageSize).subscribe({
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
}
