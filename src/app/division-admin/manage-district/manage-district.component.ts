import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule, MatListItem } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { ConfirmDeleteDialogComponent } from '../../table-button-dialog/confirm-delete-dialog/confirm-delete-dialog.component';
import { DistrictFormDialogComponent, DistrictFormDialogData } from './district-form-dialog.component';

@Component({
  selector: 'app-manage-district',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatListItem,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
  ],
  templateUrl: './manage-district.component.html',
  styleUrl: './manage-district.component.css',
})
export class ManageDistrictComponent implements OnInit {
  districts: string[] = [];
  /** Order as loaded from the backend; used for "reset to original". */
  districtsOriginalOrder: string[] = [];
  isLoading = true;
  isSaving = false;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];

  /** Districts for the current page (slice of districts). */
  get paginatedDistricts(): string[] {
    const start = this.pageIndex * this.pageSize;
    return this.districts.slice(start, start + this.pageSize);
  }

  get totalItems(): number {
    return this.districts.length;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  constructor(
    @Inject(InternalReferenceDataService) private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDistricts();
  }

  private async loadDistricts(): Promise<void> {
    this.isLoading = true;
    try {
      await this.internalReferenceDataService.initialize();
      this.districts = [...this.internalReferenceDataService.getClusters()];
      this.districtsOriginalOrder = [...this.districts];
    } catch (e: any) {
      console.error('Failed to load districts', e);
      this.showErrorNotification(this.getErrorMessage(e, 'Failed to load districts. Please try again.'));
      this.districts = [];
    } finally {
      this.isLoading = false;
    }
  }

  openAdd(): void {
    const data: DistrictFormDialogData = {
      mode: 'add',
      existingNames: this.districts,
    };
    const ref = this.dialog.open(DistrictFormDialogComponent, {
      width: '400px',
      data,
    });
    ref.afterClosed().subscribe((name: string | undefined) => {
      if (name != null) this.addDistrict(name);
    });
  }

  openEdit(globalIndex: number): void {
    const current = this.districts[globalIndex];
    const data: DistrictFormDialogData = {
      mode: 'edit',
      name: current,
      existingNames: this.districts,
    };
    const ref = this.dialog.open(DistrictFormDialogComponent, {
      width: '400px',
      data,
    });
    ref.afterClosed().subscribe((name: string | undefined) => {
      if (name != null) this.updateDistrict(globalIndex, name);
    });
  }

  sortAsc(): void {
    const next = [...this.districts].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    this.saveDistricts(next, 'List sorted A–Z.');
  }

  sortDesc(): void {
    const next = [...this.districts].sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' }));
    this.saveDistricts(next, 'List sorted Z–A.');
  }

  /** True when current order matches the original (from load). */
  get isOriginalOrder(): boolean {
    if (this.districts.length !== this.districtsOriginalOrder.length) return false;
    return this.districts.every((d, i) => d === this.districtsOriginalOrder[i]);
  }

  resetToOriginalOrder(): void {
    const originalSet = new Set(this.districtsOriginalOrder);
    const reordered = this.districtsOriginalOrder.filter((d) => this.districts.includes(d));
    const added = this.districts.filter((d) => !originalSet.has(d));
    const next = [...reordered, ...added];
    this.saveDistricts(next, 'List reset to original order.');
  }

  openDelete(globalIndex: number): void {
    const name = this.districts[globalIndex];
    const ref = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete District / Cluster',
        message: `Remove "${name}" from the list? This may affect schools linked to this district.`,
      },
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.deleteDistrict(globalIndex);
    });
  }

  /** Compare names: trim and case-insensitive. Returns true if name already exists (optionally excluding one index). */
  private isDuplicateDistrictName(name: string, excludeIndex?: number): boolean {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return false;
    return this.districts.some(
      (d, i) => i !== excludeIndex && d.trim().toLowerCase() === normalized
    );
  }

  private async addDistrict(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (this.isDuplicateDistrictName(trimmed)) {
      this.showErrorNotification('A district with this name already exists.');
      return;
    }
    const next = [...this.districts, trimmed];
    await this.saveDistricts(next, 'District added.');
  }

  private async updateDistrict(index: number, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (this.isDuplicateDistrictName(trimmed, index)) {
      this.showErrorNotification('A district with this name already exists.');
      return;
    }
    const next = [...this.districts];
    next[index] = trimmed;
    await this.saveDistricts(next, 'District updated.');
  }

  private async deleteDistrict(index: number): Promise<void> {
    const next = this.districts.filter((_, i) => i !== index);
    await this.saveDistricts(next, 'District removed.');
  }

  private async saveDistricts(next: string[], successMessage?: string): Promise<void> {
    this.isSaving = true;
    try {
      await this.internalReferenceDataService.updateClusters(next);
      this.districts = [...next];
      this.pageIndex = 0;
      if (successMessage) {
        this.showSuccessNotification(successMessage);
      }
    } catch (e: any) {
      console.error('Failed to save districts', e);
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

  private getErrorMessage(err: any, fallback: string): string {
    if (err?.error?.message) {
      if (Array.isArray(err.error.message)) {
        return err.error.message.join('\n• ') || fallback;
      }
      if (typeof err.error.message === 'string') {
        return err.error.message;
      }
    }
    if (err?.error && typeof err.error === 'string') {
      return err.error;
    }
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    if (typeof err === 'string') {
      return err;
    }
    return fallback;
  }
}
