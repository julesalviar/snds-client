import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-email-change-verified',
  templateUrl: './email-change-verified.component.html',
  styleUrls: ['./email-change-verified.component.css'],
  imports: [CommonModule, MatCardModule, MatButtonModule],
})
export class EmailChangeVerifiedComponent {
  constructor(private readonly router: Router) {}

  goToSignIn(): void {
    void this.router.navigate(['/sign-in']);
  }
}
