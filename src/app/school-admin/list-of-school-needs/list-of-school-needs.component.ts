import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import {MatMenu, MatMenuModule} from '@angular/material/menu';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { SharedDataService } from '../../common/services/shared-data.service';
import {Router, RouterModule} from "@angular/router";
import {MatButton, MatIconButton} from "@angular/material/button";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {SchoolNeed} from "../../common/model/school-need.model"
import {SchoolNeedService} from "../../common/services/school-need.service";
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';

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
    'unit',
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
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete School Need',
        message: `Are you sure you want to delete the school need "${need.code ?? 'Unknown'}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performDelete(need);
      }
    });
  }

  private performDelete(need: SchoolNeed): void {
    if (!need.code) {
      this.snackBar.open('Cannot delete school need: missing code', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Show loading state
    this.isLoading = true;

    this.schoolNeedService.deleteSchoolNeed(need?.code).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('School need deleted successfully', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.loadSchoolNeeds(); // Refresh the list
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error deleting school need:', err);

        // Extract specific error message from server response
        let errorMessage = 'Failed to delete school need';

        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.status === 404) {
          errorMessage = 'School need not found';
        } else if (err.status === 403) {
          errorMessage = 'You do not have permission to delete this school need';
        } else if (err.status === 500) {
          errorMessage = 'Server error occurred while deleting school need';
        } else if (err.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your internet connection';
        }

        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
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
