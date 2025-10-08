import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import {MatMenu, MatMenuModule} from '@angular/material/menu';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    'feedback',
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
  expandedRowId: string | null = null;

  constructor(
    private readonly sharedDataService: SharedDataService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly snackBar: MatSnackBar
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

  onFeedbackClick(need: SchoolNeed, feedbackValue: string): void {
    // Update the feedback value for this school need
    (need as any).feedback = feedbackValue;
    
    // Collapse the feedback buttons after selection
    this.expandedRowId = null;
    
    // Show work in progress alert
    this.snackBar.open('Feedback feature is work in progress', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    });
    
    // TODO: Send feedback to backend API
    console.log('Feedback submitted:', {
      need: need,
      feedback: feedbackValue
    });
    
    // You can add a service call here to save the feedback
    // this.schoolNeedService.submitFeedback(need.code, feedbackValue).subscribe(...);
  }

  getRowId(need: SchoolNeed): string {
    // Create a unique ID for each row based on school need properties
    const rowId = `${need.code}-${need.specificContribution}`.replace(/\s+/g, '-');
    return rowId;
  }

  toggleFeedbackExpansion(need: SchoolNeed): void {
    // Toggle on click for both desktop and mobile
    const rowId = this.getRowId(need);
    
    if (this.expandedRowId === rowId) {
      this.expandedRowId = null;
    } else {
      this.expandedRowId = rowId;
    }
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
