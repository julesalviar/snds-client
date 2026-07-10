import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ChangeRequestService } from '../../common/services/change-request.service';
import {
  ChangeRequest,
  ChangeRequestStatus,
  ChangeRequestType,
  getChangeRequestStatusIcon,
  getChangeRequestStatusLabel,
  getChangeRequestTypeIcon,
  getChangeRequestTypeLabel,
} from '../../common/model/change-request.model';
import { formatDateTimeString } from '../../common/date-utils';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-change-requests',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './change-requests.component.html',
  styleUrl: './change-requests.component.css',
})
export class ChangeRequestsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  displayedColumns = [
    'type',
    'requestor',
    'fromEmail',
    'toEmail',
    'status',
    'requestedAt',
    'actions',
  ];

  dataSource = new MatTableDataSource<ChangeRequest>([]);
  isLoading = true;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalItems = 0;

  searchTerm = '';
  selectedStatus: ChangeRequestStatus | '' = ChangeRequestStatus.PENDING;

  readonly statusOptions: Array<{ value: ChangeRequestStatus | ''; label: string }> = [
    { value: '', label: 'All' },
    { value: ChangeRequestStatus.PENDING, label: 'Pending' },
    { value: ChangeRequestStatus.APPROVED, label: 'Approved' },
    { value: ChangeRequestStatus.DECLINED, label: 'Declined' },
    { value: ChangeRequestStatus.CANCELLED, label: 'Cancelled' },
  ];

  readonly ChangeRequestStatus = ChangeRequestStatus;

  constructor(
    private readonly changeRequestService: ChangeRequestService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadRequests();
      });
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() || this.selectedStatus !== ChangeRequestStatus.PENDING;
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onStatusChange(): void {
    this.pageIndex = 0;
    this.loadRequests();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = ChangeRequestStatus.PENDING;
    this.pageIndex = 0;
    this.loadRequests();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRequests();
  }

  getTypeIcon(type: ChangeRequestType): string {
    return getChangeRequestTypeIcon(type);
  }

  getTypeLabel(type: ChangeRequestType): string {
    return getChangeRequestTypeLabel(type);
  }

  getStatusIcon(status: ChangeRequestStatus): string {
    return getChangeRequestStatusIcon(status);
  }

  getStatusLabel(status: ChangeRequestStatus): string {
    return getChangeRequestStatusLabel(status);
  }

  formatDate(value?: string): string {
    return value ? formatDateTimeString(value) : '—';
  }

  getRequestorName(row: ChangeRequest): string {
    return row.requestor?.name?.trim() || row.requestor?.userName || '—';
  }

  getRequestorEmail(row: ChangeRequest): string {
    return row.requestor?.email || row.snapshot.before.email || '—';
  }

  onApprove(row: ChangeRequest): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Approve email change',
        message: `Approve changing ${row.snapshot.before.email} to ${row.snapshot.after.email}? A verification email will be sent to the new address.`,
        confirmText: 'Approve',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.changeRequestService.approveRequest(row._id).subscribe({
        next: () => {
          this.snackBar.open(
            `Email change approved. Verification email sent to ${row.snapshot.after.email}.`,
            'Close',
            { duration: 5000, panelClass: ['success-snackbar'] },
          );
          this.loadRequests();
        },
        error: (err) => this.showError(err),
      });
    });
  }

  onDecline(row: ChangeRequest): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Decline request',
        message: `Decline the email change request from ${this.getRequestorName(row)}?`,
        confirmText: 'Decline',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.changeRequestService.declineRequest(row._id).subscribe({
        next: () => {
          this.snackBar.open('Request declined.', 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar'],
          });
          this.loadRequests();
        },
        error: (err) => this.showError(err),
      });
    });
  }

  isVerificationPending(row: ChangeRequest): boolean {
    return (
      row.status === ChangeRequestStatus.APPROVED &&
      row.requestor?.emailVerified === false
    );
  }

  private loadRequests(): void {
    this.isLoading = true;
    this.changeRequestService
      .getRequests({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        status: this.selectedStatus,
        type: ChangeRequestType.CHANGE_EMAIL,
        search: this.searchTerm.trim() || undefined,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.data ?? [];
          this.totalItems = response.meta?.totalItems ?? 0;
        },
        error: (err) => {
          this.dataSource.data = [];
          this.totalItems = 0;
          this.showError(err);
        },
      });
  }

  private showError(err: unknown): void {
    const body = (err as { error?: { message?: string | string[] } })?.error;
    const msg = body?.message;
    const text = Array.isArray(msg)
      ? msg.join(' ')
      : typeof msg === 'string'
        ? msg
        : 'Something went wrong.';
    this.snackBar.open(text, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }
}
