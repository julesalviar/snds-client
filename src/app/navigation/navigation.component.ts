import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { UserService } from '../services/user.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  standalone: true, 
  selector: 'app-navigation',
  templateUrl: './navigation.component.html', 
  styleUrls: ['./navigation.component.css'], 
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatMenuModule] 
})
export class NavigationComponent {
  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen; 
    console.log('Menu Open:', this.isMenuOpen); // Debugging
  }

  closeMenu() {
    this.isMenuOpen = false; 
  }

  constructor(private userService: UserService) {}

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
    console.log('Logging out...');
  }
}