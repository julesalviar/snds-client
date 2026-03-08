import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { CommonModule } from '@angular/common';
import { MatTreeModule } from '@angular/material/tree';
import { MatBadgeModule } from '@angular/material/badge';
import {filter} from "rxjs";
import { FooterComponent } from './footer/footer.component';
import { FieldCheckerService } from './common/services/utils/field-checker.service';
import { UserType } from './registration/user-type.enum';
import { AuthService } from './auth/auth.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterModule, NavigationComponent, MatTreeModule, MatBadgeModule, FooterComponent ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'sndsapp';

  showNavBar: boolean = false;

  constructor(private readonly router: Router, private fieldCheckerService: FieldCheckerService, private authService: AuthService) {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects.split(/[?#!;]/)[0];
        const hiddenRoutes = [
          '/school-admin-registration',
          '/register'
        ];
        this.showNavBar = !hiddenRoutes.includes(url);
      });
  }
  onAipClick(): void {
    this.fieldCheckerService.checkRequiredProfileData().then(({ isComplete }: { isComplete: boolean }) => {
      if (!isComplete)  {
        // Show Snackbar message if the profile is incomplete
        if (this.isUserSchoolAdmin()) {
          // Show Snackbar message if the profile is incomplete
          this.fieldCheckerService.openSnackbar('You Need to Upload School Logo or School Location in the Edit Profile to access AIP');
        }
        return;
      }

      // Navigate to AIP component if the profile is complete
      this.router.navigate(['/school-admin/aip']); 
    });
  }
  private isUserSchoolAdmin(): boolean {
    return this.authService.isUserSchoolAdmin(); // Check if the user is SchoolAdmin
  }
}
