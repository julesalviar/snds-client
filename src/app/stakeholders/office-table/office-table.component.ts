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
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { PpaPlan } from '../../common/model/ppa-plan.model';
import { PLAN_CLASSIFICATION } from '../../common/enums/plan-classification.enum';
import { PLAN_IMPLEMENTATION_STATUS } from '../../common/enums/plan-implementation-status.enum';

interface OfficeTableData {
    kra: string;
    programTitle: string;
    activity: string;
    ppaObjective: string;
    fivePointReformAgenda: string;
    projectChampClassification: string;
    expectedOutput: string;
    dateOfImplementation: Date;
    venue: string;
    budgetaryRequirements: number;
    fundSource: string;
    participants: string;
    supportNeededFromStakeholders: string;
    supportReceivedFromStakeholders: number | null;
    stakeholdersName: string;
    responsiblePerson: string;
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
        FormsModule
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

    filters = {
        classification: '',
        fundSource: '',
        implementationStatus: '',
        remarks: ''
    };

    readonly implementationStatusOptions = ['', ...PLAN_IMPLEMENTATION_STATUS];

    get classificationOptions(): (string | (typeof PLAN_CLASSIFICATION)[number])[] {
        const opts = ['', ...PLAN_CLASSIFICATION];
        return opts.sort((a, b) => {
            if (!a) return -1;
            if (!b) return 1;
            return this.classificationDisplay.getDisplayText(a).localeCompare(this.classificationDisplay.getDisplayText(b));
        });
    }

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
            venue: plan.venue ?? '',
            budgetaryRequirements,
            fundSource: plan.fundSource ?? '',
            participants: Array.isArray(plan.participants) ? plan.participants.join(', ') : '',
            supportNeededFromStakeholders: plan.supportNeed ?? '',
            supportReceivedFromStakeholders: plan.supportReceivedValue ?? null,
            stakeholdersName: this.getStakeholderDisplay(plan.stakeholderUserId),
            responsiblePerson: this.getAssignedUserDisplay(plan.assignedUserId),
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

        // Apply filters
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
            classification: '',
            fundSource: '',
            implementationStatus: '',
            remarks: ''
        };

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

    /** Display assigned user name (responsible person) from either id string or populated user object from API. */
    getAssignedUserDisplay(assignedUserId: string | { _id?: string; name?: string; userName?: string; email?: string } | null | undefined): string {
        if (assignedUserId == null) return '—';
        if (typeof assignedUserId === 'string') return '—';
        const u = assignedUserId as { name?: string; userName?: string; email?: string; _id?: string };
        return u?.name || u?.userName || u?.email || u?._id || '—';
    }
}
