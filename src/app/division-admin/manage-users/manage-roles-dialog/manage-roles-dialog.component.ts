import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { UserListItem } from '../../../registration/user.model';
import { UserType, getRoleLabel } from '../../../registration/user-type.enum';
import { getRoleIcon, getRoleColor } from '../../../registration/user-type-icons';
import { AuthService } from '../../../auth/auth.service';
import { UserService } from '../../../common/services/user.service';
import { SchoolService } from '../../../common/services/school.service';
import { School } from '../../../common/model/school.model';
import { Office } from '../../../common/model/office.model';
import { OfficeService } from '../../../common/services/office.service';
import { InternalReferenceDataService } from '../../../common/services/internal-reference-data.service';

export interface ManageRolesDialogData {
  user: UserListItem;
}

@Component({
  selector: 'app-manage-roles-dialog',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './manage-roles-dialog.component.html',
  styleUrl: './manage-roles-dialog.component.css',
})
export class ManageRolesDialogComponent implements OnInit, OnDestroy {
  selectedRoles: Set<string> = new Set();
  selectedSchoolId = '';
  selectedOfficeIds: string[] = [];
  selectedOfficeDivision = '';
  isSubmitting = false;

  clusterOptions: Array<{ value: string; label: string }> = [];
  selectedCluster = '';
  /** Cached schools (search results + selected). */
  schools: School[] = [];
  filteredSchools: School[] = [];
  schoolSearchControl = new FormControl('');

  offices: Office[] = [];
  filteredOfficesForSelect: Office[] = [];
  officeSearchControl = new FormControl('');

  readonly schoolSearchLimit = 50;
  readonly officeSearchLimit = 50;

  private readonly schoolSearchSubject = new Subject<string>();
  private readonly officeSearchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  readonly UserType = UserType;
  getRoleIcon = getRoleIcon;
  getRoleColor = getRoleColor;
  getRoleLabel = getRoleLabel;

  /** Roles the current user can assign/modify. */
  get assignableRoles(): string[] {
    const role = this.authService.getActiveRole();

    if (role === UserType.SystemAdmin || role === UserType.System) {
      return Object.values(UserType).filter((r) => (
        r !== UserType.System &&
        r !== UserType.SystemAdmin &&
        r !== UserType.StakeHolder
      )) as string[];
    }

    if (role === UserType.OfficeAdmin) return [
      UserType.ProgramHolder
    ];

    if (role === UserType.DivisionAdmin) {
      return [
        UserType.SchoolAdmin,
        UserType.DivisionAdmin,
        UserType.ProgramHolder,
      ];
    }
    return [];
  }

  /** All roles to display: union of target user's current roles and assignable roles. */
  get displayRoles(): string[] {
    const current = new Set(this.data.user?.roles ?? []);
    const assignable = new Set(this.assignableRoles);
    const combined = new Set([...current, ...assignable]);
    return Object.values(UserType).filter((r) => combined.has(r));
  }

  /** Whether the current user can modify this role (enable checkbox). */
  isRoleAssignable(role: string): boolean {
    return this.assignableRoles.includes(role);
  }

  /** Unique divisions for office filter (from internal reference data, fallback to offices). */
  get officeDivisions(): string[] {
    const fromRef = this.internalReferenceDataService.getOfficeDivisions();
    if (fromRef.length > 0) return fromRef;
    return [...new Set(this.offices.map((o) => o.division).filter(Boolean))].sort();
  }

  getOfficeName(officeId: string): string {
    const office = this.offices.find((o) => o._id === officeId);
    return office?.name ?? officeId;
  }

  getOfficeDisplayName(officeId: string): string {
    const office = this.offices.find((o) => o._id === officeId);
    return office ? `${office.division} — ${office.name}` : officeId;
  }

  addOffice(officeId: string): void {
    if (!officeId || this.selectedOfficeIds.includes(officeId)) return;
    const office = this.filteredOfficesForSelect.find((o) => o._id === officeId);
    if (office) this.cacheOffice(office);
    this.selectedOfficeIds = [...this.selectedOfficeIds, officeId];
    this.officeSearchControl.setValue('', { emitEvent: false });
  }

  removeOffice(officeId: string): void {
    this.selectedOfficeIds = this.selectedOfficeIds.filter((id) => id !== officeId);
  }

  constructor(
    private readonly dialogRef: MatDialogRef<ManageRolesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManageRolesDialogData,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly schoolService: SchoolService,
    private readonly officeService: OfficeService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly snackBar: MatSnackBar
  ) {
    const roles = data.user?.roles ?? [];
    this.selectedRoles = new Set(roles);
    this.selectedSchoolId = data.user?.schoolId ?? '';
    this.selectedOfficeIds = data.user?.officeIds ?? [];
  }

  async ngOnInit(): Promise<void> {
    this.setupSchoolSearch();
    this.setupOfficeSearch();
    await this.loadClusterOptions();
    this.performSchoolSearch('');
    if (this.selectedSchoolId) {
      this.loadSelectedSchool();
    }
    if (this.selectedRoles.has(UserType.ProgramHolder)) {
      this.loadSelectedOffices();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSchoolSearch(): void {
    this.schoolSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.performSchoolSearch(term));
  }

  private setupOfficeSearch(): void {
    this.officeSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.performOfficeSearch(term));
  }

  private async loadClusterOptions(): Promise<void> {
    try {
      await this.internalReferenceDataService.initialize();
      const clusters: string[] = this.internalReferenceDataService.getClusters();
      this.clusterOptions = [
        { value: '', label: 'All Districts/Clusters' },
        ...clusters.map((c) => ({ value: c, label: c })),
      ];
    } catch {
      this.clusterOptions = [{ value: '', label: 'All Districts/Clusters' }];
    }
  }

  private loadSelectedOffices(): void {
    const ids = this.selectedOfficeIds.filter(Boolean);
    if (ids.length > 0) {
      this.officeService.getOffices({ page: 1, limit: ids.length, ids }).subscribe({
        next: (res) => {
          (res?.data ?? []).forEach((office) => this.cacheOffice(office));
          this.performOfficeSearch('');
        },
        error: () => this.performOfficeSearch(''),
      });
      return;
    }

    if (this.data.user?.sector && this.data.user?.subsector) {
      this.officeService
        .getOffices({
          page: 1,
          limit: this.officeSearchLimit,
          search: this.data.user.subsector,
          division: this.data.user.sector,
        })
        .subscribe({
          next: (res) => {
            const match = (res?.data ?? []).find(
              (o) => o.division === this.data.user?.sector && o.name === this.data.user?.subsector
            );
            if (match) {
              this.cacheOffice(match);
              this.selectedOfficeIds = [match._id];
            }
            this.performOfficeSearch('');
          },
          error: () => this.performOfficeSearch(''),
        });
      return;
    }

    this.performOfficeSearch('');
  }

  private performOfficeSearch(searchTerm: string): void {
    this.officeService
      .getOffices({
        page: 1,
        limit: this.officeSearchLimit,
        search: searchTerm.trim() || undefined,
        division: this.selectedOfficeDivision.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.filteredOfficesForSelect = res?.data ?? [];
        },
        error: () => {
          this.filteredOfficesForSelect = [];
        },
      });
  }

  private performSchoolSearch(searchTerm: string): void {
    const district = this.selectedCluster.trim();
    this.schoolService
      .listSchools({
        page: 1,
        limit: this.schoolSearchLimit,
        search: searchTerm.trim() || undefined,
        districtOrCluster: district ? [district] : undefined,
      })
      .subscribe({
        next: (res) => {
          this.filteredSchools = res?.data ?? [];
          if (this.selectedSchoolId) {
            this.ensureSelectedSchoolDisplayed();
          }
        },
        error: () => {
          this.filteredSchools = [];
        },
      });
  }

  private loadSelectedSchool(): void {
    if (!this.selectedSchoolId) return;
    this.schoolService.getSchoolById(this.selectedSchoolId).subscribe({
      next: (school) => {
        if (!school) return;
        this.cacheSchool(school);
        this.schoolSearchControl.setValue(this.getSchoolDisplayName(school), { emitEvent: false });
      },
      error: () => {
        /* keep id; user can search again */
      },
    });
  }

  private ensureSelectedSchoolDisplayed(): void {
    const selected = this.schools.find((s) => this.getSchoolId(s) === this.selectedSchoolId);
    if (selected) {
      this.schoolSearchControl.setValue(this.getSchoolDisplayName(selected), { emitEvent: false });
      return;
    }
    if (
      this.selectedSchoolId &&
      !this.filteredSchools.some((s) => this.getSchoolId(s) === this.selectedSchoolId)
    ) {
      this.loadSelectedSchool();
    }
  }

  private cacheSchool(school: School): void {
    const id = this.getSchoolId(school);
    if (!id || this.schools.some((s) => this.getSchoolId(s) === id)) return;
    this.schools = [...this.schools, school];
  }

  private cacheOffice(office: Office): void {
    if (!office._id || this.offices.some((o) => o._id === office._id)) return;
    this.offices = [...this.offices, office];
  }

  getSchoolId(school: School): string {
    const id = school._id;
    return typeof id === 'string' ? id : (id as { $oid?: string })?.$oid ?? '';
  }

  getSchoolDisplayName(school: School): string {
    return school.schoolName || '—';
  }

  displaySchoolFn = (value: string): string => {
    if (!value) return '';
    const school = this.schools.find((s) => this.getSchoolId(s) === value);
    return school ? this.getSchoolDisplayName(school) : '';
  };

  onSchoolSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    const selected = this.schools.find((s) => this.getSchoolId(s) === this.selectedSchoolId);
    const selectedDisplay = selected ? this.getSchoolDisplayName(selected) : '';
    if (selectedDisplay && value !== selectedDisplay) {
      this.selectedSchoolId = '';
    }
    this.schoolSearchSubject.next(value.trim());
  }

  onSchoolOptionSelected(schoolId: string): void {
    this.selectedSchoolId = schoolId;
    const school =
      this.filteredSchools.find((s) => this.getSchoolId(s) === schoolId) ??
      this.schools.find((s) => this.getSchoolId(s) === schoolId);
    if (school) {
      this.cacheSchool(school);
      this.schoolSearchControl.setValue(this.getSchoolDisplayName(school), { emitEvent: false });
    }
  }

  onOfficeSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.officeSearchSubject.next(value.trim());
  }

  onOfficeDivisionChange(division: string): void {
    this.selectedOfficeDivision = division ?? '';
    this.officeSearchControl.setValue('', { emitEvent: false });
    this.performOfficeSearch('');
  }

  onClusterChange(cluster: string): void {
    this.selectedCluster = cluster ?? '';
    this.selectedSchoolId = '';
    this.schoolSearchControl.setValue('', { emitEvent: false });
    this.performSchoolSearch('');
  }

  get displayName(): string {
    const u = this.data.user;
    return u?.name || u?.userName || u?.email || 'User';
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRoles.has(role);
  }

  onRoleChange(role: string, checked: boolean): void {
    if (checked) {
      this.selectedRoles.add(role);
      if (role === UserType.SchoolAdmin && this.selectedSchoolId) {
        this.loadSelectedSchool();
        this.performSchoolSearch('');
      }
      if (role === UserType.ProgramHolder) {
        this.loadSelectedOffices();
      }
    } else {
      this.selectedRoles.delete(role);
      if (role === UserType.SchoolAdmin) {
        this.selectedSchoolId = '';
        this.schoolSearchControl.setValue('', { emitEvent: false });
      }
      if (role === UserType.ProgramHolder) {
        this.selectedOfficeIds = [];
        this.selectedOfficeDivision = '';
        this.officeSearchControl.setValue('', { emitEvent: false });
      }
    }
    this.selectedRoles = new Set(this.selectedRoles);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onSave(): void {
    const userId = this.data.user?._id;
    if (!userId) {
      this.snackBar.open('Cannot update roles: missing user ID.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    const roles = Array.from(this.selectedRoles);

    if (this.selectedRoles.has(UserType.SchoolAdmin) && !this.selectedSchoolId) {
      this.snackBar.open('Please select a school for School Admin role.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    if (this.selectedRoles.has(UserType.ProgramHolder) && this.selectedOfficeIds.length === 0) {
      this.snackBar.open('Please select at least one office for Program Holder role.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    const payload: {
      roles: string[];
      schoolId?: string;
      officeIds?: string[];
      sector?: string;
      subsector?: string;
    } = { roles };

    if (this.selectedRoles.has(UserType.SchoolAdmin)) {
      payload.schoolId = this.selectedSchoolId;
    } else {
      payload.schoolId = undefined;
    }

    if (this.selectedRoles.has(UserType.ProgramHolder) && this.selectedOfficeIds.length > 0) {
      payload.officeIds = [...this.selectedOfficeIds];
      payload.sector = undefined;
      payload.subsector = undefined;
    } else {
      payload.officeIds = undefined;
      payload.sector = undefined;
      payload.subsector = undefined;
    }

    this.isSubmitting = true;

    this.userService.updateUserRoles(userId, payload).subscribe({
      next: () => {
        this.dialogRef.close(true);
        this.snackBar.open('Roles updated successfully.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message;
        const errorMessage = Array.isArray(msg)
          ? msg.join(' ')
          : typeof msg === 'string'
            ? msg
            : err?.error && typeof err.error === 'string'
              ? err.error
              : err?.message || 'Failed to update roles. Please try again.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
