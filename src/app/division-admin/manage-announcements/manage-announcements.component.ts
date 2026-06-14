import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { AnnouncementService } from '../../common/services/announcement.service';
import {
  Announcement,
  getAnnouncementRoleLabel,
} from '../../common/model/announcement.model';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import {
  AnnouncementFormDialogComponent,
  AnnouncementFormDialogData,
} from './announcement-form-dialog.component';
import { formatDateString } from '../../common/date-utils';

@Component({
  selector: 'app-manage-announcements',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './manage-announcements.component.html',
  styleUrl: './manage-announcements.component.css',
})
export class ManageAnnouncementsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  displayedColumns = [
    'title',
    'audience',
    'effectiveFrom',
    'effectiveUntil',
    'active',
    'forceShowEveryVisit',
    'actions',
  ];
  dataSource = new MatTableDataSource<Announcement>([]);
  isLoading = true;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalItems = 0;
  searchTerm = '';

  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadAnnouncements();
      });
    this.loadAnnouncements();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '';
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    return formatDateString(value) || value;
  }

  formatAudience(row: Announcement): string {
    if (row.targetAudience === 'all') return 'All';
    return (row.targetRoles ?? [])
      .map((r) => getAnnouncementRoleLabel(r))
      .join(', ') || '—';
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.pageIndex = 0;
    this.loadAnnouncements();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAnnouncements();
  }

  loadAnnouncements(): void {
    this.isLoading = true;
    this.announcementService
      .getAnnouncements({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data;
          this.totalItems = res.totalItems;
        },
        error: () => {
          this.snackBar.open('Failed to load announcements.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar'],
          });
          this.dataSource.data = [];
          this.totalItems = 0;
        },
      });
  }

  onCreate(): void {
    const ref = this.dialog.open(AnnouncementFormDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'announcement-form-dialog-panel',
      data: { mode: 'create' } as AnnouncementFormDialogData,
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Announcement created.', 'Close', { duration: 3000 });
        this.loadAnnouncements();
      }
    });
  }

  onEdit(row: Announcement): void {
    const ref = this.dialog.open(AnnouncementFormDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'announcement-form-dialog-panel',
      data: { mode: 'edit', announcement: row } as AnnouncementFormDialogData,
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Announcement updated.', 'Close', { duration: 3000 });
        this.loadAnnouncements();
      }
    });
  }

  onDelete(row: Announcement): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete announcement',
        message: `Delete "${row.title}"? This cannot be undone.`,
        confirmText: 'Delete',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.announcementService.delete(row._id).subscribe({
        next: () => {
          this.snackBar.open('Announcement deleted.', 'Close', { duration: 3000 });
          this.loadAnnouncements();
        },
        error: () => {
          this.snackBar.open('Failed to delete announcement.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar'],
          });
        },
      });
    });
  }
}
