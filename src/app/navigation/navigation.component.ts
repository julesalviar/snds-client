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
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule,  MatMenuModule] 
})
export class NavigationComponent {
  constructor(private userService: UserService) {}
  isMenuOpen = false;
 
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  get userRole(): string {
    return this.userService.getRole();
  }
  changePassword() {
    console.log('Change Password clicked');
    // Implement your logic here
  }
  
  editProfile() {
    console.log('Edit Profile clicked');
    // Implement your logic here
  }
  logout(): void {
    // Implement your logout logic here
    // This might include clearing tokens, user data, etc.
    console.log('Logging out...');
    
  }
}

