import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {MatNativeDateModule, MatOption} from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { UserService } from '../common/services/user.service';


@Component({
  selector: 'app-school-admin',
  standalone: true,
  imports: [
    MatNativeDateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatDatepickerModule,
    MatOption,
    CommonModule,
    MatCardTitle,
    MatIcon
  ],
  templateUrl: './school-admin.component.html',
  styleUrls: ['./school-admin.component.css']
})
export class SchoolAdminComponent implements OnInit {
  schoolNeedsForm: FormGroup;
  schoolNeeds: any[] = [{
    contributionType: 'APPLIANCES AND EQUIPMENT ',
    specificContribution: 'Air-conditioning Units',
    quantityNeeded: 2,
    estimatedCost: 20000,
    targetDate: new Date('2025-09-01')
    },
    {
    contributionType: 'FURNITURE',
    specificContribution: 'Armchairs',
    quantityNeeded: 50,
    estimatedCost: 50000,
    targetDate: new Date('2025-10-15')
    }
    ];

  displayedColumns: string[] = ['contributionType', 'specificContribution', 'quantityNeeded', 'estimatedCost', 'targetDate', 'actions'];
  aipProjects: string[] = [];  // Populate AIP project names/ must be base on AIP form filled up
  pillars = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  schoolYears: string[] = ['2020-2021', '2022-2023', '2024-2025', '2026-2027'];
  selectedSchoolYear: string = this.schoolYears[0];
  selectedContribution: any;

  constructor(private readonly fb: FormBuilder,  private readonly userService: UserService) {
    this.schoolNeedsForm = this.fb.group({
      contributionType: [''],
      specificContribution: [''],
      schoolYear: [''],
      projectName: [''],
      intermediateOutcome: [''],
      quantityNeeded: [0],
      unit: [''],
      estimatedCost: [0],
      beneficiaryStudents: [0],
      beneficiaryPersonnel: [0],
      targetDate: [''],
      description: [''],
    });
  }
  queryData(): void {
    console.log('Querying data for school year:', this.selectedSchoolYear);

  }

  ngOnInit(): void {
    this.userService.projectTitles$.subscribe(titles => {
      this.aipProjects = titles;
    });
    this.userService.currentContribution.subscribe(data => {
      if (data) {
        this.selectedContribution = data;
        this.schoolNeedsForm.patchValue({
          specificContribution: data.specificContribution,
          contributionType: data.name // Set contribution type
        });
      }
    });
  }

  onSubmit(): void {
    const newNeed = {
      contributionType: this.schoolNeedsForm.get('contributionType')?.value,
      specificContribution: this.schoolNeedsForm.get('specificContribution')?.value,
      schoolYear: this.schoolNeedsForm.get('schoolYear')?.value,
      projectName: this.schoolNeedsForm.get('projectName')?.value,
      intermediateOutcome: this.schoolNeedsForm.get('intermediateOutcome')?.value,
      quantityNeeded: this.schoolNeedsForm.get('quantityNeeded')?.value,
      unit: this.schoolNeedsForm.get('unit')?.value,
      estimatedCost: this.schoolNeedsForm.get('estimatedCost')?.value,
      beneficiaryStudents: this.schoolNeedsForm.get('beneficiaryStudents')?.value,
      beneficiaryPersonnel: this.schoolNeedsForm.get('beneficiaryPersonnel')?.value,
      targetDate: this.schoolNeedsForm.get('targetDate')?.value,
      description: this.schoolNeedsForm.get('description')?.value,
    };

    this.schoolNeeds.push(newNeed); // Add new entry to the array
    this.schoolNeedsForm.reset(); // Reset the form
  }
  viewResponses(need: any): void {
    console.log('Viewing responses for:', need);

  }
  editNeed(need: any): void {
    console.log('Editing need:', need);
  }

  uploadPictures() {

  }
}
