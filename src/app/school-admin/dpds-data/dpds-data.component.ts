import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatDatepicker, MatDatepickerToggle, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

type SectionKey = 'school' | 'contribution' | 'partnership';
type ColumnVisibility = Record<string, boolean>;

@Component({
  selector: 'app-dpds-data',
  standalone: true,
  templateUrl: './dpds-data.component.html',
  styleUrls: ['./dpds-data.component.css'],
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    DatePipe,
    MatSelect,
    MatOption,
    MatFormField,
    MatLabel,
    MatDatepicker,
    MatDatepickerToggle,
    MatDatepickerModule,
    MatNativeDateModule
  ],
})
export class DpdsDataComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /*FILTER STATE*/
  filterType: 'schoolYear' | 'dateRange' | null = null;
  schoolYears: string[] = ['2024-2025', '2025-2026', '2026-2027'];
  selectedSchoolYear: string | null = null;

  dateRangeType: 'period' | 'custom' | null = null;
  selectedPeriod: string | null = null;

  periodOptions = [
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'lastQuarter', label: 'Last Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'last3Months', label: 'Last 3 Months' },
    { value: 'last6Months', label: 'Last 6 Months' }
  ];
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;
  originalData = []; // original dataset
  filteredData = []; // Data to be displayed

  sectorOptions = [
    { value: 'Private Sector', label: 'Private Sector' },
    { value: 'Public Sector', label: 'Public Sector' },
    { value: 'Civil Society Organization', label: 'Civil Society Organization' },
    { value: 'International', label: 'International' }
  ];

  selectedSector: string[] = [];

  /*DISPLAYED COLUMNS*/
  schoolPartnersDisplayedColumns: string[] = [
    'generalPartnerType',
    'specificPartnerType',
    'remarks',
    'partnerName',
    'partnerContactDetails'
  ];

  partnersContributionDisplayedColumns: string[] = [
    'contributionType',
    'specificContributionType',
    'unitOfContribution',
    'quantityContributed',
    'actualAmountValue',
    'noOfBeneficiaryLearners',
    'noOfBeneficiaryPersonnel'
  ];

  partnershipAgreementsDisplayedColumns: string[] = [
    'formOfAgreement',
    'signatoryName',
    'signatoryDesignation',
    'agreementStartDate',
    'agreementEndDate',
    'projectCategory',
    'projectName',
    'statusOfAgreement',
    'remarks',
    'initiatedBy'
  ];

  /*COLUMN VISIBILITY*/
  columnsVisible: Record<SectionKey, ColumnVisibility> = {
    school: {
      generalPartnerType: true,
      specificPartnerType: true,
      remarks: true,
      partnerName: true,
      partnerContactDetails: true
    },
    contribution: {
      contributionType: true,
      specificContributionType: true,
      unitOfContribution: true,
      quantityContributed: true,
      actualAmountValue: true,
      noOfBeneficiaryLearners: true,
      noOfBeneficiaryPersonnel: true
    },
    partnership: {
      formOfAgreement: true,
      signatoryName: true,
      signatoryDesignation: true,
      agreementStartDate: true,
      agreementEndDate: true,
      projectCategory: true,
      projectName: true,
      statusOfAgreement: true,
      remarks: true,
      initiatedBy: true
    }
  };

  /*SAMPLE DATA*/
  private schoolPartnersRaw = [
    {
      generalPartnerType: 'Government',
      specificPartnerType: 'Local Government Unit',
      remarks: 'Active Partner',
      partnerName: 'Any LGU',
      partnerContactDetails: 'lgu.qc@partner.gov',
      schoolYear: '2023-2024',
      sector: 'Government'
    },
    {
      generalPartnerType: 'Private',
      specificPartnerType: 'Non-Profit Organization',
      remarks: 'Pending MOA',
      partnerName: 'Any Org',
      partnerContactDetails: 'info@any.org',
      schoolYear: '2024-2025',
      sector: 'NGO'
    }
  ];

  private partnersContributionRaw = [
    {
      contributionType: 'Construction',
      specificContributionType: 'Cement',
      unitOfContribution: 'Sacks',
      quantityContributed: 10,
      actualAmountValue: 50000,
      noOfBeneficiaryLearners: 250,
      noOfBeneficiaryPersonnel: 20,
      schoolYear: '2023-2024',
      sector: 'Government'
    }
  ];

  private partnershipAgreementsRaw = [
    {
      formOfAgreement: 'MOA',
      signatoryName: 'Juan Dela Cruz',
      signatoryDesignation: 'Schools Division Superintendent',
      agreementStartDate: new Date(2024, 0, 1),
      agreementEndDate: new Date(2026, 11, 31),
      projectCategory: 'Education Development',
      projectName: 'Reading Enhancement Program',
      statusOfAgreement: 'Active',
      remarks: 'Ongoing implementation',
      initiatedBy: 'Department of Education',
      schoolYear: '2023-2024',
      sector: 'Government'
    }
  ];

  /* DATA SOURCES*/
  schoolPartnersData = new MatTableDataSource(this.schoolPartnersRaw);
  partnersContributionData = new MatTableDataSource(this.partnersContributionRaw);
  partnershipAgreementsData = new MatTableDataSource(this.partnershipAgreementsRaw);

  selectedRowIndex: number | null = null;

  onRowClicked(index: number): void {
    this.selectedRowIndex = index;
  }

  ngAfterViewInit(): void {
    this.schoolPartnersData.paginator = this.paginator;
    this.partnersContributionData.paginator = this.paginator;
    this.partnershipAgreementsData.paginator = this.paginator;

    this.applyGlobalFilter();
  }

  onFilterTypeChange(): void {
    this.resetDateFilters();
    this.applyGlobalFilter();
  }

  onSchoolYearChange(year: string): void {
    this.selectedSchoolYear = year;
    this.applyGlobalFilter();
  }

  onDateRangeTypeChange(): void {
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
    this.applyGlobalFilter();
  }

  onPeriodChange(): void {
    this.applyGlobalFilter();
  }

  onCustomDateChange(): void {
    this.applyGlobalFilter();
  }

  onSectorChange(sectors: string[]): void {
    this.selectedSector = sectors;
    this.applyGlobalFilter();
  }

  clearFilters(): void {
    this.filterType = null;
    this.selectedSchoolYear = null;
    this.dateRangeType = null;
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
    this.selectedSector = [];

    this.applyGlobalFilter();
  }

  /*GLOBAL FILTER Applies in all tables*/
  applyGlobalFilter(): void {
    const filterPayload = JSON.stringify({
      filterType: this.filterType,
      schoolYear: this.selectedSchoolYear,
      dateRangeType: this.dateRangeType,
      selectedPeriod: this.selectedPeriod,
      customStartDate: this.customStartDate,
      customEndDate: this.customEndDate,
      sectors: this.selectedSector
    });

    [this.schoolPartnersData,
     this.partnersContributionData,
     this.partnershipAgreementsData].forEach(ds => {
      ds.filterPredicate = this.globalFilterPredicate;
      ds.filter = filterPayload;
      ds.paginator?.firstPage();
    });
  }

  globalFilterPredicate = (data: any, filter: string): boolean => {
    const f = JSON.parse(filter);

    if (f.schoolYear && data.schoolYear !== f.schoolYear) {
      return false;
    }

    if (f.sectors?.length && !f.sectors.includes(data.sector)) {
      return false;
    }

    if (f.filterType === 'dateRange' && data.agreementStartDate) {
      const date = new Date(data.agreementStartDate);

      if (f.selectedPeriod) {
        const days = Number(f.selectedPeriod);
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        if (date < limit) return false;
      }

      if (f.customStartDate && date < new Date(f.customStartDate)) {
        return false;
      }

      if (f.customEndDate && date > new Date(f.customEndDate)) {
        return false;
      }
    }

    return true;
  };

  /*COLUMN TOGGLE*/
  toggleSingleColumn(section: SectionKey, column: string): void {
    this.columnsVisible[section][column] = !this.columnsVisible[section][column];
  }

  getVisibleColumns(section: SectionKey): string[] {
    return Object.keys(this.columnsVisible[section])
      .filter(col => this.columnsVisible[section][col]);
  }

  private resetDateFilters(): void {
    this.dateRangeType = null;
    this.selectedPeriod = null;
    this.customStartDate = null;
    this.customEndDate = null;
  }
}