import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../common/services/user.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import {AuthService} from "../auth/auth.service";

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
export class NavigationComponent {
  isMenuOpen = false;

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    console.log('Menu Open:', this.isMenuOpen); // Debugging
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  get userRole(): string {
    return this.userService.getRole();
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
}
