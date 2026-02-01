import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatCellDef, MatHeaderCell, MatHeaderCellDef, MatHeaderRow, MatHeaderRowDef, MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

interface OfficeTableData {
    kra: string;
    programTitle: string;
    activity: string;
    ppaObjective: string;
    fivePointReformAgenda: string;
    projectChampClassification: string;
    expectedOutput: string;
    dateOfImplementation: Date;
    budgetaryRequirements: number;
    materialsSupplies: string;
    fundSource: string;
    participants: string;
    supportNeededFromStakeholders: string;
    supportReceivedFromStakeholders: string;
    stakeholdersName: string;
    amountUtilized: number;
    variance: number;
    percentageUtilization: number;
    implementationStatus: string;
    remarks: string;
    hinderingFacilitatingFactors: string;
    accomplishmentReport: string;
}

@Component({
    selector: 'app-office-table',
    standalone: true,
    imports: [
        CommonModule,
        MatHeaderCell,
        MatCellDef,
        MatProgressBar,
        MatHeaderCellDef,
        MatHeaderRow,
        MatHeaderRowDef,
        MatTableModule,
        MatIcon,
        MatFormField,
        MatSelect,
        MatOption,
        MatLabel,
        MatInputModule,
        FormsModule,
        MatDatepicker,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './office-table.component.html',
    styleUrls: ['./office-table.component.css']
})

export class OfficeTableComponent implements OnInit {
    divisionTitle: string | null = null;
    subjectTitle: string | null = null;
    officeTableData: OfficeTableData[] = [];
    filteredOfficeTableData: MatTableDataSource<OfficeTableData>;
    isLoading: boolean = true;
    selectedRowIndex: number | null = null;
    isCustomRangeVisible: boolean = true;

    filters = {
        startDate: null,
        endDate: null,
        dateRangeOption: 'custom', 
        projectChampClassification: '',
        fundSource: '',
        implementationStatus: '',
        timeliness: '',
        yearRange: '',
        remarks: '',
        fivePointReformAgenda: ''
    };

    constructor(private route: ActivatedRoute) {
        this.filteredOfficeTableData = new MatTableDataSource(this.officeTableData);
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.divisionTitle = params['division'];
            this.subjectTitle = params['subject'];
        });
        this.fetchOfficeTableData();
    }

    fetchOfficeTableData(): void {
        // Simulated async data fetch/Sample data
        setTimeout(() => {
            this.officeTableData = [
                {
                    kra: 'KRA 1',
                    programTitle: 'Program Title 1',
                    activity: 'Activity 1',
                    ppaObjective: 'Objective 1',
                    fivePointReformAgenda: 'Enabling Learning Environment',
                    projectChampClassification: 'GOLD (Enabling Environment)',
                    expectedOutput: 'Output 1',
                    dateOfImplementation: new Date('2026-01-01'),
                    budgetaryRequirements: 100000,
                    materialsSupplies: 'Meals',
                    fundSource: 'CO',
                    participants: 'SPTA',
                    supportNeededFromStakeholders: 'Support Needed',
                    supportReceivedFromStakeholders: 'Support Received',
                    stakeholdersName: 'Stakeholder 1',
                    amountUtilized: 75000,
                    variance: 25000,
                    percentageUtilization: 75,
                    implementationStatus: 'Completed',
                    remarks: 'On-time',
                    hinderingFacilitatingFactors: 'Factors 1',
                    accomplishmentReport: 'Report 1',
                },
                {
                    kra: 'KRA 2',
                    programTitle: 'Program Title 1',
                    activity: 'Activity 1',
                    ppaObjective: 'Objective 1',
                    fivePointReformAgenda: 'Learner Well-being',
                    projectChampClassification: 'SAFE (Well-being of Learners)',
                    expectedOutput: 'Output 1',
                    dateOfImplementation: new Date('2026-12-31'),
                    budgetaryRequirements: 100000,
                    materialsSupplies: 'Office Supplies',
                    fundSource: 'PSF',
                    participants: 'Division Personnel',
                    supportNeededFromStakeholders: 'Support Needed',
                    supportReceivedFromStakeholders: 'Support Received',
                    stakeholdersName: 'Stakeholder 1',
                    amountUtilized: 75000,
                    variance: 25000,
                    percentageUtilization: 75,
                    implementationStatus: 'For Implementation',
                    remarks: 'On-time',
                    hinderingFacilitatingFactors: 'Factors 1',
                    accomplishmentReport: 'Report 1',
                },
                {
                    kra: 'KRA 3',
                    programTitle: 'Program Title 3',
                    activity: 'Activity 1',
                    ppaObjective: 'Objective 1',
                    fivePointReformAgenda: 'Teacher Welfare',
                    projectChampClassification: 'COACH (Welfare of Teachers)',
                    expectedOutput: 'Output 1',
                    dateOfImplementation: new Date('2027-01-01'),
                    budgetaryRequirements: 100000,
                    materialsSupplies: 'Venue',
                    fundSource: 'SDO',
                    participants: 'Teachers',
                    supportNeededFromStakeholders: 'Support Needed',
                    supportReceivedFromStakeholders: 'Support Received',
                    stakeholdersName: 'Stakeholder 1',
                    amountUtilized: 75000,
                    variance: 25000,
                    percentageUtilization: 75,
                    implementationStatus: 'Ongoing',
                    remarks: 'Delayed',
                    hinderingFacilitatingFactors: 'Factors 1',
                    accomplishmentReport: 'Report 1',
                }
            ];
            this.filteredOfficeTableData.data = this.officeTableData; // Initialize with original data
            this.isLoading = false;
        }, 1000);
    }

    applyFilter(): void {
        let filteredData = this.officeTableData;
        

        // Apply Year Range filter
        if (this.filters.yearRange) {
            const [startYear, endYear] = this.filters.yearRange.split('-').map(Number);
            const startDateRange = new Date(startYear, 0, 1); // January 1st of the start year
            const endDateRange = new Date(endYear, 11, 31); // December 31st of the end year

            filteredData = filteredData.filter(item => {
                const dateOfImplementation = new Date(item.dateOfImplementation);
                return dateOfImplementation >= startDateRange && dateOfImplementation <= endDateRange;
            });
        }

        // Handle date range option filtering
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        if (this.filters.dateRangeOption === 'custom') {
        startDate = this.filters.startDate ? new Date(this.filters.startDate) : null;
        endDate = this.filters.endDate ? new Date(this.filters.endDate) : null;
    }

        const today = new Date();
        switch (this.filters.dateRangeOption) {
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'thisQuarter':
                const quarterStart = Math.floor(today.getMonth() / 3) * 3;
                startDate = new Date(today.getFullYear(), quarterStart, 1);
                endDate = new Date(today.getFullYear(), quarterStart + 3, 0);
                break;
            case 'lastQuarter':
                const lastQuarterStart = Math.floor((today.getMonth() - 3) / 3) * 3;
                startDate = new Date(today.getFullYear(), lastQuarterStart, 1);
                endDate = new Date(today.getFullYear(), lastQuarterStart + 3, 0);
                break;
            case 'thisYear':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 12, 0);
                break;
            case 'lastYear':
                startDate = new Date(today.getFullYear() - 1, 0, 1);
                endDate = new Date(today.getFullYear(), 0, 0);
                break;
            case 'last3Months':
                startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                endDate = today;
                break;
            case 'last6Months':
                startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
                endDate = today;
                break;
            case 'custom':
                startDate = this.filters.startDate ? new Date(this.filters.startDate) : null;
                endDate = this.filters.endDate ? new Date(this.filters.endDate) : null;
                break;
        }

        // If we have valid start and end dates, filter the data
        if (startDate && endDate) {
            filteredData = filteredData.filter(item => {
                const dateOfImplementation = new Date(item.dateOfImplementation);
                return dateOfImplementation >= startDate && dateOfImplementation <= endDate;
            });
        }

        // Apply other filters 
        if (this.filters.timeliness) {
            filteredData = filteredData.filter(item => item.remarks === this.filters.timeliness);
        }
        if (this.filters.fivePointReformAgenda) {
            filteredData = filteredData.filter(item => item.fivePointReformAgenda.includes(this.filters.fivePointReformAgenda));
        }
        if (this.filters.projectChampClassification) {
            filteredData = filteredData.filter(item => item.projectChampClassification.includes(this.filters.projectChampClassification));
        }
        if (this.filters.fundSource) {
            filteredData = filteredData.filter(item => item.fundSource.includes(this.filters.fundSource));
        }
        if (this.filters.implementationStatus) {
            filteredData = filteredData.filter(item => item.implementationStatus.includes(this.filters.implementationStatus));
        }
        this.filteredOfficeTableData.data = filteredData;
    }

    clearFilters(): void {
        this.filters = {
            startDate: null,
            endDate: null,
            dateRangeOption: 'custom',
            projectChampClassification: '',
            fundSource: '',
            implementationStatus: '',
            timeliness: '',
            yearRange: '',
            remarks: '',
            fivePointReformAgenda: ''
        };

        this.applyFilter();
    }

    updateDateRangeOption(): void {
        this.isCustomRangeVisible = this.filters.dateRangeOption === 'custom';
        if (!this.isCustomRangeVisible) {
            this.filters.startDate = null;
            this.filters.endDate = null;
        }
        this.applyFilter();
    }

    onRowClicked(index: number): void {
        this.selectedRowIndex = index;
    }
}