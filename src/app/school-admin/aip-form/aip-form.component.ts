import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AipService } from '../../common/services/aip.service';
import { Aip } from '../../common/model/aip.model';
import {
  aipSchoolYearPayloadFromSelection,
  getSchoolYear,
  getSchoolYearOptions,
} from '../../common/date-utils';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import { AIP_STATUSES } from '../../common/enums/aip-status.enum';

@Component({
  selector: 'app-aip-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './aip-form.component.html',
  styleUrl: './aip-form.component.css',
})
export class AipFormComponent implements OnInit {
  aipForm: FormGroup;
  isSaving = false;
  pillars: string[] = [];
  readonly schoolYearOptions = getSchoolYearOptions();
  readonly statuses: readonly string[] = AIP_STATUSES;

  constructor(
    private readonly dialogRef: MatDialogRef<AipFormComponent, boolean>,
    private readonly fb: FormBuilder,
    private readonly aipService: AipService,
    private readonly snackBar: MatSnackBar,
    private readonly referenceDataService: ReferenceDataService,
  ) {
    this.aipForm = this.fb.group({
      schoolYear: [[getSchoolYear()], Validators.required],
      problemStatement: ['', [Validators.required, Validators.maxLength(500)]],
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

  ngOnInit(): void {
    this.loadPillars();
    if (this.statuses.length > 0) {
      this.aipForm.patchValue({ status: this.statuses[0] });
    }
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }

  onSubmit(): void {
    if (!this.aipForm.valid || this.isSaving) {
      this.aipForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const { intermediateOutcome, schoolYear, ...filteredValues } =
      this.aipForm.value;
    const newProject: Aip = {
      pillars: intermediateOutcome,
      schoolYear: aipSchoolYearPayloadFromSelection(schoolYear as string[]),
      ...filteredValues,
    };

    this.aipService.createAip(newProject).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('AIP project saved successfully!', 'Close', {
          duration: 4000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
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

        const duration = errorMessage.includes('\n') ? 8000 : 5000;
        this.snackBar.open(errorMessage, 'Close', {
          duration,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  private loadPillars(): void {
    const pillarsData = this.referenceDataService.get<string[]>('pillars');
    if (pillarsData) {
      this.pillars = pillarsData;
    }
  }
}
