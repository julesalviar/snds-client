import {
  Component,
  ViewChild,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { ContributionDialogComponent } from '../stakeholders/contribution-dialog/contribution-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import { getSchoolYearOptions, getDefaultSchoolYear } from '../common/date-utils';
import { StakeholderProfileService } from '../common/services/stakeholder-profile.service';
import { Engagement } from '../common/model/engagement.model';
import {
  ContributionItem,
  ListStakeholderProfilesParams,
  StakeholderProfile,
} from '../common/model/stakeholder-profile.model';
import { AuthService } from '../auth/auth.service';
import { ReferenceDataService } from '../common/services/reference-data.service';
import { extractApiErrorMessage } from '../common/utils/division-lock.util';
import {
  getSectorNames,
  SECTOR_REF_DATA_KEY,
} from '../common/utils/sector-reference-data.util';

@Component({
  selector: 'app-stakeholders-profile',
  templateUrl: './stakeholders-profile.component.html',
  styleUrls: ['./stakeholders-profile.component.css'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    FormsModule,
    MatPaginator,
    MatDialogModule,
    MatSnackBarModule,
  ],
})
export class StakeholdersProfileComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  isLoading = true;
  isSchoolAdmin = this.authService.getActiveRole() === 'schoolAdmin';

  engagedCount = 0;
  notEngagedCount = 0;
  totalItems = 0;

  schoolYearOptions = ['All School Year', ...getSchoolYearOptions()];
  sectorOptions: string[] = ['All Sectors'];

  selectedSchoolYear = getDefaultSchoolYear();
  selectedSector = 'All Sectors';
  selectedEngagement = 'All';
  searchTerm = '';
  includeReferenceAccounts = false;

  displayedColumns: string[] = [
    'reference',
    'name',
    'sector',
    'contactNumber',
    'address',
    'engagementStatus',
    'actions',
  ];
  dataSource = new MatTableDataSource<StakeholderProfile>([]);
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 25, 50, 100];

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.selectedSector !== 'All Sectors' ||
      this.selectedSchoolYear !== 'All School Year' ||
      this.selectedEngagement !== 'All' ||
      this.includeReferenceAccounts
    );
  }

  constructor(
    private readonly dialog: MatDialog,
    private readonly stakeholderProfileService: StakeholderProfileService,
    private readonly authService: AuthService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadStakeholders();
      });

    void this.loadSectorOptions();
    this.loadStakeholders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadSectorOptions(): Promise<void> {
    await this.referenceDataService.initialize();
    const names = getSectorNames(
      this.referenceDataService.get(SECTOR_REF_DATA_KEY),
    );
    this.sectorOptions = ['All Sectors', ...names];
  }

  formatCell(value: string | undefined | null): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : '—';
  }

  openContributionDialog(row: StakeholderProfile): void {
    const schoolYearFilter =
      this.selectedSchoolYear === 'All School Year'
        ? undefined
        : this.selectedSchoolYear;

    const source = row.engagements ?? [];
    const filtered = schoolYearFilter
      ? source.filter((e) => e.schoolYear === schoolYearFilter)
      : source;

    const contributions: ContributionItem[] = filtered.map(
      (engagement: Engagement) => ({
        schoolYear: engagement.schoolYear || 'N/A',
        school: this.getSchoolName(engagement.schoolId),
        specificContribution: engagement.specificContribution || 'N/A',
        amount: engagement.amount
          ? `₱${engagement.amount.toLocaleString()}`
          : '₱0',
        movs: 'View Documents',
        images: this.getImagesFromEngagement(engagement),
      }),
    );

    this.dialog.open(ContributionDialogComponent, {
      width: '95vw',
      height: '50vh',
      maxWidth: '95vw',
      maxHeight: '50vh',
      panelClass: 'full-screen-dialog',
      data: { stakeholder: row, contributions },
    });
  }

  private getSchoolName(schoolId: unknown): string {
    if (!schoolId) {
      return 'No School ID';
    }

    if (typeof schoolId === 'string') {
      return 'School Name Not Available';
    }

    if (typeof schoolId === 'object' && schoolId !== null) {
      const school = schoolId as { schoolName?: string; division?: string };
      if (school.schoolName?.trim()) {
        return school.schoolName.trim();
      }
      if (school.division?.trim()) {
        return school.division.trim();
      }
    }

    return 'Unknown School';
  }

  private getImagesFromEngagement(engagement: Engagement): unknown[] {
    if (
      engagement.schoolNeedId &&
      typeof engagement.schoolNeedId === 'object' &&
      engagement.schoolNeedId.images
    ) {
      return engagement.schoolNeedId.images;
    }
    return [];
  }

  private buildListParams(): ListStakeholderProfilesParams {
    const params: ListStakeholderProfilesParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      includeReferenceAccounts: this.includeReferenceAccounts,
    };

    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    if (this.selectedSector !== 'All Sectors') {
      params.sector = this.selectedSector;
    }
    if (this.selectedSchoolYear !== 'All School Year') {
      params.schoolYear = this.selectedSchoolYear;
    }
    if (this.selectedEngagement === 'Engaged') {
      params.engaged = true;
    } else if (this.selectedEngagement === 'Not Engaged') {
      params.engaged = false;
    }

    return params;
  }

  loadStakeholders(): void {
    this.isLoading = true;

    this.stakeholderProfileService
      .listProfiles(this.buildListParams())
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.totalItems = res.meta.totalItems;
          this.dataSource = new MatTableDataSource<StakeholderProfile>(
            res.data ?? [],
          );
          this.refreshEngagementStatistics();
        },
        error: (error) => {
          this.totalItems = 0;
          this.dataSource = new MatTableDataSource<StakeholderProfile>([]);
          this.engagedCount = 0;
          this.notEngagedCount = 0;
          this.snackBar.open(
            extractApiErrorMessage(error, 'Failed to load stakeholder profiles.'),
            'Close',
            { duration: 5000, panelClass: ['error-snackbar'] },
          );
        },
      });
  }

  private refreshEngagementStatistics(): void {
    this.stakeholderProfileService
      .getStatistics({
        sector:
          this.selectedSector === 'All Sectors'
            ? undefined
            : this.selectedSector,
        schoolYear:
          this.selectedSchoolYear === 'All School Year'
            ? undefined
            : this.selectedSchoolYear,
        includeReferenceAccounts: this.includeReferenceAccounts,
      })
      .subscribe({
        next: (res) => {
          if (res?.success && res.data) {
            this.engagedCount = res.data.engaged ?? 0;
            this.notEngagedCount = res.data.notEngaged ?? 0;
          }
        },
        error: () => {
          this.engagedCount = 0;
          this.notEngagedCount = 0;
        },
      });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onSchoolYearChange(): void {
    this.pageIndex = 0;
    this.loadStakeholders();
  }

  onSectorChange(): void {
    this.pageIndex = 0;
    this.loadStakeholders();
  }

  onEngagementChange(): void {
    this.pageIndex = 0;
    this.loadStakeholders();
  }

  onReferenceAccountsChange(): void {
    this.pageIndex = 0;
    this.loadStakeholders();
  }

  clearFilters(): void {
    this.selectedSchoolYear = 'All School Year';
    this.selectedSector = 'All Sectors';
    this.selectedEngagement = 'All';
    this.searchTerm = '';
    this.includeReferenceAccounts = false;
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadStakeholders();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadStakeholders();
  }
}
