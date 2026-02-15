import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserListItem } from '../../../registration/user.model';
import { UserType, getRoleLabel } from '../../../registration/user-type.enum';
import { getRoleIcon, getRoleColor } from '../../../registration/user-type-icons';
import { AuthService } from '../../../auth/auth.service';
import { UserService } from '../../../common/services/user.service';
import { SchoolService } from '../../../common/services/school.service';
import { Office } from '../../../common/model/office.model';
import { OfficeService } from '../../../common/services/office.service';
import { InternalReferenceDataService } from '../../../common/services/internal-reference-data.service';

export interface ManageRolesDialogData {
  user: UserListItem;
}

@Component({
  selector: 'app-manage-roles-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './manage-roles-dialog.component.html',
  styleUrl: './manage-roles-dialog.component.css',
})
export class ManageRolesDialogComponent implements OnInit {
  selectedRoles: Set<string> = new Set();
  selectedSchoolId = '';
  selectedOfficeIds: string[] = [];
  selectedOfficeDivision = '';
  officeSelectValue = '';
  isSubmitting = false;

  clusterOptions: Array<{ value: string; label: string }> = [];
  selectedCluster = '';
  schools: Array<{ _id?: string; id?: string; schoolName?: string; name?: string }> = [];
  offices: Office[] = [];

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

  /** Offices filtered by selected division (from GET /offices). */
  get officesForSelect(): Office[] {
    if (!this.selectedOfficeDivision) return this.offices;
    return this.offices.filter((o) => o.division === this.selectedOfficeDivision);
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
    if (officeId && !this.selectedOfficeIds.includes(officeId)) {
      this.selectedOfficeIds = [...this.selectedOfficeIds, officeId];
    }
    this.officeSelectValue = '';
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
    await this.loadClusterOptions();
    this.loadSchools();
    this.loadOffices();
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

  private loadOffices(): void {
    this.officeService.getOffices({ page: 1, limit: 500 }).subscribe({
      next: (res) => {
        this.offices = res?.data ?? [];
        if (this.selectedOfficeIds.length === 0 && this.data.user?.sector && this.data.user?.subsector) {
          const match = this.offices.find(
            (o) => o.division === this.data.user?.sector && o.name === this.data.user?.subsector
          );
          if (match) this.selectedOfficeIds = [match._id];
        }
      },
      error: () => {
        this.offices = [];
      },
    });
  }

  private loadSchools(district?: string): void {
    this.schoolService.getAllSchools(district).subscribe({
      next: (res) => {
        this.schools = (res?.data ?? res) ?? [];
      },
      error: () => {
        this.schools = [];
      },
    });
  }

  onClusterChange(cluster: string): void {
    this.selectedCluster = cluster ?? '';
    this.loadSchools(this.selectedCluster || undefined);
    this.selectedSchoolId = '';
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
    } else {
      this.selectedRoles.delete(role);
      if (role === UserType.SchoolAdmin) this.selectedSchoolId = '';
      if (role === UserType.ProgramHolder) {
        this.selectedOfficeIds = [];
        this.selectedOfficeDivision = '';
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
