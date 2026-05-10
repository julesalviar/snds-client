import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-email-activated',
  templateUrl: './email-activated.component.html',
  styleUrls: ['./email-activated.component.css'],
  imports: [CommonModule, MatCardModule, MatButtonModule],
})
export class EmailActivatedComponent {
  constructor(private readonly router: Router) {}

  goToSignIn(): void {
    void this.router.navigate(['/sign-in']);
  }
}
