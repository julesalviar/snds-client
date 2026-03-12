import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface FundSourceFormDialogData {
  mode: 'add' | 'edit';
  name?: string;
  existingNames?: string[];
}

@Component({
  selector: 'app-fund-source-form-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './fund-source-form-dialog.component.html',
  styleUrl: './fund-source-form-dialog.component.css',
})
export class FundSourceFormDialogComponent {
  form: FormGroup;
  isEdit: boolean;

  constructor(
    private readonly fb: FormBuilder,
    public dialogRef: MatDialogRef<FundSourceFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FundSourceFormDialogData
  ) {
    this.isEdit = data.mode === 'edit';
    const initial = data.name ?? '';
    this.form = this.fb.group({
      name: [initial, [Validators.required, Validators.maxLength(200)]],
    });
  }

  get nameControl() {
    return this.form.get('name');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = (this.nameControl?.value ?? '').trim();
    if (!name) return;
    this.dialogRef.close(name);
  }
}
