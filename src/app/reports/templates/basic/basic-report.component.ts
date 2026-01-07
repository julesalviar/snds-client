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
import {NgForOf, NgIf} from "@angular/common";
import {DecimalPipe, DatePipe, CurrencyPipe, PercentPipe, LowerCasePipe, UpperCasePipe} from "@angular/common";
import {Report, ReportTemplate, ReportTemplateParameter} from "../../../common/model/report.model";

@Component({
  selector: 'app-basic-report',
  standalone: true,
  templateUrl: './basic-report.component.html',
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
    NgForOf,
    NgIf
  ],
  styleUrls: ['./basic-report.component.css', '../../reports.component.css']
})
export class BasicReportComponent {
  protected data: any[] = [];
  protected template: ReportTemplate | undefined;
  protected title: string = '';
  protected displayedColumns: string[] = [];
  protected isLoading: boolean = false;

  private decimalPipe = new DecimalPipe('en-US');
  private datePipe = new DatePipe('en-US');
  private currencyPipe = new CurrencyPipe('en-US');
  private percentPipe = new PercentPipe('en-US');
  private lowerCasePipe = new LowerCasePipe();
  private upperCasePipe = new UpperCasePipe();

  constructor(
    @Optional() @Inject('REPORT_DATA') reportData?: any[],
    @Optional() @Inject('REPORT') report?: Report,
    @Optional() @Inject('IS_LOADING') isLoading?: boolean
  ) {
    this.data = reportData ?? [];
    this.template = report?.reportTemplateId;
    this.title = report?.title ?? '';
    this.displayedColumns = this.template?.table?.columns?.map((c: any) => c.field) || [];
    this.isLoading = isLoading ?? false;
  }

  getNestedValue(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }

    // Split the path by dots and navigate through the object
    return path.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : undefined;
    }, obj);
  }

  applyPipe(value: any, pipeConfig: string | undefined): any {
    if (!pipeConfig || value === null || value === undefined) {
      return value;
    }

    // Parse pipe configuration: "number: '1.0-2'" or "date: 'short'" or "currency: 'PHP':'symbol': '1.2-2'"
    const parts = pipeConfig.split(':').map(s => s.trim());
    const pipeName = parts[0];

    try {
      switch (pipeName.toLowerCase()) {
        case 'number':
        case 'decimal': {
          const pipeArgs = parts.slice(1).join(':').trim();
          const cleanArgs = pipeArgs.replace(/^['"]|['"]$/g, '');
          return this.decimalPipe.transform(value, cleanArgs || undefined);
        }
        case 'date': {
          const pipeArgs = parts.slice(1).join(':').trim();
          const cleanArgs = pipeArgs.replace(/^['"]|['"]$/g, '');
          return this.datePipe.transform(value, cleanArgs || undefined);
        }
        case 'currency': {
          // Parse currency format: "currency: 'PHP':'symbol': '1.2-2'"
          // Extract quoted values after the first colon
          const argsString = parts.slice(1).join(':');
          // Match quoted strings (single or double quotes)
          const quotedMatches = argsString.match(/(['"])(?:(?=(\\?))\2.)*?\1/g) || [];
          // Remove quotes from each match
          const currencyParts = quotedMatches.map(match => match.replace(/^['"]|['"]$/g, ''));

          const currencyCode = currencyParts[0] || 'PHP';
          const display = currencyParts[1] || 'symbol';
          const digitsInfo = currencyParts[2] || undefined;

          return this.currencyPipe.transform(value, currencyCode, display, digitsInfo);
        }
        case 'percent': {
          const pipeArgs = parts.slice(1).join(':').trim();
          const cleanArgs = pipeArgs.replace(/^['"]|['"]$/g, '');
          return this.percentPipe.transform(value, cleanArgs || undefined);
        }
        case 'lowercase':
          return this.lowerCasePipe.transform(value);
        case 'uppercase':
          return this.upperCasePipe.transform(value);
        default:
          return value;
      }
    } catch (error) {
      console.warn(`Error applying pipe ${pipeName}:`, error);
      return value;
    }
  }

  getFormattedValue(row: any, column: any): any {
    const value = this.getNestedValue(row, column.field);
    // Support new format: column.format.pipe, fallback to column.pipe for backward compatibility
    const pipeConfig = column?.format?.pipe || column?.pipe;
    return this.applyPipe(value, pipeConfig);
  }

  getColumnStyles(column: any): { [key: string]: string } {
    const styles: { [key: string]: string } = {};

    // Check format object first, then fallback to column level
    const minWidth = column?.format?.minWidth || column?.minWidth;
    const maxWidth = column?.format?.maxWidth || column?.maxWidth;

    if (minWidth) {
      const minWidthValue = typeof minWidth === 'number'
        ? `${minWidth}px`
        : minWidth;
      styles['min-width'] = minWidthValue;
      styles['width'] = minWidthValue; // Also set width for better Material compatibility
    }

    if (maxWidth) {
      styles['max-width'] = typeof maxWidth === 'number'
        ? `${maxWidth}px`
        : maxWidth;
    }

    return styles;
  }

  getMinWidth(column: any): string | null {
    const minWidth = column?.format?.minWidth || column?.minWidth;
    if (!minWidth) return null;
    return typeof minWidth === 'number' ? `${minWidth}px` : minWidth;
  }

  getMaxWidth(column: any): string | null {
    const maxWidth = column?.format?.maxWidth || column?.maxWidth;
    if (!maxWidth) return null;
    return typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  }
}
