import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PpaPlan } from '../../common/model/ppa-plan.model';
import { AuthService } from '../../auth/auth.service';
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { formatDateString } from '../../common/date-utils';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import {
  canActOnPpaPlan,
  formatUserRefDisplay,
  resolveAssignedUserIdFromPlan,
} from '../../common/utils/ppa-plan-user-display.util';
import { canDuplicatePpaPlan } from '../../common/utils/ppa-plan-form.util';

export interface PpaPlanContextDialogData {
  plan: PpaPlan;
}

@Component({
  selector: 'app-ppa-plan-context-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './ppa-plan-context-dialog.component.html',
  styleUrl: './ppa-plan-context-dialog.component.css',
})
export class PpaPlanContextDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<PpaPlanContextDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PpaPlanContextDialogData,
    private readonly authService: AuthService,
    private readonly ppaPlanService: PpaPlanService,
    private readonly planClassificationService: PlanClassificationDisplayService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  get plan(): PpaPlan {
    return this.data.plan;
  }

  /** Whether the current user can edit/delete (matches list canActOnPlan). */
  get canEdit(): boolean {
    return canActOnPpaPlan(
      this.authService.getActiveRole(),
      this.authService.getUserId(),
      resolveAssignedUserIdFromPlan(this.plan.assignedUserId),
    );
  }

  /** Duplicate is program holder only (matches list showDuplicateButton). */
  get canDuplicate(): boolean {
    return canDuplicatePpaPlan(this.authService.getActiveRole(), this.canEdit);
  }

  formatDate(value: string | undefined): string {
    return formatDateString(value);
  }

  getClassificationDisplay(value: string | undefined): string {
    return this.planClassificationService.getDisplayText(value) || '—';
  }

  getStartDate(): string {
    const start =
      (this.plan as unknown as Record<string, unknown>)['implementationStartDate'] ??
      (this.plan as unknown as Record<string, unknown>)['implementation_start_date'];
    return this.formatDate(start as string | undefined);
  }

  getEndDate(): string {
    const end =
      (this.plan as unknown as Record<string, unknown>)['implementationEndDate'] ??
      (this.plan as unknown as Record<string, unknown>)['implementation_end_date'];
    return this.formatDate(end as string | undefined);
  }

  /** Display user from id string or populated object */
  getUserDisplay(value: string | { _id?: string; name?: string; userName?: string; email?: string } | null | undefined): string {
    return formatUserRefDisplay(value);
  }

  /** Label for report link (e.g. "Report 1" or "Download" when single). */
  getReportLinkLabel(urls: string[], index: number): string {
    if (urls.length <= 1) return 'Download';
    return `Report ${index + 1}`;
  }

  /** Display array as comma-separated string */
  getArrayDisplay(arr: string[] | null | undefined): string {
    if (!Array.isArray(arr) || arr.length === 0) return '—';
    return arr.join(', ');
  }

  /** Display fundSource (string[] or legacy string) as comma-separated string */
  getFundSourceDisplay(fundSource: string | string[] | null | undefined): string {
    if (fundSource == null) return '—';
    const arr = Array.isArray(fundSource) ? fundSource : (fundSource ? [fundSource] : []);
    return arr.length > 0 ? arr.join(', ') : '—';
  }

  onEdit(): void {
    const planId = this.plan._id;
    if (planId) {
      this.dialogRef.close({ action: 'edit', planId });
    }
  }

  onDuplicate(): void {
    const planId = this.plan._id;
    if (planId) {
      this.dialogRef.close({ action: 'duplicate', planId });
    }
  }

  onDelete(): void {
    const title = this.plan.title || 'this plan';
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete PPA Plan',
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    confirmRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && this.plan._id) {
        this.ppaPlanService.delete(this.plan._id).subscribe({
          next: () => {
            this.snackBar.open('PPA plan deleted successfully.', 'Close', {
              duration: 4000,
              horizontalPosition: 'end',
              verticalPosition: 'top',
              panelClass: ['success-snackbar'],
            });
            this.dialogRef.close({ action: 'deleted' });
          },
          error: (err) => {
            console.error('Failed to delete PPA plan', err);
            this.snackBar.open(
              err?.error?.message ?? 'Failed to delete PPA plan.',
              'Close',
              { duration: 5000, panelClass: ['error-snackbar'] }
            );
          },
        });
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
