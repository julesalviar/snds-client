import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PpaPlan } from '../../common/model/ppa-plan.model';
import { AuthService } from '../../auth/auth.service';
import { UserType } from '../../registration/user-type.enum';
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { formatDateString } from '../../common/date-utils';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';

export interface PpaPlanContextDialogData {
  plan: PpaPlan;
}

@Component({
  selector: 'app-ppa-plan-context-dialog',
  standalone: true,
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

  /** Whether the current user can edit/delete: must be OfficeAdmin or ProgramHolder, and be the assigned user */
  get canEdit(): boolean {
    const currentUserId = this.authService.getUserId();
    const activeRole = this.authService.getActiveRole();

    if (activeRole !== UserType.OfficeAdmin && activeRole !== UserType.ProgramHolder) {
      return false;
    }

    const assigned = this.plan.assignedUserId;
    if (!currentUserId || assigned == null) return false;
    const assignedId = typeof assigned === 'string' ? assigned : (assigned as unknown as { _id?: string })?._id;
    return !!assignedId && currentUserId === assignedId;
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
    if (value == null) return '—';
    if (typeof value === 'string') return value || '—';
    const u = value as { name?: string; userName?: string; email?: string; _id?: string };
    return u?.name || u?.userName || u?.email || u?._id || '—';
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

  onEdit(): void {
    const planId = this.plan._id;
    if (planId) {
      this.dialogRef.close({ action: 'edit', planId });
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
