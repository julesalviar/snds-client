import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {MatNativeDateModule, MatOption} from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { UserService } from '../common/services/user.service';
import {forkJoin, lastValueFrom, map, Observable, of, Subject, switchMap, takeUntil} from "rxjs";
import {SchoolNeedService} from "../common/services/school-need.service";
import {getSchoolYear} from "../common/date-utils";
import {AipService} from "../common/services/aip.service";
import {Aip} from "../common/model/aip.model";
import {SchoolNeed} from "../common/model/school-need.model";
import {AuthService} from "../auth/auth.service";
import {MatProgressBar} from "@angular/material/progress-bar";
import {HttpService} from "../common/services/http.service";
import {API_ENDPOINT} from "../common/api-endpoints";
import {ReferenceDataService} from "../common/services/reference-data.service";


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
    MatAutocompleteModule,
    MatOption,
    CommonModule,
    MatCardTitle,
    MatIcon,
    MatProgressBar
  ],
  templateUrl: './school-admin.component.html',
  styleUrls: ['./school-admin.component.css']
})
export class SchoolAdminComponent implements OnInit, OnDestroy {
  schoolNeedsForm: FormGroup;
  schoolNeedsData: any[] = [];
  projectsData: Aip[] = [];
  private readonly destroy$ = new Subject<void>();

  displayedColumns: string[] = ['contributionType', 'specificContribution', 'quantityNeeded', 'estimatedCost', 'targetDate', 'actions'];
  aipProjects: string[] = [];  // Populate AIP project names/ must be base on AIP form filled up
  pillars = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  schoolYears: string[] = ['2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022', '2020-2021', '2019-2020', '2018-2019'];
  units: string[] = ['Bottles', 'Boxes', 'Classrooms', 'Feet', 'Gallons', 'Hectares', 'Hours', 'Learners', 'Lots', 'Months', 'Non-Teaching Personnel', 'Pieces', 'Reams', 'Rolls', 'Sacks', 'Sheets', 'Spans', 'Teaching Personnel', 'Units', 'Others (pls. specify)']
  selectedSchoolYear: string = getSchoolYear();
  selectedContribution: any;
  isOtherSelected = false;
  previewImages: Array<{ file: File; dataUrl: string | ArrayBuffer | null; uploading: boolean; progress: number; } > = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  contributionTypes: string[] = [];
  specificContributions: string[] = [];
  filteredContributionTypes: string[] = [];
  filteredSpecificContributions: string[] = [];
  contributionTreeData: any[] = [];
  previousContributionType: string = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly aipService: AipService,
    private readonly  authService: AuthService,
    private readonly httpService: HttpService,
    private readonly referenceDataService: ReferenceDataService,
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
      images: [[]],
    });
  }
  queryData(): void {
    this.loadAllSchoolNeeds();
    console.log('Load All School Needs');
  }

  ngOnInit(): void {
    this.loadAllSchoolNeeds();
    this.loadCurrentProjects();
    this.loadContributionData();
    this.userService.projectTitles$.pipe(takeUntil(this.destroy$)).subscribe(titles => {
      this.aipProjects = titles;
    });
    this.userService.currentContribution.pipe(takeUntil(this.destroy$)).subscribe(data => {
      if (data) {
        this.selectedContribution = data;
        this.schoolNeedsForm.patchValue({
          specificContribution: data.specificContribution,
          contributionType: data.name
        });
        this.previousContributionType = data.name;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    const uploadedImages = this.previewImages.length
      ? await this.uploadImages('school-needs')
      : [];

    console.log(uploadedImages);

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
      images: uploadedImages,
    };
    this.schoolNeedService.createSchoolNeed(newNeed).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.schoolNeedsForm.reset();
        this.previewImages = [];
        this.queryData();
      },
      error: (err) => console.error('Error creating school need:', err)
    });
  }
  viewResponses(need: any): void {
    console.log('Viewing responses for:', need);

  }
  editNeed(need: any): void {
    console.log('Editing need:', need);
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

  private loadContributionData(): void {
    const treeData = this.referenceDataService.get<any[]>('contributionTree');
    if (treeData) {
      this.contributionTreeData = treeData;
      this.contributionTypes = treeData.map(node => node.name);
      this.specificContributions = treeData.flatMap(node =>
        node.children ? node.children.map((child: any) => child.name) : []
      );
      this.filteredContributionTypes = [...this.contributionTypes];
      this.filteredSpecificContributions = [...this.specificContributions];
    }
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

  protected filterContributionTypes(value: string): void {
    const filterValue = value.toLowerCase();
    this.filteredContributionTypes = this.contributionTypes.filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }

  protected filterSpecificContributions(value: string): void {
    const filterValue = value.toLowerCase();
    const selectedContributionType = this.schoolNeedsForm.get('contributionType')?.value;

    let availableSpecificContributions = this.specificContributions;
    if (selectedContributionType) {
      availableSpecificContributions = this.getSpecificContributionsForType(selectedContributionType);
    }

    this.filteredSpecificContributions = availableSpecificContributions.filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }

  protected onContributionTypeChange(selectedType: string): void {
    if (this.previousContributionType !== selectedType) {
      this.schoolNeedsForm.get('specificContribution')?.setValue('');
    }

    this.previousContributionType = selectedType;

    if (selectedType) {
      this.specificContributions = this.getSpecificContributionsForType(selectedType);
    } else {
      this.specificContributions = this.contributionTreeData.flatMap(node =>
        node.children ? node.children.map((child: any) => child.name) : []
      );
    }

    this.filteredSpecificContributions = [...this.specificContributions];
  }

  protected onContributionTypeInput(value: string): void {
    if (!value || value.trim() === '') {
      this.onContributionTypeChange('');
    } else {
      this.previousContributionType = value;
    }
  }

  private getSpecificContributionsForType(contributionType: string): string[] {
    return this.contributionTreeData
      .find(node => node.name === contributionType)
      ?.children?.map((child: any) => child.name) ?? [];
  }

  protected onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;

    const selectionSeen = new Set<string>();

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') || file.size === 0) {
        console.warn('Invalid image skipped:', file.name);
        return;
      }

      const key = `${file.name}__${file.size}__${file.lastModified}`;

      const alreadyAdded = this.previewImages.some(img =>
        img?.file?.name === file.name &&
        img?.file?.size === file.size &&
        img?.file?.lastModified === file.lastModified
      ) || selectionSeen.has(key);

      if (alreadyAdded) {
        console.warn('Duplicate image ignored:', file.name);
        return;
      }

      selectionSeen.add(key);

      const reader = new FileReader();
      reader.onload = () => {
        this.previewImages.push({
          file,
          dataUrl: reader.result,
          uploading: false,
          progress: 0,
        });
      };
      reader.readAsDataURL(file);
    });
    (event.target as HTMLInputElement).value = '';
  }

  removeImage(index: number) {
    this.previewImages.splice(index, 1);
  }

  async uploadImages(category: string): Promise<any[]> {
    const uploadRequests = this.previewImages.map(img => {
      img.uploading = true;
      img.progress = 0;
      const formData = new FormData();
      formData.append('file', img.file);
      formData.append('category', category);

      return this.httpService.uploadFile(`${API_ENDPOINT.upload}/image`, formData).pipe(
        map(response => {
          img.uploading = false;
          img.progress = 100;
          return response;
        })
      );
    });

    if (uploadRequests.length === 0) {
      return [];
    }

    const results = await lastValueFrom(forkJoin(uploadRequests));
    this.schoolNeedsForm.get('images')?.setValue(results);
    return results;
  }
}
