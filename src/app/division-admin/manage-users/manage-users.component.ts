import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../common/services/user.service';
import { UserInviteService } from '../../common/services/user-invite.service';
import { UserInvite } from '../../common/model/user-invite.model';
import { UserListItem } from '../../registration/user.model';
import { UserType, getRoleLabel } from '../../registration/user-type.enum';
import { formatDateString, formatDateTimeString } from '../../common/date-utils';
import { InviteUserDialogComponent } from './invite-user-dialog/invite-user-dialog.component';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';

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
    MatCheckboxModule,
    MatButtonModule,
    MatTabsModule,
    MatSlideToggleModule,
  ],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css',
})
export class ManageUsersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  private readonly invitesEmailSubject = new Subject<string>();

  displayedColumns: string[] = [
    'createdBy',
    'userName',
    'name',
    'email',
    'contactNumber',
    'roles',
    'createdAt',
    'actions',
  ];

  /** True when current user is system or systemAdmin – then system/systemAdmin role icons are shown in Roles column. */
  get canSeeSystemRoleIcons(): boolean {
    const role = this.authService.getActiveRole();
    return role === UserType.System || role === UserType.SystemAdmin;
  }

  getVisibleRoles(roles: string[] | undefined): string[] {
    if (!roles?.length) return [];
    if (this.canSeeSystemRoleIcons) return roles;
    const visible = [UserType.StakeHolder, UserType.SchoolAdmin, UserType.DivisionAdmin];
    return roles.filter((r) => visible.includes(r as UserType));
  }

  dataSource = new MatTableDataSource<UserListItem>([]);
  isLoading = true;
  readonly UserType = UserType;
  pageIndex = 0;
  pageSize = 25;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalItems = 0;

  searchTerm = '';
  selectedRoles: string[] = [];
  includeReferenceAccounts = false;

  invitesDataSource = new MatTableDataSource<UserInvite>([]);
  invitesLoading = false;
  invitesDisplayedColumns: string[] = ['email', 'sentAt', 'expiration', 'status', 'registrationLink'];
  invitesEmailFilter = '';
  invitesPageIndex = 0;
  invitesPageSize = 25;
  invitesTotalItems = 0;

  openRegistration = false;
  openRegistrationUpdating = false;

  private readonly roleOptionsBase: { value: string; label: string }[] = [
    { value: UserType.StakeHolder, label: getRoleLabel(UserType.StakeHolder) },
    { value: UserType.SchoolAdmin, label: getRoleLabel(UserType.SchoolAdmin) },
    { value: UserType.DivisionAdmin, label: getRoleLabel(UserType.DivisionAdmin) },
  ];

  /** Role filter options including system/systemAdmin (stable reference). */
  private readonly roleOptionsWithSystem: { value: string; label: string }[] = [
    { value: UserType.StakeHolder, label: getRoleLabel(UserType.StakeHolder) },
    { value: UserType.SchoolAdmin, label: getRoleLabel(UserType.SchoolAdmin) },
    { value: UserType.DivisionAdmin, label: getRoleLabel(UserType.DivisionAdmin) },
    { value: UserType.SystemAdmin, label: getRoleLabel(UserType.SystemAdmin) },
    { value: UserType.System, label: getRoleLabel(UserType.System) },
  ];

  get roleOptions(): { value: string; label: string }[] {
    return this.canSeeSystemRoleIcons ? this.roleOptionsWithSystem : this.roleOptionsBase;
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.selectedRoles.length > 0 ||
      this.includeReferenceAccounts
    );
  }

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly userInviteService: UserInviteService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog
  ) {}

  /** Full URL for the public open registration page. */
  get openRegistrationUrl(): string {
    const origin = this.document?.defaultView?.location?.origin;
    return origin ? `${origin}/open-registration` : '';
  }

  /** Registration link for an invite (close-registration with token). */
  getInviteRegistrationLink(invite: UserInvite): string {
    if (!invite?.token) return '';
    const origin = this.document?.defaultView?.location?.origin;
    return origin ? `${origin}/close-registration?token=${encodeURIComponent(invite.token)}` : '';
  }

  copyInviteRegistrationLink(invite: UserInvite): void {
    const url = this.getInviteRegistrationLink(invite);
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => this.snackBar.open('Registration link copied', 'Close', { duration: 3000 }),
      () => this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 })
    );
  }

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadUsers();
      });
    this.invitesEmailSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.invitesPageIndex = 0;
        this.loadInvites();
      });
    this.loadUsers();
    this.loadInvites();
    this.internalReferenceDataService.initialize().then(() => {
      this.openRegistration = this.parseOpenRegistration(
        this.internalReferenceDataService.get<unknown>('openRegistration')
      );
    });
  }

  private parseOpenRegistration(raw: unknown): boolean {
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    if (raw && typeof raw === 'object' && 'value' in raw) {
      const val = (raw as { value: unknown }).value;
      return val === true || val === 'true';
    }
    return false;
  }

  onOpenRegistrationChange(checked: boolean): void {
    this.openRegistrationUpdating = true;
    this.internalReferenceDataService
      .updateOpenRegistration(checked)
      .then(() => {
        this.openRegistration = checked;
        this.showSuccess(
          checked ? 'Open registration enabled.' : 'Open registration disabled.'
        );
      })
      .catch((err) => {
        console.error('Failed to update open registration', err);
        this.showError(
          this.getErrorMessage(err, 'Failed to update open registration.')
        );
      })
      .finally(() => {
        this.openRegistrationUpdating = false;
      });
  }

  copyOpenRegistrationLink(): void {
    const url = this.openRegistrationUrl;
    if (!url) {
      this.showError('Registration link is not available.');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => this.showSuccess('Registration link copied to clipboard.'),
        () => this.fallbackCopyToClipboard(url)
      );
    } else {
      this.fallbackCopyToClipboard(url);
    }
  }

  /** Fallback for non-secure contexts (e.g. HTTP) where navigator.clipboard is not available. */
  private fallbackCopyToClipboard(text: string): void {
    const doc = this.document;
    const textarea = doc.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    doc.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const ok = doc.execCommand('copy');
      if (ok) {
        this.showSuccess('Registration link copied to clipboard.');
      } else {
        this.showError('Failed to copy link.');
      }
    } catch {
      this.showError('Failed to copy link.');
    } finally {
      doc.body.removeChild(textarea);
    }
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

  onReferenceAccountsChange(): void {
    this.pageIndex = 0;
    this.loadUsers();
  }

  onInvitesEmailInput(): void {
    this.invitesEmailSubject.next(this.invitesEmailFilter);
  }

  onInvitesPageChange(event: PageEvent): void {
    this.invitesPageIndex = event.pageIndex;
    this.invitesPageSize = event.pageSize;
    this.loadInvites();
  }

  onInviteUser(): void {
    const dialogRef = this.dialog.open(InviteUserDialogComponent, {
      width: '400px',
      disableClose: false,
    });
    dialogRef.afterClosed().subscribe((success) => {
      if (success) {
        this.loadInvites();
        this.showSuccess('Invitation sent successfully.');
      }
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRoles = [];
    this.includeReferenceAccounts = false;
    this.pageIndex = 0;
    this.loadUsers();
  }

  onEdit(row: UserListItem): void {
    // TODO: implement edit
  }

  onDelete(row: UserListItem): void {
    const displayName = row.name || row.userName || row.email || 'this user';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete User',
        message: `Are you sure you want to delete ${displayName}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performDelete(row);
      }
    });
  }

  private performDelete(row: UserListItem): void {
    const id = row._id;
    if (!id) {
      this.showError('Cannot delete user: missing user ID.');
      return;
    }

    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.showSuccess('User deleted successfully.');
        this.loadUsers();
      },
      error: (err) => {
        console.error('Failed to delete user', err);
        this.showError(this.getErrorMessage(err, 'Failed to delete user.'));
      },
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService
      .getUsers({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
        roles: this.selectedRoles.length ? this.selectedRoles : undefined,
        includeReferenceAccounts: this.includeReferenceAccounts || undefined,
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

  getRoleIcon(role: string): string {
    return ROLE_ICONS[role as UserType] ?? 'person';
  }

  getRoleLabel = getRoleLabel;

  loadInvites(): void {
    this.invitesLoading = true;
    this.userInviteService
      .getInvites({
        page: this.invitesPageIndex + 1,
        limit: this.invitesPageSize,
        email: this.invitesEmailFilter.trim() || undefined,
      })
      .pipe(finalize(() => (this.invitesLoading = false)))
      .subscribe({
        next: (res) => {
          this.invitesDataSource.data = res.data ?? [];
          this.invitesTotalItems = res.meta?.totalItems ?? res.data?.length ?? 0;
        },
        error: (err) => {
          console.error('Failed to load invites', err);
          this.invitesDataSource.data = [];
          this.invitesTotalItems = 0;
          this.showError(this.getErrorMessage(err, 'Failed to load invites.'));
        },
      });
  }

  formatInviteStatus(value: string | undefined): string {
    return value ? value.toUpperCase() : '—';
  }

  formatInviteSentAt(value: string | undefined): string {
    return formatDateTimeString(value);
  }

  formatInviteExpiresAt(value: string | undefined): string {
    return formatDateTimeString(value) || '—';
  }

  formatDate(value: UserListItem['createdAt']): string {
    return formatDateString(value);
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
