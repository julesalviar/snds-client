import {Component, OnInit, QueryList, ViewChildren, EventEmitter,Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog} from '@angular/material/dialog';
import {AuthService} from "../auth/auth.service";
import {UserType, getRoleLabel} from "../registration/user-type.enum";
import {getRoleIcon} from "../registration/user-type-icons";
import {filter} from "rxjs";
import {TenantService} from "../config/tenant.service";
import {Tenant} from "../config/tenants.enum";
import {SwitchRoleDialogComponent, SwitchRoleDialogData} from "./switch-role-dialog/switch-role-dialog.component";
import {OfficeService} from "../common/services/office.service";
import {InternalReferenceDataService} from "../common/services/internal-reference-data.service";
import {Office} from "../common/model/office.model";
import {OfficeDivisionSubmenuComponent} from "./office-division-submenu/office-division-submenu.component";
@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css'],
  imports: [
    CommonModule,
    MatSidenavModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    OfficeDivisionSubmenuComponent
  ]
})
export class NavigationComponent implements OnInit {
  @Output() aipClicked = new EventEmitter<void>();
  isMenuOpen = false;
  userType = UserType;
  tenant = Tenant;
  currentRoute = '';
  protected readonly UserType = UserType;
  profileImageError = false;
  readonly isAuthenticated$ = this.authService.authState$;

  /** Offices grouped by division (division -> Office[]). */
  officesByDivision: Map<string, Office[]> = new Map();
  /** Division names in display order (from internal reference data or offices). */
  officeDivisions: string[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly tenantService: TenantService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly officeService: OfficeService,
    private readonly internalReferenceDataService: InternalReferenceDataService
  ) {
  }

  ngOnInit(): void {
    this.currentRoute = this.router.url.split(/[?#!;]/)[0];
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects.split(/[?#!;]/)[0];
      });
    this.loadOfficeNavigationData();
  }

  private loadOfficeNavigationData(): void {
    this.internalReferenceDataService.initialize()
      .then(() => {
        this.officeDivisions = this.internalReferenceDataService.getOfficeDivisions();
      })
      .catch(() => {
        // ignore; officeDivisions will be derived from offices
      })
      .finally(() => {
        this.officeService.getOfficesForNavigation().subscribe({
          next: (offices) => {
            const byDivision = new Map<string, Office[]>();
            for (const office of offices) {
              const div = office.division?.trim() || '(Unassigned)';
              const list = byDivision.get(div) ?? [];
              list.push(office);
              byDivision.set(div, list);
            }
            this.officesByDivision = byDivision;
            if (this.officeDivisions.length === 0) {
              this.officeDivisions = [...byDivision.keys()].sort();
            } else {
              // Merge: ref data order first, then any divisions from offices not in ref data
              const fromOffices = [...byDivision.keys()];
              const seen = new Set(this.officeDivisions);
              for (const d of fromOffices) {
                if (!seen.has(d)) {
                  this.officeDivisions.push(d);
                }
              }
            }
          },
          error: () => {
            this.officesByDivision = new Map();
          }
        });
      });
  }

  handleAipClick(): void {
    this.aipClicked.emit();
  }

  getOfficesForDivision(division: string): Office[] {
    return this.officesByDivision.get(division) ?? [];
  }

  @ViewChildren(OfficeDivisionSubmenuComponent) divisionSubmenus!: QueryList<OfficeDivisionSubmenuComponent>;

  onDivisionHover(hovered: OfficeDivisionSubmenuComponent): void {
    this.divisionSubmenus?.forEach((c) => {
      if (c !== hovered) {
        c.closeMenu();
      }
    });
  }

  /** Divisions that have at least one office (for menu display). */
  get officeDivisionsWithOffices(): string[] {
    return this.officeDivisions.filter((d) => (this.officesByDivision.get(d)?.length ?? 0) > 0);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    console.log('Menu Open:', this.isMenuOpen);
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  get userActiveRole(): string {
    return this.authService.getActiveRole();
  }

  get userRoles(): string[] {
    return this.authService.getUserRoles();
  }

  get activeRoleIcon(): string {
    return getRoleIcon(this.userActiveRole);
  }

  get activeRoleLabel(): string {
    return getRoleLabel(this.userActiveRole);
  }

  getName(): string {
    return this.authService.getName();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get currentTenant(): Tenant {
    return this.tenantService.getCurrentDomainTenant();
  }

  changePassword() {
    console.log('Change Password clicked');
  }

  editProfile() {
    console.log('Edit Profile clicked');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/sign-in']);
  }

  shouldShowLoginButton(): boolean {
    return this.currentRoute !== '/sign-in';
  }

  getUserInitials(): string {
    const name = this.authService.getName();
    const username = this.authService.getUsername();

    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }

    if (username && username.trim()) {
      return username.substring(0, 2).toUpperCase();
    }

    return 'U';
  }


  getProfileImageUrl(): string | null {
    // Placeholder for future image URL retrieval
    // For now, return null to show initials
    return null;
  }

  hasProfileImage(): boolean {
    return this.getProfileImageUrl() !== null && !this.profileImageError;
  }

  onImageError(event: Event): void {
    this.profileImageError = true;
  }

  openSwitchRoleDialog(): void {
    const roles = this.userRoles;
    const currentRole = this.userActiveRole;

    if (roles.length === 0) {
      return;
    }

    const dialogRef = this.dialog.open(SwitchRoleDialogComponent, {
      width: '400px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        roles: roles,
        currentRole: currentRole
      } as SwitchRoleDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Role switch was successful, page will reload automatically
        console.log('Role switched successfully');
      }
    });
  }

}

