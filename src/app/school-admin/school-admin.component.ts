import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatOption } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';


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
  @Input() treeData: any[] = [];
  schoolNeedsForm: FormGroup;
  schoolNeeds: any[] = [
    {
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
  aipProjects = ['Sample']; // Populate AIP project names/ must be base on AIP form filled up
  pillars = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  schoolYears: string[] = ['2020-2021', '2022-2023', '2024-2025', '2026-2027'];
  selectedSchoolYear: string = this.schoolYears[0]; 
  selectedContribution: any;

  constructor(private fb: FormBuilder) {
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

  ngOnInit(): void {}

  onSubmit(): void {
    const newNeed = this.schoolNeedsForm.value;
    this.schoolNeeds.push(newNeed);
    this.schoolNeedsForm.reset();
  }
  viewResponses(need: any): void {
    console.log('Viewing responses for:', need);
   
  }
  editNeed(need: any): void {
    console.log('Editing need:', need);
  }
  uploadPictures(): void {
  }
  save(): void{
  }
  

  onContributionTypeChange(type: string): void {
    this.selectedContribution = this.treeData.find(t => t.name === type);
  }
}