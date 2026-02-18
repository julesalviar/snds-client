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
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { PpaPlan } from '../../common/model/ppa-plan.model';
import { PLAN_CLASSIFICATION } from '../../common/enums/plan-classification.enum';

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
    supportReceivedFromStakeholders: number | null;
    stakeholdersName: string;
    amountUtilized: number;
    variance: number;
    percentageUtilization: number;
    implementationStatus: string;
    remarks: string;
    hinderingFacilitatingFactors: string;
    accomplishmentReportUrls: string[];
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
        classification: '',
        fundSource: '',
        implementationStatus: '',
        timeliness: '',
        yearRange: '',
        remarks: ''
    };

    readonly classificationOptions = ['', ...PLAN_CLASSIFICATION];

    constructor(
        private route: ActivatedRoute,
        private ppaPlanService: PpaPlanService,
        public readonly classificationDisplay: PlanClassificationDisplayService
    ) {
        this.filteredOfficeTableData = new MatTableDataSource(this.officeTableData);
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.divisionTitle = params['division'];
            this.subjectTitle = params['subject'];
            this.fetchOfficeTableData(params['officeId']);
        });
    }

    fetchOfficeTableData(officeId?: string): void {
        this.isLoading = true;
        const params: { limit: number; officeId?: string } = { limit: 1000 };
        if (officeId?.trim()) {
            params.officeId = officeId.trim();
        }
        this.ppaPlanService.getList(params).subscribe({
            next: (res) => {
                this.officeTableData = res.data.map((plan) => this.mapPpaPlanToOfficeTableData(plan));
                this.filteredOfficeTableData.data = this.officeTableData;
                this.isLoading = false;
            },
            error: () => {
                this.officeTableData = [];
                this.filteredOfficeTableData.data = [];
                this.isLoading = false;
            }
        });
    }

    private mapPpaPlanToOfficeTableData(plan: PpaPlan): OfficeTableData {
        const budgetaryRequirements = plan.budgetaryRequirement ?? 0;
        const amountUtilized = plan.amountUtilized ?? 0;
        const variance = budgetaryRequirements - amountUtilized;
        const percentageUtilization = budgetaryRequirements > 0
            ? Math.round((amountUtilized / budgetaryRequirements) * 100)
            : 0;

        const dateOfImplementation = plan.implementationStartDate
            ? new Date(plan.implementationStartDate)
            : plan.implementationEndDate
                ? new Date(plan.implementationEndDate)
                : new Date(0);

        return {
            kra: plan.kra ?? '',
            programTitle: plan.title ?? '',
            activity: plan.activity ?? '',
            ppaObjective: plan.objective ?? '',
            fivePointReformAgenda: plan.classification ?? '',
            projectChampClassification: plan.classification ?? '',
            expectedOutput: plan.expectedOutput ?? '',
            dateOfImplementation,
            budgetaryRequirements,
            materialsSupplies: plan.materialsAndSupplies ?? '',
            fundSource: plan.fundSource ?? '',
            participants: Array.isArray(plan.participants) ? plan.participants.join(', ') : '',
            supportNeededFromStakeholders: plan.supportNeed ?? '',
            supportReceivedFromStakeholders: plan.supportReceivedValue ?? null,
            stakeholdersName: this.getStakeholderDisplay(plan.stakeholderUserId),
            amountUtilized,
            variance,
            percentageUtilization,
            implementationStatus: plan.implementationStatus ?? '',
            remarks: plan.timeliness ?? '',
            hinderingFacilitatingFactors: plan.factors ?? '',
            accomplishmentReportUrls: Array.isArray(plan.reportUrls) ? plan.reportUrls : [],
        };
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
        if (this.filters.classification) {
            filteredData = filteredData.filter(item => item.fivePointReformAgenda === this.filters.classification);
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
            classification: '',
            fundSource: '',
            implementationStatus: '',
            timeliness: '',
            yearRange: '',
            remarks: ''
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

    getClassificationDisplay(classification: string): string {
        return this.classificationDisplay.getDisplayText(classification) || '';
    }

    /** Display stakeholder name from either id string or populated user object from API. */
    getStakeholderDisplay(stakeholderUserId: string | { _id?: string; name?: string; userName?: string; email?: string } | null | undefined): string {
        if (stakeholderUserId == null) return '—';
        if (typeof stakeholderUserId === 'string') return stakeholderUserId || '—';
        const u = stakeholderUserId as { name?: string; userName?: string; email?: string; _id?: string };
        return u?.name || u?.userName || u?.email || u?._id || '—';
    }

    getReportLinkLabel(urls: string[], index: number): string {
        if (urls.length <= 1) return 'Download';
        return `Report ${index + 1}`;
    }
}