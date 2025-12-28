import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog} from '@angular/material/dialog';
import {AuthService} from "../auth/auth.service";
import {UserType} from "../registration/user-type.enum";
import {filter} from "rxjs";
import {TenantService} from "../config/tenant.service";
import {Tenant} from "../config/tenants.enum";
import {SwitchRoleDialogComponent, SwitchRoleDialogData} from "./switch-role-dialog/switch-role-dialog.component";

@Component({
  standalone: true,
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
    MatDividerModule
  ]
})
export class NavigationComponent implements OnInit {
  isMenuOpen = false;
  userType = UserType;
  tenant = Tenant;
  currentRoute = '';
  protected readonly UserType = UserType;
  profileImageError = false;

  constructor(
    private readonly authService: AuthService,
    private readonly tenantService: TenantService,
    private readonly router: Router,
    private readonly dialog: MatDialog
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

