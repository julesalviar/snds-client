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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../common/services/user.service';
import { UserListItem } from '../../registration/user.model';
import { UserType, getRoleLabel } from '../../registration/user-type.enum';

/** Material icon name per UserType for the roles column. */
const ROLE_ICONS: Partial<Record<UserType, string>> = {
  [UserType.StakeHolder]: 'people',
  [UserType.SchoolAdmin]: 'school',
  [UserType.DivisionAdmin]: 'domain',
  [UserType.SystemAdmin]: 'admin_panel_settings',
  [UserType.System]: 'dns',
};

@Component({
  selector: 'app-manage-users',
  standalone: true,
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
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css',
})
export class ManageUsersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  displayedColumns: string[] = [
    'createdBy',
    'userName',
    'name',
    'email',
    'contactNumber',
    'roles',
    'createdAt',
  ];
  dataSource = new MatTableDataSource<UserListItem>([]);
  isLoading = true;
  readonly UserType = UserType;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  /** Total count from backend (for paginator). */
  totalItems = 0;

  /** Filter: search (sent to backend). */
  searchTerm = '';
  /** Filter: roles (sent to backend as roles=...). */
  selectedRoles: string[] = [];

  /** Stable array so mat-select does not re-emit on every CD. */
  readonly roleOptions: { value: string; label: string }[] = [
    { value: UserType.StakeHolder, label: getRoleLabel(UserType.StakeHolder) },
    { value: UserType.SchoolAdmin, label: getRoleLabel(UserType.SchoolAdmin) },
    { value: UserType.DivisionAdmin, label: getRoleLabel(UserType.DivisionAdmin) },
    { value: UserType.SystemAdmin, label: getRoleLabel(UserType.SystemAdmin) },
    { value: UserType.System, label: getRoleLabel(UserType.System) },
  ];

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || this.selectedRoles.length > 0;
  }

  constructor(
    private readonly userService: UserService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadUsers();
      });
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onRoleChange(value: string[]): void {
    this.selectedRoles = value ?? [];
    this.pageIndex = 0;
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRoles = [];
    this.pageIndex = 0;
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService
      .getUsers({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
        roles: this.selectedRoles.length ? this.selectedRoles : undefined,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data ?? [];
          this.totalItems = res.totalItems ?? 0;
        },
        error: (err) => {
          console.error('Failed to load users', err);
          this.dataSource.data = [];
          this.totalItems = 0;
          this.showError(this.getErrorMessage(err, 'Failed to load users.'));
        },
      });
  }

  /** Icon for a role string (e.g. from UserType). Falls back to 'person' if unknown. */
  getRoleIcon(role: string): string {
    return ROLE_ICONS[role as UserType] ?? 'person';
  }

  /** Display label for a role (e.g. "System Admin"); used as tooltip on role icons. */
  getRoleLabel = getRoleLabel;

  /** Human-readable created date. */
  formatDate(value: UserListItem['createdAt']): string {
    if (value == null) return '—';
    const str = typeof value === 'string' ? value : (value as { $date?: string })?.$date;
    if (!str) return '—';
    try {
      const d = new Date(str);
      return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return str;
    }
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
