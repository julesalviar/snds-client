import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { UserInviteService } from '../common/services/user-invite.service';
import { SchoolAdminRegistrationComponent } from '../school-admin-registration/school-admin-registration.component';

@Component({
  selector: 'app-close-registration',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule,
    SchoolAdminRegistrationComponent,
  ],
  templateUrl: './close-registration.component.html',
  styleUrls: ['./close-registration.component.css'],
})
export class CloseRegistrationComponent implements OnInit {
  isLoading = true;
  tokenValid: boolean | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly userInviteService: UserInviteService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token?.trim()) {
      this.tokenValid = false;
      this.isLoading = false;
      return;
    }
    this.userInviteService.verifyToken(token.trim()).subscribe({
      next: (res) => {
        this.tokenValid = res.valid;
        this.isLoading = false;
      },
      error: () => {
        this.tokenValid = false;
        this.isLoading = false;
      },
    });
  }
}
