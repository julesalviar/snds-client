import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterModule, NavigationComponent], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'sndsapp';
 
  isOnRestrictedPage: boolean = false; 
  constructor(private router: Router) {
    // Subscribe to router events to check current navigation status
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isOnRestrictedPage = event.url.includes('/sign-in') || event.url.includes('/school-admin-registration') || event.url.includes('/register');
      }
    });
  }
}