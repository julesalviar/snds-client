import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { SchoolService } from '../../common/services/school.service';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import {MongoDate, School} from '../../common/model/school.model';
import {formatDateString} from "../../common/date-utils";

@Component({
  selector: 'app-manage-schools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './manage-schools.component.html',
  styleUrl: './manage-schools.component.css',
})
export class ManageSchoolsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  displayedColumns: string[] = [
    'logo',
    'schoolName',
    'schoolId',
    'officialEmailAddress',
    'accountablePerson',
    'districtOrCluster',
    'createdAt',
  ];

  dataSource = new MatTableDataSource<School>([]);
  isLoading = true;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalItems = 0;

  searchTerm = '';
  selectedDistricts: string[] = [];
  districtOptions: string[] = [];
  /** Set of school ids for which logo failed to load. */
  logoErrorIds = new Set<string>();

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || this.selectedDistricts.length > 0;
  }

  constructor(
    private readonly schoolService: SchoolService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.internalReferenceDataService.initialize().then(() => {
      this.districtOptions = [...this.internalReferenceDataService.getClusters()];
    });
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadSchools();
      });
    this.loadSchools();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadSchools();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onDistrictChange(value: string[]): void {
    this.selectedDistricts = value ?? [];
    this.pageIndex = 0;
    this.loadSchools();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDistricts = [];
    this.pageIndex = 0;
    this.loadSchools();
  }

  loadSchools(): void {
    this.isLoading = true;
    this.schoolService
      .listSchools({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
        districtOrCluster: this.selectedDistricts.length ? this.selectedDistricts : undefined,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data ?? [];
          this.totalItems = res.totalItems ?? 0;
        },
        error: (err) => {
          console.error('Failed to load schools', err);
          this.dataSource.data = [];
          this.totalItems = 0;
          this.showError(this.getErrorMessage(err, 'Failed to load schools.'));
        },
      });
  }

  schoolId(row: School): string {
    const id = row._id;
    if (typeof id === 'string') return id;
    return (id as { $oid?: string })?.$oid ?? '';
  }

  hasLogoError(row: School): boolean {
    return this.logoErrorIds.has(this.schoolId(row));
  }

  onLogoError(row: School): void {
    this.logoErrorIds.add(this.schoolId(row));
  }

  formatDate(value: School['createdAt']): string {
    return formatDateString(value);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (err?.error?.message) {
      if (Array.isArray(err.error.message)) return err.error.message.join('\n• ') || fallback;
      if (typeof err.error.message === 'string') return err.error.message;
    }
    if (err?.error && typeof err.error === 'string') return err.error;
    if (err?.message && typeof err.message === 'string') return err.message;
    if (typeof err === 'string') return err;
    return fallback;
  }
}
