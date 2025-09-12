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
import {map, Observable, of, switchMap} from "rxjs";
import {SchoolNeedService} from "../common/services/school-need.service";
import {getSchoolYear} from "../common/date-utils";
import {AipService} from "../common/services/aip.service";
import {Aip} from "../common/model/aip.model";
import {SchoolNeed} from "../common/model/school-need.model";
import {AuthService} from "../auth/auth.service";


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
  schoolNeedsData: any[] = [];
  projectsData: Aip[] = [];

  displayedColumns: string[] = ['contributionType', 'specificContribution', 'quantityNeeded', 'estimatedCost', 'targetDate', 'actions'];
  aipProjects: string[] = [];  // Populate AIP project names/ must be base on AIP form filled up
  pillars = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  schoolYears: string[] = ['2025-2026', '2024-2025', '2023-2024', '2022-2021', '2021-2020', '2020-2019', '2019-2018', '2018-2017'];
  units: string[] = ['Bottles', 'Boxes', 'Classrooms', 'Feet', 'Gallons', 'Hectares', 'Hours', 'Learners', 'Lots', 'Months', 'Non-Teaching Personnel', 'Pieces', 'Reams', 'Rolls', 'Sacks', 'Sheets', 'Spans', 'Teaching Personnel', 'Units', 'Others (pls. specify)']
  selectedSchoolYear: string = this.schoolYears[1];
  selectedContribution: any;
  selectedProject: any;
  isOtherSelected = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly aipService: AipService,
    private readonly  authService: AuthService,
  ) {
    this.schoolNeedsForm = this.fb.group({
      contributionType: [''],
      specificContribution: [''],
      schoolYear: [getSchoolYear()],
      projectName: [''],
      intermediateOutcome: [''],
      quantityNeeded: [0],
      unit: [''],
      otherUnit: [''],
      estimatedCost: [0],
      beneficiaryStudents: [0],
      beneficiaryPersonnel: [0],
      targetDate: [''],
      description: [''],
    });
  }
  queryData(): void {
    this.loadAllSchoolNeeds();
    console.log('Load All School Needs');
  }

  ngOnInit(): void {
    this.loadAllSchoolNeeds();
    this.loadCurrentProjects();
    this.userService.projectTitles$.subscribe(titles => {
      this.aipProjects = titles;
    });
    this.userService.currentContribution.subscribe(data => {
      if (data) {
        this.selectedContribution = data;
        this.schoolNeedsForm.patchValue({
          specificContribution: data.specificContribution,
          contributionType: data.name
        });
      }
    });
  }

  onSubmit(): void {
    const newNeed: SchoolNeed = {
      specificContribution: this.schoolNeedsForm.get('specificContribution')?.value,
      contributionType: this.schoolNeedsForm.get('contributionType')?.value,
      projectId: this.schoolNeedsForm.get('projectName')?.value,
      quantity: this.schoolNeedsForm.get('quantityNeeded')?.value,
      unit: this.schoolNeedsForm.get('unit')?.value,
      estimatedCost: this.schoolNeedsForm.get('estimatedCost')?.value,
      studentBeneficiaries: this.schoolNeedsForm.get('beneficiaryStudents')?.value,
      personnelBeneficiaries: this.schoolNeedsForm.get('beneficiaryPersonnel')?.value,
      description: this.schoolNeedsForm.get('description')?.value,
      schoolId: this.authService.getSchoolId(),
    };
    console.log(newNeed);
    this.schoolNeedService.createSchoolNeed(newNeed).subscribe({
      next: (res) => console.log('Success:', res),
      error: (err) => console.error('Error:', err)
    });;
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

  private loadAllSchoolNeeds(): void {
    this.fetchAllSchoolNeeds().subscribe({
      next: (needs) => {
        this.schoolNeedsData = needs;
      },
      error: (err) => {
        console.error('Error fetching school needs:', err);
      }
    })
  }

  private loadCurrentProjects(): void {
    this.fetchProjects().subscribe({
      next: (projects) => {
        this.projectsData = projects;
      },
      error: (err) => {
        console.error('Error fetching projects:', err);
      }
    });
  }

  private fetchAllSchoolNeeds(
    page= 1,
    size = 1000,
    acc: any[] = []
  ): Observable<any[]> {
    const sy = this.selectedSchoolYear;
    return this.schoolNeedService.getSchoolNeeds(page, size, sy).pipe(
      switchMap(res => {
        const currentData = res?.data ?? [];
        const allData = [...acc, ...currentData];

        if(currentData.length < size) {
          return of(allData);
        }

        return this.fetchAllSchoolNeeds(page + 1, size, allData);
      })
    )
  }

  private fetchProjects(
    page = 1,
    size = 1000,
  ): Observable<any[]> {
    return this.aipService.getAips(page, size).pipe(
      map(response => response.data)
    );
  }

  protected onUnitChange(selectedUnit: string): void {
    this.isOtherSelected = selectedUnit === 'Others (pls. specify)';
    if (!this.isOtherSelected) {
      this.schoolNeedsForm.get('otherUnit')?.reset();
    }
  }
}
