import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { OfficeService } from '../../common/services/office.service';
import { Office } from '../../common/model/office.model';
import { OFFICE_OPTIONS } from '../../common/constants/office-options';

@Component({
  selector: 'app-office-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './office-form.component.html',
  styleUrl: './office-form.component.css',
})
export class OfficeFormComponent implements OnInit {
  form: FormGroup;
  officeId: string | null = null;
  isEdit = false;
  isLoading = true;
  isSaving = false;
  readonly isDialogMode: boolean;

  /** Unique divisions from OFFICE_OPTIONS (plus custom division when editing) */
  divisionOptions: string[] = [...new Set(OFFICE_OPTIONS.map((o) => o.division))].sort();

  constructor(
    private readonly fb: FormBuilder,
    private readonly officeService: OfficeService,
    private readonly snackBar: MatSnackBar,
    @Optional() private readonly dialogRef: MatDialogRef<OfficeFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) dialogData?: { officeId?: string }
  ) {
    this.isDialogMode = !!this.dialogRef;
    if (this.isDialogMode && dialogData) {
      this.officeId = dialogData.officeId ?? null;
      this.isEdit = !!this.officeId;
    }
    this.form = this.fb.group({
      division: ['', Validators.required],
      name: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.officeId) {
      this.loadOffice();
    } else {
      this.isLoading = false;
    }
  }

  private loadOffice(): void {
    if (!this.officeId) return;
    this.officeService.getById(this.officeId).subscribe({
      next: (office) => {
        const division = office.division ?? '';
        if (division && !this.divisionOptions.includes(division)) {
          this.divisionOptions = [...this.divisionOptions, division].sort();
        }
        this.form.patchValue({
          division,
          name: office.name ?? '',
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load office', err);
        this.isLoading = false;
        this.showError(this.getErrorMessage(err, 'Failed to load office.'));
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving) return;
    const raw = this.form.getRawValue();
    const payload: Partial<Office> = {
      division: raw.division?.trim() || '',
      name: raw.name?.trim() || '',
    };

    this.isSaving = true;
    const request = this.isEdit && this.officeId
      ? this.officeService.update(this.officeId, payload)
      : this.officeService.create(payload);

    request.subscribe({
      next: () => {
        this.showSuccess(this.isEdit ? 'Office updated successfully.' : 'Office created successfully.');
        if (this.isDialogMode && this.dialogRef) {
          this.dialogRef.close(true);
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.showError(this.getErrorMessage(err, this.isEdit ? 'Failed to update office.' : 'Failed to create office.'));
      },
    });
  }

  onCancel(): void {
    if (this.isDialogMode && this.dialogRef) {
      this.dialogRef.close();
    }
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
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

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string | string[] } }).error;
      if (e?.message) {
        if (Array.isArray(e.message)) return e.message.join('\n• ') || fallback;
        if (typeof e.message === 'string') return e.message;
      }
      if (e && typeof e === 'string') return e;
    }
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string') {
      return (err as { message: string }).message;
    }
    if (typeof err === 'string') return err;
    return fallback;
  }
}
