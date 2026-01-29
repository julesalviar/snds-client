import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface DistrictFormDialogData {
  mode: 'add' | 'edit';
  name?: string;
  existingNames?: string[];
}

@Component({
  selector: 'app-district-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './district-form-dialog.component.html',
  styleUrl: './district-form-dialog.component.css',
})
export class DistrictFormDialogComponent {
  form: FormGroup;
  isEdit: boolean;

  constructor(
    private readonly fb: FormBuilder,
    public dialogRef: MatDialogRef<DistrictFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DistrictFormDialogData
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
