import {Component, Inject, Optional} from "@angular/core";
import {
  MatCell, MatCellDef,
  MatColumnDef, MatHeaderCell, MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from "@angular/material/table";
import {NgForOf} from "@angular/common";

@Component({
  selector: 'app-budget-report',
  standalone: true,
  templateUrl: './budget-report.component.html',
  imports: [
    MatTable,
    MatColumnDef,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRow,
    MatRowDef,
    MatCell,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCellDef,
    NgForOf
  ],
  styleUrls: ['./budget-report.component.css', '../../reports.component.css']
})
export class BudgetReportComponent {
  protected data: any[] = [];
  protected template: any;
  protected displayedColumns: string[] = [];

  constructor(
    @Optional() @Inject('REPORT_DATA') reportData?: any[],
    @Optional() @Inject('REPORT_TEMPLATE') reportTemplate?: any
  ) {
    // Use injected data and template, or fallback to sample data
    this.data = reportData || this.getSampleData();
    this.template = reportTemplate || this.getSampleTemplate();
    this.displayedColumns = this.template?.table?.columns?.map((c: any) => c.field) || [];
  }

  private getSampleTemplate() {
    return {
      "reportId": "budgetReport",
      "title": "Budget Allocation Report",
      "orientation": "portrait",
      "paperSize": "A4",
      "parameters": [
        {"name": "fiscalYear", "type": "text", "label": "Fiscal Year"},
        {"name": "department", "type": "text", "label": "Department"},
        {"name": "budgetType", "type": "text", "label": "Budget Type"}
      ],
      "reportType": "budget",
      "table": {
        "columns": [
          {"header": "Category", "field": "category"},
          {"header": "Allocated", "field": "allocated"},
          {"header": "Spent", "field": "spent"},
          {"header": "Remaining", "field": "remaining"},
          {"header": "Percentage", "field": "percentage"}
        ]
      }
    };
  }

  private getSampleData() {
    return [
      { category: "Personnel", allocated: "$500,000", spent: "$420,000", remaining: "$80,000", percentage: "84%" },
      { category: "Infrastructure", allocated: "$300,000", spent: "$180,000", remaining: "$120,000", percentage: "60%" },
      { category: "Equipment", allocated: "$200,000", spent: "$195,000", remaining: "$5,000", percentage: "97.5%" },
      { category: "Training & Development", allocated: "$150,000", spent: "$95,000", remaining: "$55,000", percentage: "63.3%" },
      { category: "Maintenance", allocated: "$100,000", spent: "$75,000", remaining: "$25,000", percentage: "75%" },
      { category: "Utilities", allocated: "$80,000", spent: "$78,000", remaining: "$2,000", percentage: "97.5%" },
      { category: "Supplies", allocated: "$70,000", spent: "$45,000", remaining: "$25,000", percentage: "64.3%" },
      { category: "Other Expenses", allocated: "$50,000", spent: "$32,000", remaining: "$18,000", percentage: "64%" }
    ];
  }
}

