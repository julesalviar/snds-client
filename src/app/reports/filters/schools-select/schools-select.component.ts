import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatSelect, MatSelectModule} from '@angular/material/select';
import {MatOption} from '@angular/material/core';
import {SchoolService} from '../../../common/services/school.service';
import {InternalReferenceDataService} from '../../../common/services/internal-reference-data.service';

@Component({
  selector: 'app-schools-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatSelectModule, MatOption],
  template: `
    <div class="schools-group">
      <mat-form-field appearance="outline">
        <mat-label>District/Cluster</mat-label>
        <mat-select [value]="selectedCluster" (selectionChange)="onClusterChange($event.value)">
          <mat-option *ngFor="let option of clusterOptions" [value]="option.value">
            {{ option.label | uppercase }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>{{ label || 'School' }}</mat-label>
        <mat-select [formControl]="control">
          <mat-option *ngFor="let school of schools" [value]="school._id || school.id">
            {{ (school.schoolName || school.name) | uppercase }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `
})
export class SchoolsSelectComponent implements OnInit {
  @Input() control!: FormControl;
  @Input() label?: string;

  schools: any[] = [];
  clusterOptions: Array<{ value: string; label: string }> = [];
  selectedCluster: string = '';

  constructor(
    private readonly schoolService: SchoolService,
    private readonly internalReferenceDataService: InternalReferenceDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadClusterOptions();
    this.loadSchools();
  }

  private async loadClusterOptions(): Promise<void> {
    try {
      await this.internalReferenceDataService.initialize();
      const clusters: string[] = this.internalReferenceDataService.get('clusters');
      if (clusters) {
        this.clusterOptions = [
          { value: '', label: 'All Districts/Clusters' },
          ...clusters.map(cluster => ({ value: cluster, label: cluster }))
        ];
      } else {
        this.clusterOptions = [{ value: '', label: 'All Districts/Clusters' }];
      }
    } catch (error) {
      console.error('Error loading cluster options:', error);
      this.clusterOptions = [{ value: '', label: 'All Districts/Clusters' }];
    }
  }

  private loadSchools(district?: string): void {
    this.schoolService.getAllSchools(district).subscribe({
      next: (response) => {
        this.schools = (response?.data ?? response) ?? [];
      },
      error: (error) => {
        console.error('Error loading schools for report filters:', error);
        this.schools = [];
      }
    });
  }

  onClusterChange(cluster: string): void {
    this.selectedCluster = cluster || '';
    this.loadSchools(this.selectedCluster);
    if (this.control) {
      this.control.setValue('');
      this.control.markAsPristine();
      this.control.markAsUntouched();
      this.control.updateValueAndValidity({ onlySelf: true });
    }
  }
}


