import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil} from "rxjs";
import {SchoolNeedService} from "../../common/services/school-need.service";
import {AipService} from "../../common/services/aip.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ProjectInfo, SchoolNeed} from "../../common/model/school-need.model";
import {Aip} from "../../common/model/aip.model";
import {CurrencyPipe, DatePipe, DecimalPipe, NgForOf, NgIf, UpperCasePipe} from "@angular/common";
import {MatDialog} from "@angular/material/dialog";
import { AipDetailViewComponent } from '../../table-button-dialog/confirm-delete-dialog/view button/aip-detail-view/aip-detail-view.component';

import {ConfirmDialogComponent, ConfirmDialogData} from "../../common/components/confirm-dialog/confirm-dialog.component";
import {EngagementService} from "../../common/services/engagement.service";
import {AuthService} from "../../auth/auth.service";
import {UserType} from "../../registration/user-type.enum";

interface ImplementationStatus {
  progress: number;
  status: string;
}

@Component({
  selector: 'app-school-need-view',
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    DecimalPipe,
    NgForOf,
    NgIf,
    UpperCasePipe,
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './school-need-view.component.html',
  styleUrls: ['./school-need-view.component.css'],
})
export class SchoolNeedViewComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  schoolNeed: SchoolNeed | undefined = undefined;
  code: string | null = null;
  isLoading: boolean = true;

  progressValue = 0; // Example progress value (from 10% to 100%)

  // Columns for the stakeholder table
  displayedColumns: string[] = ['contributor', 'quantity', 'unit', 'amount'];

  // Image preview properties
  showImagePreview: boolean = false;
  currentPreviewIndex: number = 0;

  // Track which engagement is being deleted
  deletingEngagementId: string | null = null;

  // Project-related properties
  projectsData: Aip[] = [];

  protected aipChips: Aip[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly aipService: AipService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly engagementService: EngagementService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code');
    console.log('View component code:', this.code);

    if (this.isSchoolAdmin()) {
      this.displayedColumns.push('action');
    }

    if (this.code) {
      this.loadSchoolNeed(this.code);
    } else {
      this.showErrorNotification('School need code not provided');
      this.router.navigate(['/school-admin/list-of-school-needs']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSchoolNeed(needCode: string): void {
    this.schoolNeedService.getSchoolNeedByCode(needCode, true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (need) => {
        console.log('Received school need data:', need);
        this.schoolNeed = need;
        this.refreshAipChips();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching school need:', err);
        this.showErrorNotification('Failed to load school need');
        this.router.navigate(['/school-admin/list-of-school-needs']);
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

  editStakeholder(engagement: any): void {
    if (!this.isSchoolAdmin()) {
      this.showErrorNotification('Unauthorized: Only school administrators can edit engagements');
      return;
    }

    if (!engagement || !engagement._id || !this.code) {
      this.showErrorNotification('Invalid engagement data');
      return;
    }

    this.router.navigate(['/school-admin/school-needs-engage', this.code, engagement._id]);
  }

  deleteStakeholder(engagement: any): void {
    if (!this.isSchoolAdmin()) {
      this.showErrorNotification('Unauthorized: Only school administrators can delete engagements');
      return;
    }

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

  isSchoolAdmin(): boolean {
    return this.authService.getActiveRole() === UserType.SchoolAdmin;
  }

  private static readonly logPrefix = '[SchoolNeedView]';

  protected trackByAipId(_index: number, aip: Aip): string {
    return aip._id;
  }

  protected getProjectTitle(aip: Aip): string {
    return aip.title ?? '';
  }

  protected onProjectChipClick(event: MouseEvent, aip: Aip): void {
    const t = event.target as HTMLElement | null;
    const c = event.currentTarget as HTMLElement | null;
    console.log(`${SchoolNeedViewComponent.logPrefix} chip click`, {
      aipId: aip?._id,
      title: aip?.title,
      problemStatement: aip?.problemStatement,
      eventPhase: event.eventPhase,
      defaultPrevented: event.defaultPrevented,
      targetTag: t?.tagName,
      targetClass: typeof t?.className === 'string' ? t.className : '',
      currentTag: c?.tagName,
      currentClass: typeof c?.className === 'string' ? c.className : '',
    });
    this.viewProjectDetails(aip);
  }

  protected viewProjectDetails(aip: Aip): void {
    console.log(`${SchoolNeedViewComponent.logPrefix} viewProjectDetails enter`, {
      hasAip: !!aip,
      _id: aip?._id,
      title: aip?.title,
      apn: aip?.apn,
    });

    if (!aip?._id) {
      console.warn(`${SchoolNeedViewComponent.logPrefix} viewProjectDetails abort: missing _id`);
      this.showErrorNotification('Invalid project');
      return;
    }

    const openDialog = (payload: Aip, source: string): void => {
      try {
        this.dialog.open(AipDetailViewComponent, {
          data: payload,
          width: '560px',
          maxWidth: '95vw',
        });
      } catch (e) {
        console.error(`${SchoolNeedViewComponent.logPrefix} dialog.open threw`, e);
        this.showErrorNotification('Could not open project details dialog');
      }
    };

    const hasUsableSummary = !!(aip.title?.trim() || aip.objectives?.trim() || aip.apn?.trim());
    console.log(`${SchoolNeedViewComponent.logPrefix} viewProjectDetails branch`, {
      hasUsableSummary,
    });

    if (hasUsableSummary) {
      openDialog(aip, 'embedded-summary');
      return;
    }

    this.aipService.getAipById(aip._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (full) => {
        console.log(`${SchoolNeedViewComponent.logPrefix} getAipById next`, {
          id: full?._id,
          title: full?.title,
        });
        openDialog(full, 'getAipById');
      },
      error: (err) => {
        console.error(`${SchoolNeedViewComponent.logPrefix} getAipById error`, err);
        this.showErrorNotification('Could not load project details');
      },
    });
  }

  private refreshAipChips(): void {
    const refs = this.schoolNeed?.projectId;
    this.aipChips = !refs?.length ? [] : refs.map((ref) => this.resolveProjectRefToAip(ref));
    console.log(`${SchoolNeedViewComponent.logPrefix} refreshAipChips`, {
      count: this.aipChips.length,
      ids: this.aipChips.map((a) => a._id),
    });
  }

  private resolveProjectRefToAip(ref: ProjectInfo | string): Aip {
    if (typeof ref === 'string') {
      return this.projectsData.find((p) => p._id === ref) ?? this.minimalAipFromId(ref);
    }
    return this.projectInfoToAip(ref);
  }

  private projectInfoToAip(info: ProjectInfo): Aip {
    const apn =
      info.apn === undefined || info.apn === null ? '' : String(info.apn);
    const status = (info.status as Aip['status']) ?? 'For Implementation';
    return {
      _id: info._id,
      apn,
      schoolYear: info.schoolYear ?? '',
      title: info.title ?? '',
      objectives: info.objectives ?? '',
      pillars: info.pillars ?? '',
      responsiblePerson: info.responsiblePerson ?? '',
      materialsNeeded: info.materialsNeeded ?? '',
      totalBudget: info.totalBudget ?? '',
      budgetSource: info.budgetSource ?? '',
      problemStatement: info.problemStatement ?? '',
      status,
    };
  }

  private minimalAipFromId(id: string): Aip {
    return {
      _id: id,
      apn: '',
      schoolYear: '',
      title: '',
      objectives: '',
      pillars: '',
      responsiblePerson: '',
      materialsNeeded: '',
      totalBudget: '',
      budgetSource: '',
      status: 'For Implementation',
    };
  }
}
