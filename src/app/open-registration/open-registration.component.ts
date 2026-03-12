import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { InternalReferenceDataService } from '../common/services/internal-reference-data.service';
import { SchoolAdminRegistrationComponent } from '../school-admin-registration/school-admin-registration.component';

const OPEN_REGISTRATION_KEY = 'openRegistration';

@Component({
  selector: 'app-open-registration',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule,
    SchoolAdminRegistrationComponent,
  ],
  templateUrl: './open-registration.component.html',
  styleUrls: ['./open-registration.component.css'],
})
export class OpenRegistrationComponent implements OnInit {
  isLoading = true;
  isOpen = false;

  constructor(
    private readonly internalReferenceDataService: InternalReferenceDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.internalReferenceDataService.initialize();
    const raw = this.internalReferenceDataService.get<unknown>(OPEN_REGISTRATION_KEY);
    this.isOpen = this.parseOpenRegistration(raw);
    this.isLoading = false;
  }

  private parseOpenRegistration(raw: unknown): boolean {
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    if (raw && typeof raw === 'object' && 'value' in raw) {
      const val = (raw as { value: unknown }).value;
      return val === true || val === 'true';
    }
    return false;
  }
}
