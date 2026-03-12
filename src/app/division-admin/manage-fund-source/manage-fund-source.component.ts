import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { ConfirmDeleteDialogComponent } from '../../table-button-dialog/confirm-delete-dialog/confirm-delete-dialog.component';
import { FundSourceFormDialogComponent, FundSourceFormDialogData } from './fund-source-form-dialog.component';

export interface FundSourceRow {
  name: string;
  index: number;
}

@Component({
  selector: 'app-manage-fund-source',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './manage-fund-source.component.html',
  styleUrl: './manage-fund-source.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class ManageFundSourceComponent implements OnInit {
  fundSources: string[] = [];
  isLoading = true;
  isSaving = false;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  searchTerm = '';

  displayedColumns: string[] = ['name', 'actions'];
  dataSource = new MatTableDataSource<FundSourceRow>([]);

  get totalItems(): number {
    return this.getFilteredRows().length;
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '';
  }

  constructor(
    @Inject(InternalReferenceDataService) private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadFundSources();
  }

  private async loadFundSources(): Promise<void> {
    this.isLoading = true;
    try {
      await this.internalReferenceDataService.initialize();
      this.fundSources = [...this.internalReferenceDataService.getFundSources()];
      this.refreshTable();
    } catch (e: unknown) {
      console.error('Failed to load fund sources', e);
      this.showErrorNotification(this.getErrorMessage(e, 'Failed to load fund sources. Please try again.'));
      this.fundSources = [];
      this.dataSource.data = [];
    } finally {
      this.isLoading = false;
    }
  }

  private getFilteredRows(): FundSourceRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.fundSources
      .map((name, index) => ({ name, index }))
      .filter((row) => !term || row.name.toLowerCase().includes(term));
  }

  private refreshTable(): void {
    const filtered = this.getFilteredRows();
    const start = this.pageIndex * this.pageSize;
    const page = filtered.slice(start, start + this.pageSize);
    this.dataSource.data = page;
  }

  onSearchInput(): void {
    this.pageIndex = 0;
    this.refreshTable();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.pageIndex = 0;
    this.refreshTable();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refreshTable();
  }

  openAdd(): void {
    const data: FundSourceFormDialogData = {
      mode: 'add',
      existingNames: this.fundSources,
    };
    const ref = this.dialog.open(FundSourceFormDialogComponent, {
      width: '400px',
      data,
    });
    ref.afterClosed().subscribe((name: string | undefined) => {
      if (name != null) this.addFundSource(name);
    });
  }

  onEdit(row: FundSourceRow): void {
    const data: FundSourceFormDialogData = {
      mode: 'edit',
      name: row.name,
      existingNames: this.fundSources,
    };
    const ref = this.dialog.open(FundSourceFormDialogComponent, {
      width: '400px',
      data,
    });
    ref.afterClosed().subscribe((name: string | undefined) => {
      if (name != null) this.updateFundSource(row.index, name);
    });
  }

  onDelete(row: FundSourceRow): void {
    const ref = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Fund Source',
        message: `Remove "${row.name}" from the list? This may affect records linked to this fund source.`,
      },
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.deleteFundSource(row.index);
    });
  }

  private isDuplicateFundSourceName(name: string, excludeIndex?: number): boolean {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return false;
    return this.fundSources.some(
      (f, i) => i !== excludeIndex && f.trim().toLowerCase() === normalized
    );
  }

  private async addFundSource(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (this.isDuplicateFundSourceName(trimmed)) {
      this.showErrorNotification('A fund source with this name already exists.');
      return;
    }
    const next = [...this.fundSources, trimmed];
    await this.saveFundSources(next, 'Fund source added.');
  }

  private async updateFundSource(index: number, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (this.isDuplicateFundSourceName(trimmed, index)) {
      this.showErrorNotification('A fund source with this name already exists.');
      return;
    }
    const next = [...this.fundSources];
    next[index] = trimmed;
    await this.saveFundSources(next, 'Fund source updated.');
  }

  private async deleteFundSource(index: number): Promise<void> {
    const next = this.fundSources.filter((_, i) => i !== index);
    await this.saveFundSources(next, 'Fund source removed.');
  }

  private async saveFundSources(next: string[], successMessage?: string): Promise<void> {
    this.isSaving = true;
    try {
      await this.internalReferenceDataService.updateFundSources(next);
      this.fundSources = [...next];
      this.pageIndex = 0;
      this.refreshTable();
      if (successMessage) {
        this.showSuccessNotification(successMessage);
      }
    } catch (e: unknown) {
      console.error('Failed to save fund sources', e);
      this.showErrorNotification(this.getErrorMessage(e, 'Failed to save. Please try again.'));
    } finally {
      this.isSaving = false;
    }
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private showErrorNotification(message: string): void {
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
