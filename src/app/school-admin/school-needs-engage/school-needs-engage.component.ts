import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCard, MatCardTitle, MatCardContent, MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule, MatOption } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatButton } from "@angular/material/button";
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SchoolNeed } from "../../common/model/school-need.model";
import { UserService } from '../../common/services/user.service';
import { SharedDataService } from '../../common/services/shared-data.service';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import { SchoolNeedService } from '../../common/services/school-need.service';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule, MatRadioChange } from '@angular/material/radio';

@Component({
  selector: 'app-school-needs-engage',
  standalone: true,
  imports: [
    CommonModule,
    MatOption,
    MatInputModule,
    MatAutocompleteModule,
    FormsModule,
    MatNativeDateModule,
    MatTableModule,
    MatCard,
    MatCardTitle,
    MatTooltipModule,
    MatCardContent,
    MatCardModule,
    MatFormField,
    MatLabel,
    MatButton,
    MatRadioModule,
    MatDatepickerModule,
    MatDatepickerToggle,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './school-needs-engage.component.html',
  styleUrls: ['./school-needs-engage.component.css']
})
export class SchoolNeedsEngageComponent implements OnInit, OnDestroy {
  schoolNeed: SchoolNeed | undefined;
  needCode: string | null = null;
  stakeholder: any = null;
  moaDate: Date | null = null;
  quantity: number | null = null;
  unit: string = '';
  amount: number | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  // Additional fields
  isApplicable: boolean = false;
  stakeholderCount: number | null = null;
  selectedAgreement: string = '';
  signatoryName: string = '';
  signatoryDesignation: string = '';
  projectCategory: string = '';
  projectName: string = '';
  agreementStatus: string = '';
  initiatedBy: string = '';
  stakeholders: any[] = [];
  filteredStakeholders: any[] = [];
  readonly STAKEHOLDER_LIMIT = 50;

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

    get formIsValid(): boolean {
    return this.stakeholderCount !== null &&
           this.selectedAgreement !== '' &&
           this.signatoryName !== '' &&
           this.signatoryDesignation !== '' &&
           this.projectCategory !== '' &&
           this.agreementStatus !== '' &&
           this.initiatedBy !== '';
  }
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly sharedDataService: SharedDataService,
    private readonly userService: UserService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.needCode = this.route.snapshot.paramMap.get('code');
    if (this.needCode) {
      console.log('Engaging with need code:', this.needCode);
      this.loadSchoolNeed(this.needCode);
    }

    this.loadStakeholders();
    this.setupDebouncedSearch();
  }

  loadStakeholders(): void {
    this.userService.getUsersByRole('stakeholder', undefined, this.STAKEHOLDER_LIMIT).subscribe({
      next: (stakeholders) => {
        this.stakeholders = stakeholders;
        this.filteredStakeholders = stakeholders;
        console.log(`Loaded ${stakeholders.length} stakeholders (limited to ${this.STAKEHOLDER_LIMIT}):`, stakeholders);
      },
      error: (error) => {
        console.error('Error loading stakeholders:', error);
        // Fallback to empty array if API fails
        this.stakeholders = [];
        this.filteredStakeholders = [];
      }
    });
  }

  onToggleChange(event: MatRadioChange): void {
    this.isApplicable = event.value == 'true';
  }


  loadSchoolNeed(code: string): void {
    this.schoolNeedService.getSchoolNeedByCode(code).pipe(takeUntil(this.destroy$)).subscribe({
      next: (need) => {
        if (need) {
          console.log('Loaded school need:', need);
          this.unit = need.unit ?? '';
          this.schoolNeed = need;
        }
      },
      error: (error) => {
        console.error('Error loading school need:', error);
        this.showErrorNotification('Failed to load school need details. Please try again.');
      }
    });
  }

  setupDebouncedSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only emit if the value has changed
      takeUntil(this.destroy$) // Clean up subscription when component is destroyed
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onStakeholderInput(event: any): void {
    const value = event.target.value;
    this.searchSubject.next(value);
  }

  performSearch(searchTerm: string): void {
    if (searchTerm && searchTerm.length > 0) {
      // Use server-side search with limit
      this.userService.getUsersByRole('stakeholder', searchTerm, this.STAKEHOLDER_LIMIT).subscribe({
        next: (stakeholders) => {
          this.filteredStakeholders = stakeholders;
          console.log(`Found ${stakeholders.length} stakeholders matching "${searchTerm}" (limited to ${this.STAKEHOLDER_LIMIT})`);
        },
        error: (error) => {
          console.error('Error searching stakeholders:', error);
          this.filteredStakeholders = [];
        }
      });
    } else {
      // If no search term, show all stakeholders
      this.filteredStakeholders = this.stakeholders;
    }
  }

  displayFn(stakeholder: any): string {
    return stakeholder?.name ?? '';
  }

  private showSuccessNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showErrorNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  validateForm(): boolean {
    return this.stakeholderCount !== null &&
           this.selectedAgreement !== '' &&
           this.signatoryName.trim() !== '' &&
           this.signatoryDesignation !== '' &&
           this.projectCategory !== '' &&
           this.agreementStatus !== '' &&
           this.initiatedBy !== '';
  }

  saveEngagement(): void {
    if (this.isApplicable && !this.validateForm()) {
      this.showErrorNotification('Please fill out all required fields before engaging.');
      return;
    }

    if (this.needCode) {
      const engagementData = {
        stakeholderUserId: this.stakeholder._id,
        // stakeholderCount: this.stakeholderCount,
        // selectedAgreement: this.selectedAgreement,
        // signatoryName: this.signatoryName,
        // signatoryDesignation: this.signatoryDesignation,
        // projectCategory: this.projectCategory,
        // projectName: this.projectName,
        // agreementStatus: this.agreementStatus,
        // initiatedBy: this.initiatedBy,
        signingDate: this.moaDate,
        unit: this.unit,
        amount: this.amount,
        startDate: this.startDate,
        endDate: this.endDate,
        quantity: this.quantity,
        schoolNeedCode: +this.needCode,
      };

      this.schoolNeedService.engageSchoolNeed(engagementData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Engagement saved successfully:', response);
            this.sharedDataService.updateEngagementStatus(this.needCode!, true);
            this.clearForm();
            this.showSuccessNotification('Engagement saved successfully!');
            // Navigate back to the previous page after a short delay to show the notification
            setTimeout(() => {
              this.router.navigate(['/school-admin/school-needs']);
            }, 1500);
          },
          error: (error) => {
            console.error('Error saving engagement:', error);
            this.showErrorNotification('Failed to save engagement. Please try again.');
          }
        });
    }
  }

  clearForm(): void {
    this.stakeholder = null;
    this.moaDate = null;
    this.quantity = null;
    this.unit = '';
    this.amount = null;
    this.startDate = null;
    this.endDate = null;
    this.isApplicable = false;
    this.stakeholderCount = null;
    this.selectedAgreement = '';
    this.signatoryName = '';
    this.signatoryDesignation = '';
    this.projectCategory = '';
    this.projectName = '';
    this.agreementStatus = '';
    this.initiatedBy = '';
  }
}
