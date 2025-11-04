import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule} from '@angular/forms';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AIPProject } from '../../interfaces/aip.model';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDeleteDialogComponent } from '../../table-button-dialog/confirm-delete-dialog/confirm-delete-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AipDetailViewComponent } from '../../table-button-dialog/confirm-delete-dialog/view button/aip-detail-view/aip-detail-view.component';
import {AipService} from "../../common/services/aip.service";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {Aip} from "../../common/model/aip.model";
import {getSchoolYear} from "../../common/date-utils";
import {MatSnackBar} from "@angular/material/snack-bar";
import {AuthService} from "../../auth/auth.service";
import {UserType} from "../../registration/user-type.enum";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-aip',
  standalone: true,
  imports: [MatFormField, CommonModule, MatFormFieldModule, MatTooltipModule, MatInputModule, MatSelectModule, MatButtonModule, MatCardModule, ReactiveFormsModule, MatIconButton, MatTableModule, MatIcon, MatPaginator, MatProgressBarModule],
  templateUrl: './aip.component.html',
  styleUrls: ['./aip.component.css'],
  providers: [MatDialog],
})
export class AipComponent implements OnInit {
  schoolId: string = '';
  aipForm: FormGroup;
  displayedColumns: string[] = [ 'apn', 'title', 'totalBudget', 'schoolYear', 'status', 'actions'];
  projects: AIPProject[] = [];
  pillars: string[] = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  statuses: string[] = ['For Implementation', 'Ongoing', 'Completed', 'Incomplete', 'Unimplemented'];
  pageIndex: number = 0;
  pageSize: number = 10;
  dataSource = new MatTableDataSource<Aip>();
  totalItems: number = 0;
  isLoading: boolean = true;

  protected readonly UserType = UserType;

  constructor(
    private readonly fb: FormBuilder,
    protected dialog: MatDialog,
    private readonly aipService: AipService,
    private readonly snackBar: MatSnackBar,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.aipForm = this.fb.group({
      schoolYear: [getSchoolYear(), Validators.required],
      title: ['', Validators.required],
      objectives: ['', [Validators.required, Validators.maxLength(500)]],
      intermediateOutcome: ['', Validators.required],
      responsiblePerson: ['', Validators.required],
      materialsNeeded: ['', Validators.required],
      totalBudget: [100, [Validators.required, Validators.min(1)]],
      budgetSource: ['', Validators.required],
      status: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.schoolId = this.route.snapshot.params['schoolId'];
    this.loadAips(this.schoolId);
  }

  onSubmit() {
    if (this.aipForm.valid) {
      const {intermediateOutcome, schoolYear, ...filteredValues} = this.aipForm.value;
      const newProject: Aip = {
        pillars: intermediateOutcome,
        schoolYear: `${schoolYear}`,
        ...filteredValues,
      };
      this.aipService.createAip(newProject).subscribe({
        next: (res) => {
          this.aipForm.reset({
            schoolYear: getSchoolYear()
          }, { emitEvent: false });

          this.aipForm.markAsPristine();
          this.aipForm.markAsUntouched();
          this.loadAips(this.schoolId);
          this.showSuccessNotification('AIP project saved successfully!');
        },
        error: (err) => {
          console.error('Error creating AIP project:', err);

          let errorMessage = 'Failed to save AIP project. Please try again.';

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
    }
  }

  viewProject(project: Aip): void {
    this.dialog.open(AipDetailViewComponent, {
      data: project,
    });
  }

  editProject(project: Aip) {
    // Security check: Only School Admins can edit
    if (this.userRole !== UserType.SchoolAdmin) {
      this.showErrorNotification('Unauthorized: Only School Admins can edit projects.');
      console.warn('Unauthorized edit attempt by user role:', this.userRole);
      return;
    }

    this.router.navigate(['/school-admin/aip/edit', project._id]);
  }

  deleteProject(project: Aip): void {
    // Security check: Only School Admins can delete
    if (this.userRole !== UserType.SchoolAdmin) {
      this.showErrorNotification('Unauthorized: Only School Admins can delete projects.');
      console.warn('Unauthorized delete attempt by user role:', this.userRole);
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete AIP Project',
        message: `Are you sure you want to delete the project "${project.title}"? This action cannot be undone.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Double-check authorization before API call
        if (this.userRole !== UserType.SchoolAdmin) {
          this.showErrorNotification('Unauthorized: Only School Admins can delete projects.');
          console.warn('Unauthorized delete attempt by user role:', this.userRole);
          return;
        }

        this.aipService.deleteAip(project._id).subscribe({
          next: () => {
            this.showSuccessNotification('AIP project deleted successfully!');
            this.loadAips(this.schoolId);
          },
          error: (err) => {
            console.error('Error deleting AIP project:', err);

            let errorMessage = 'Failed to delete AIP project. Please try again.';

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
        console.log('Deletion canceled');
      }
    });
  }

  loadAips(schoolId?: string): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;
    this.aipService.getAips(page, this.pageSize, schoolId).subscribe({
      next: (response) => {
        this.dataSource.data = response.data;
        this.totalItems = response.meta.totalItems;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching AIP projects:', err);
        this.isLoading = false;

        let errorMessage = 'Failed to load AIP projects. Please try again.';

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
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadAips(this.schoolId);
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get userRole(): string {
    return this.authService.getRole();
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
