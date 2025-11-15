import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {Subject, takeUntil} from "rxjs";
import {SchoolNeedService} from "../../common/services/school-need.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {SchoolNeed} from "../../common/model/school-need.model";
import {CurrencyPipe, DatePipe, DecimalPipe, NgForOf, NgIf, UpperCasePipe} from "@angular/common";
import {MatDialog} from "@angular/material/dialog";
import {ConfirmDialogComponent, ConfirmDialogData} from "../../common/components/confirm-dialog/confirm-dialog.component";
import {EngagementService} from "../../common/services/engagement.service";

interface ImplementationStatus {
  progress: number;
  status: string;
}

@Component({
  selector: 'app-school-need-view',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DecimalPipe,
    NgForOf,
    NgIf,
    UpperCasePipe,
    CurrencyPipe,
    DatePipe

  ],
  templateUrl: './school-need-view.component.html',
  styleUrls: ['./school-need-view.component.css']

})
export class SchoolNeedViewComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  schoolNeed: SchoolNeed | undefined = undefined;
  code: string | null = null;
  isLoading: boolean = true;

  progressValue = 0; // Example progress value (from 10% to 100%)

  // Columns for the stakeholder table
  displayedColumns: string[] = ['contributor', 'quantity', 'amount', 'action'];

  // Image preview properties
  showImagePreview: boolean = false;
  currentPreviewIndex: number = 0;

  // Track which engagement is being deleted
  deletingEngagementId: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly engagementService: EngagementService,
  ) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code');
    console.log('View component code:', this.code);

    if (this.code) {
      this.loadSchoolNeed(this.code);
    } else {
      this.showErrorNotification('School need code not provided');
      this.router.navigate(['/school-admin/school-needs']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSchoolNeed(needCode: string): void {
    this.schoolNeedService.getSchoolNeedByCode(needCode).pipe(takeUntil(this.destroy$)).subscribe({
      next: (need) => {
        console.log('Received school need data:', need);
        this.schoolNeed = need;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching school need:', err);
        this.showErrorNotification('Failed to load school need');
        this.router.navigate(['/school-admin/school-needs']);
      }
    });
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showErrorNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  deleteStakeholder(engagement: any): void {
    if (!engagement || !engagement._id) {
      this.showErrorNotification('Invalid engagement data');
      return;
    }

    const dialogData: ConfirmDialogData = {
      title: 'Delete Engagement',
      message: `Are you sure you want to delete the engagement from ${engagement.stakeholderUserId?.name || 'this contributor'}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deletingEngagementId = engagement._id;
        this.engagementService.deleteEngagement(engagement._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.deletingEngagementId = null;
              this.showSuccessNotification('Engagement deleted successfully');
              // Reload the school need to refresh the engagements list
              if (this.code) {
                this.loadSchoolNeed(this.code);
              }
            },
            error: (err) => {
              this.deletingEngagementId = null;
              console.error('Error deleting engagement:', err);
              this.showErrorNotification('Failed to delete engagement. Please try again.');
            }
          });
      }
    });
  }

  openImagePreview(index: number): void {
    this.currentPreviewIndex = index;
    this.showImagePreview = true;
  }

  closeImagePreview(): void {
    this.showImagePreview = false;
  }

  nextImage(): void {
    if (this.schoolNeed?.images && this.currentPreviewIndex < this.schoolNeed.images.length - 1) {
      this.currentPreviewIndex++;
    }
  }

  previousImage(): void {
    if (this.currentPreviewIndex > 0) {
      this.currentPreviewIndex--;
    }
  }

  getCurrentImage(): string {
    return this.schoolNeed?.images[this.currentPreviewIndex]?.originalUrl ?? '';
  }

  getEngagementStatus(schoolNeed?: SchoolNeed | undefined): ImplementationStatus {
    if (!schoolNeed) return { progress: 0, status: 'Empty' };
    const engagements = schoolNeed?.engagements;
    const targetQuantity = schoolNeed?.quantity ?? 0;

    if (!engagements || engagements.length === 0) {
      return { progress: 0, status: 'Looking for partner' };
    }

    const totalQuantity = engagements.reduce((sum, engagement) => {
      return sum + (typeof engagement.quantity === 'number' ? engagement.quantity : 0);
    }, 0);

    if (targetQuantity === 0) {
      return { progress: targetQuantity, status: 'Target quantity not set' };
    }

    if (totalQuantity >= targetQuantity) {
      return { progress: 100, status: 'Completed' };
    }

    const percentage = Math.round((totalQuantity / targetQuantity) * 100);
    return { progress: percentage, status: `${percentage}% complete` };
  }
}
