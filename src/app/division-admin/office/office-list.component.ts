import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { finalize } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { OfficeService } from '../../common/services/office.service';
import { Office } from '../../common/model/office.model';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { OfficeFormComponent } from './office-form.component';

@Component({
  selector: 'app-office-list',
  standalone: true,
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
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './office-list.component.html',
  styleUrl: './office-list.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class OfficeListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  displayedColumns: string[] = ['code', 'name', 'division', 'actions'];
  dataSource = new MatTableDataSource<Office>([]);
  isLoading = true;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalItems = 0;

  searchTerm = '';
  filterDivision = '';

  /** Unique divisions for filter (from internal reference data, fallback to offices). */
  get divisionOptions(): string[] {
    const fromRef = this.internalReferenceDataService.getOfficeDivisions();
    if (fromRef.length > 0) return fromRef;
    return [...new Set(this.dataSource.data.map((o) => o.division).filter(Boolean))].sort();
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || this.filterDivision !== '';
  }

  constructor(
    private readonly officeService: OfficeService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly breakpointObserver: BreakpointObserver
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.internalReferenceDataService.initialize();
    } catch {
      // ignore; divisionOptions will fallback to offices
    }
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadOffices();
      });
    this.loadOffices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadOffices();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onDivisionChange(): void {
    this.pageIndex = 0;
    this.loadOffices();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterDivision = '';
    this.pageIndex = 0;
    this.loadOffices();
  }

  loadOffices(): void {
    this.isLoading = true;
    this.officeService
      .getOffices({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
        division: this.filterDivision || undefined,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data ?? [];
          this.totalItems = res.totalItems ?? 0;
        },
        error: (err) => {
          console.error('Failed to load offices', err);
          this.dataSource.data = [];
          this.totalItems = 0;
          this.showError(this.getErrorMessage(err, 'Failed to load offices.'));
        },
      });
  }

  onCreate(): void {
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(OfficeFormComponent, {
      width: isMobile ? '100vw' : 'min(500px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { officeId: undefined },
      disableClose: false,
      panelClass: isMobile ? 'office-dialog-mobile' : 'office-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadOffices();
      }
    });
  }

  onEdit(row: Office): void {
    if (!row._id) return;
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(OfficeFormComponent, {
      width: isMobile ? '100vw' : 'min(500px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { officeId: row._id },
      disableClose: false,
      panelClass: isMobile ? 'office-dialog-mobile' : 'office-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadOffices();
      }
    });
  }

  onDelete(row: Office): void {
    const title = row.name || 'this office';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Office',
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && row._id) {
        this.performDelete(row._id);
      }
    });
  }

  private performDelete(id: string): void {
    this.officeService.delete(id).subscribe({
      next: () => {
        this.showSuccess('Office deleted successfully.');
        this.loadOffices();
      },
      error: (err) => {
        console.error('Failed to delete office', err);
        this.showError(this.getErrorMessage(err, 'Failed to delete office.'));
      },
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string): void {
    const duration = message.includes('\n') ? 8000 : 5000;
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string | string[] } }).error;
      if (e?.message) {
        if (Array.isArray(e.message)) return e.message.join('\n• ') || fallback;
        if (typeof e.message === 'string') return e.message;
      }
      if (e && typeof e === 'string') return e;
    }
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string') {
      return (err as { message: string }).message;
    }
    if (typeof err === 'string') return err;
    return fallback;
  }
}
