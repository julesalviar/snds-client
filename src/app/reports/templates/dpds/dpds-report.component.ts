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
  selector: 'app-dpds-report',
  standalone: true,
  templateUrl: './dpds-report.component.html',
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
  styleUrls: ['./dpds-report.component.css', '../../reports.component.css']
})
export class DpdsReportComponent {
  protected data: any[] = [];
  protected template: any;
  protected displayedColumns: string[] = [];

  constructor(
    @Optional() @Inject('REPORT_DATA') reportData?: any[],
    @Optional() @Inject('REPORT_TEMPLATE') reportTemplate?: any
  ) {
    this.data = reportData ?? [];
    this.template = reportTemplate ?? {};
    this.displayedColumns = this.template?.table?.columns?.map((c: any) => c.field) || [];
  }
}
