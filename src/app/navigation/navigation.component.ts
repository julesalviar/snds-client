import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
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
    MatMenuModule
  ]
})
export class NavigationComponent implements OnInit {
  dropdownVisible = false;
  submenuVisible = false;
  supportMenuVisible = false;
  isMenuOpen = false;
  userType = UserType;
  tenant = Tenant;
  currentRoute = '';
  protected readonly UserType = UserType;

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

  toggleDropdown() {
    this.dropdownVisible = !this.dropdownVisible;
    this.submenuVisible = false; // Close submenu when main dropdown is toggled
  }

  toggleSubmenu() {
    this.submenuVisible = !this.submenuVisible;
  }

  toggleSupportMenu() {
    this.supportMenuVisible = !this.supportMenuVisible;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    console.log('Menu Open:', this.isMenuOpen);
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.dropdownVisible = false;
    this.submenuVisible = false;
    this.submenuVisible = false;
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

