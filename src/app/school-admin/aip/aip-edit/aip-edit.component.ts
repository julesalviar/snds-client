import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AipService } from '../../../common/services/aip.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Aip } from '../../../common/model/aip.model';
import { AuthService } from '../../../auth/auth.service';
import { UserType } from '../../../registration/user-type.enum';

@Component({
  selector: 'app-aip-edit',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    ReactiveFormsModule,
    MatProgressBarModule
  ],
  templateUrl: './aip-edit.component.html',
  styleUrls: ['./aip-edit.component.css']
})
export class AipEditComponent implements OnInit {
  aipForm: FormGroup;
  projectId: string = '';
  isLoading: boolean = true;
  pillars: string[] = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  statuses: string[] = ['For Implementation', 'Ongoing', 'Completed', 'Incomplete', 'Unimplemented'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly aipService: AipService,
    private readonly snackBar: MatSnackBar,
    private readonly authService: AuthService
  ) {
    this.aipForm = this.fb.group({
      apn: [''],
      schoolYear: ['', Validators.required],
      title: ['', Validators.required],
      objectives: ['', [Validators.required, Validators.maxLength(500)]],
      intermediateOutcome: ['', Validators.required],
      responsiblePerson: ['', Validators.required],
      materialsNeeded: ['', Validators.required],
      totalBudget: [0, [Validators.required, Validators.min(1)]],
      budgetSource: ['', Validators.required],
      status: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Security check: Only School Admins can access edit page
    if (this.authService.getActiveRole() !== UserType.SchoolAdmin) {
      this.showErrorNotification('Unauthorized: Only School Admins can edit projects.');
      console.warn('Unauthorized access to edit page by user role:', this.authService.getActiveRole());
      this.router.navigate(['/school-admin', 'aip']);
      return;
    }

    this.projectId = this.route.snapshot.params['id'];
    if (this.projectId) {
      this.loadProjectData();
    }
  }

  loadProjectData(): void {
    this.isLoading = true;
    console.log(this.projectId);
    this.aipService.getAipById(this.projectId).subscribe({
      next: (project: Aip) => {
        console.log(project);
        this.aipForm.patchValue({
          apn: project.apn,
          schoolYear: project.schoolYear,
          title: project.title,
          objectives: project.objectives,
          intermediateOutcome: project.pillars,
          responsiblePerson: project.responsiblePerson,
          materialsNeeded: project.materialsNeeded,
          totalBudget: project.totalBudget,
          budgetSource: project.budgetSource,
          status: project.status,
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading project:', err);
        this.isLoading = false;
        this.showErrorNotification('Failed to load project details. Please try again.');
      }
    });
  }

  onSubmit(): void {
    // Security check: Only School Admins can update
    if (this.authService.getActiveRole() !== UserType.SchoolAdmin) {
      this.showErrorNotification('Unauthorized: Only School Admins can update projects.');
      console.warn('Unauthorized update attempt by user role:', this.authService.getActiveRole());
      return;
    }

    if (this.aipForm.valid) {
      const { intermediateOutcome, apn, ...filteredValues } = this.aipForm.value;
      const updatedProject: Partial<Aip> = {
        pillars: intermediateOutcome,
        ...filteredValues,
      };

      this.aipService.updateAip(this.projectId, updatedProject).subscribe({
        next: (res) => {
          this.showSuccessNotification('AIP project updated successfully!');
          this.router.navigate(['/school-admin', 'aip']).then(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        },
        error: (err) => {
          console.error('Error updating AIP project:', err);

          let errorMessage = 'Failed to update AIP project. Please try again.';

          if (err?.error?.message) {
            if (Array.isArray(err.error.message)) {
              errorMessage = err.error.message.join('\n• ');
              if (err.error.message.length > 1) {
                errorMessage = `Please fix the following errors:\n• ${errorMessage}`;
              }
            } else if (typeof err.error.message === 'string') {
              errorMessage = err.error.message;
            }
          } else if (err?.error && typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err?.message) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }

          this.showErrorNotification(errorMessage);
        }
      });
    } else {
      this.showErrorNotification('Please fill in all required fields correctly.');
    }
  }

  onCancel(): void {
    this.router.navigate(['/school-admin', 'aip']).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  private showErrorNotification(message: string): void {
    const duration = message.includes('\n') ? 8000 : 5000;

    this.snackBar.open(message, 'Close', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }
}

