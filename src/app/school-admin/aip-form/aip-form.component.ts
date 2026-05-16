import { Component, OnInit, Optional, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AipService } from '../../common/services/aip.service';
import { Aip } from '../../common/model/aip.model';
import {
  aipSchoolYearPayloadFromSelection,
  aipSchoolYearsAsArray,
  getSchoolYear,
  getSchoolYearOptions,
} from '../../common/date-utils';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import { AIP_STATUSES } from '../../common/enums/aip-status.enum';

export interface AipFormDialogData {
  projectId?: string;
  isDuplicate?: boolean;
  isEdit?: boolean;
  sourceProject?: Aip;
}

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
    MatChipsModule,
  ],
  templateUrl: './aip-form.component.html',
  styleUrl: './aip-form.component.css',
})
export class AipFormComponent implements OnInit {
  aipForm: FormGroup;
  isSaving = false;
  isLoading = false;
  isDuplicate = false;
  isEdit = false;
  pillars: string[] = [];
  readonly schoolYearOptions = getSchoolYearOptions();
  readonly statuses: readonly string[] = AIP_STATUSES;
  private projectId: string | null = null;

  private static schoolYearsValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const value = control.value;
    const years = Array.isArray(value) ? value : value ? [value] : [];
    return years.length > 0 ? null : { schoolYearsRequired: true };
  }

  get selectedSchoolYears(): string[] {
    const value = this.aipForm.get('schoolYear')?.value;
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  get availableSchoolYearOptions(): string[] {
    const selected = new Set(this.selectedSchoolYears);
    return this.schoolYearOptions.filter((y) => !selected.has(y));
  }

  get dialogTitle(): string {
    if (this.isEdit) {
      return 'Edit PPA';
    }
    if (this.isDuplicate) {
      return 'Duplicate PPA';
    }
    return 'Create PPA';
  }

  get submitLabel(): string {
    if (this.isSaving) {
      return 'Saving…';
    }
    if (this.isEdit) {
      return 'Update';
    }
    if (this.isDuplicate) {
      return 'Save';
    }
    return 'Create';
  }

  constructor(
    private readonly dialogRef: MatDialogRef<AipFormComponent, boolean>,
    private readonly fb: FormBuilder,
    private readonly aipService: AipService,
    private readonly snackBar: MatSnackBar,
    private readonly referenceDataService: ReferenceDataService,
    @Optional() @Inject(MAT_DIALOG_DATA) public readonly dialogData: AipFormDialogData | null,
  ) {
    this.isDuplicate = !!dialogData?.isDuplicate;
    this.isEdit = !!dialogData?.isEdit;
    this.projectId = dialogData?.projectId ?? null;
    this.aipForm = this.fb.group({
      apn: [{ value: '', disabled: true }],
      schoolYear: [
        [getSchoolYear()],
        [AipFormComponent.schoolYearsValidator],
      ],
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
    if (this.isEdit) {
      if (this.dialogData?.sourceProject) {
        this.patchFormFromProject(this.dialogData.sourceProject, { forEdit: true });
      } else if (this.projectId) {
        this.loadProject({ forEdit: true });
      } else {
        this.showError('No project selected to edit.');
      }
    } else if (this.isDuplicate) {
      if (this.dialogData?.sourceProject) {
        this.patchFormFromProject(this.dialogData.sourceProject);
      }
      if (this.projectId) {
        this.loadProject();
      } else if (!this.dialogData?.sourceProject) {
        this.showError('No project selected to duplicate.');
      }
    } else if (this.statuses.length > 0) {
      this.aipForm.patchValue({ status: this.statuses[0] });
    }
  }

  private patchFormFromProject(
    project: Aip,
    opts: { forEdit?: boolean } = {},
  ): void {
    this.aipForm.patchValue({
      apn: project.apn ?? '',
      schoolYear: aipSchoolYearsAsArray(project.schoolYear),
      problemStatement: project.problemStatement ?? '',
      title: project.title ?? '',
      objectives: project.objectives ?? '',
      intermediateOutcome: project.pillars ?? '',
      responsiblePerson: project.responsiblePerson ?? '',
      materialsNeeded: project.materialsNeeded ?? '',
      totalBudget: project.totalBudget ?? 0,
      budgetSource: project.budgetSource ?? '',
      status: opts.forEdit
        ? project.status ?? this.statuses[0] ?? ''
        : this.statuses[0] ?? project.status ?? '',
    });
  }

  private loadProject(opts: { forEdit?: boolean } = {}): void {
    this.isLoading = true;
    this.aipService.getAipById(this.projectId!).subscribe({
      next: (project) => {
        this.patchFormFromProject(project, opts);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading project:', err);
        this.isLoading = false;
        this.showError(
          opts.forEdit
            ? 'Failed to load project details.'
            : 'Failed to load project data for duplication.',
        );
      },
    });
  }

  openSchoolYearSelect(select: MatSelect): void {
    if (this.availableSchoolYearOptions.length === 0) {
      return;
    }
    select.open();
  }

  addSchoolYear(year: string): void {
    if (!year || this.selectedSchoolYears.includes(year)) {
      return;
    }
    const control = this.aipForm.get('schoolYear');
    control?.setValue([...this.selectedSchoolYears, year]);
    control?.markAsDirty();
    control?.markAsTouched();
  }

  removeSchoolYear(year: string): void {
    const control = this.aipForm.get('schoolYear');
    const next = this.selectedSchoolYears.filter((y) => y !== year);
    control?.setValue(next);
    control?.markAsDirty();
    control?.markAsTouched();
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }

  onSubmit(): void {
    if (!this.aipForm.valid || this.isSaving || this.isLoading) {
      this.aipForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const { intermediateOutcome, apn: _apn, schoolYear, ...filteredValues } =
      this.aipForm.getRawValue();
    const payload = {
      pillars: intermediateOutcome,
      schoolYear: aipSchoolYearPayloadFromSelection(schoolYear as string[]),
      ...filteredValues,
    };

    const request$ = this.isEdit
      ? this.aipService.updateAip(this.projectId!, payload)
      : this.aipService.createAip(payload as Aip);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        const message = this.isEdit
          ? 'AIP project updated successfully!'
          : this.isDuplicate
            ? 'AIP project duplicated successfully!'
            : 'AIP project saved successfully!';
        this.snackBar.open(message, 'Close', {
          duration: 4000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error saving AIP project:', err);

        let errorMessage = this.isEdit
          ? 'Failed to update AIP project. Please try again.'
          : this.isDuplicate
            ? 'Failed to duplicate AIP project. Please try again.'
            : 'Failed to save AIP project. Please try again.';

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

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private loadPillars(): void {
    const pillarsData = this.referenceDataService.get<string[]>('pillars');
    if (pillarsData) {
      this.pillars = pillarsData;
    }
  }
}
