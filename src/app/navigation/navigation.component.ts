import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { UserService } from '../services/user.service';
import { MatIconModule } from '@angular/material/icon';
@Component({
  standalone: true, 
  selector: 'app-navigation',
  templateUrl: './navigation.component.html', 
  styleUrls: ['./navigation.component.css'], 
  imports: [CommonModule, RouterModule, MatIconModule] 
})
export class NavigationComponent {
  constructor(private userService: UserService) {}

  get userRole(): string {
    return this.userService.getRole();
  }

}