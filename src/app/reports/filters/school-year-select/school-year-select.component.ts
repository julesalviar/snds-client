import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatSelect, MatSelectModule} from '@angular/material/select';
import {MatOption} from '@angular/material/core';
import {getSchoolYear} from '../../../common/date-utils';

@Component({
  selector: 'app-school-year-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatSelectModule, MatOption],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ label || 'School Year' }}</mat-label>
      <mat-select [formControl]="control">
        <mat-option *ngFor="let option of schoolYearOptions" [value]="option">
          {{ option }}
        </mat-option>
      </mat-select>
    </mat-form-field>
  `
})
export class SchoolYearSelectComponent implements OnInit {
  @Input() control!: FormControl;
  @Input() label?: string;

  schoolYearOptions: string[] = [];

  ngOnInit(): void {
    this.schoolYearOptions = this.generateSchoolYearOptions();
  }

  private generateSchoolYearOptions(): string[] {
    const options: string[] = [];
    const startYear = 2025;
    const currentSchoolYear = getSchoolYear();
    const currentStartYear = parseInt(currentSchoolYear.split('-')[0]);
    const endYear = currentStartYear + 3;
    for (let year = startYear; year <= endYear; year++) {
      options.push(`${year}-${year + 1}`);
    }
    return options;
  }
}


