import {ChangeDetectorRef, Component, ElementRef, HostListener, Injector, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {NgClass, NgComponentOutlet, NgForOf, NgIf} from "@angular/common";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import {MatSelect, MatSelectModule} from "@angular/material/select";
import {MatOption} from "@angular/material/core";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatTooltipModule} from "@angular/material/tooltip";
import {BasicReportComponent} from "./templates/basic/basic-report.component";
import {ReportService} from "../common/services/report.service";
import {Report, ReportTemplate} from "../common/model/report.model";
import {SchoolYearSelectComponent} from "./filters/school-year-select/school-year-select.component";
import {SchoolsSelectComponent} from "./filters/schools-select/schools-select.component";
// @ts-ignore - pdfmake types may not be fully available
import * as pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore - pdfmake types may not be fully available
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Set the fonts
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).default?.pdfMake?.vfs || {};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    NgForOf,
    MatInput,
    MatButton,
    MatSelect,
    MatSelectModule,
    MatOption,
    NgComponentOutlet,
    NgIf,
    SchoolYearSelectComponent,
    SchoolsSelectComponent,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit, OnChanges {
  @Input() selectedReport: Report | undefined;
  form!: FormGroup;
  reportSelectForm!: FormGroup;
  reportData: any[] = [];
  customInjector!: Injector;
  availableReports: Report[] = [];
  isMobile: boolean = false;
  componentKey: number | null = null; // Used to force component recreation when data changes
  isLoading: boolean = false;
  canExportToPDF: boolean = true; // Whether the report can be exported (fits in A4)
  @ViewChild('reportPanel', { static: false }) reportPanel!: ElementRef;
  @ViewChild('reportContent', { static: false }) reportContent!: ElementRef;

  private emptyReport = {
    title: "",
    description: "",
    reportTemplateId: {
      _id: "",
      title: "",
      orientation: "portrait",
      paperSize: "A4",
      parameters: [],
      reportType: "",
      table: {
        columns: []
      }
    },
    reportQueryId: ""
  };

  constructor(
    protected injector: Injector,
    private fb: FormBuilder,
    private readonly reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    this.checkMobile();
    this.reportSelectForm = this.fb.group({
      report: ['', Validators.required]
    });

    this.reportSelectForm.get('report')?.valueChanges.subscribe(report => {
      this.onReportChange(report);
    });

    this.loadAllReports();
    if (!this.selectedReport) {
      this.selectedReport = this.emptyReport;
    } else {
      const found = this.availableReports.find(t => t.reportTemplateId === this.selectedReport?._id);
      if (found) {
        this.reportSelectForm.patchValue({ report: found.title });
      }
    }
    this.buildForm();
    this.createCustomInjector();
    if (this.componentKey === null) {
      this.componentKey = 0;
    }
  }

  ngAfterViewInit() {
    // Component initialization complete
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedReport'] && !changes['selectedReport'].firstChange) {
      this.buildForm();
      this.createCustomInjector();
    }
  }

  private loadAllReports() {
    this.reportService.getReports().subscribe({
      next: (response: any) => {
        this.availableReports = (response.data ?? response) ?? [];
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  private buildForm() {
    const formControls: { [key: string]: any } = {};
    const reportTemplate = this.selectedReport?.reportTemplateId;

    if (reportTemplate?.parameters) {
      reportTemplate.parameters.forEach((param: any) => {
        const initialValue = (param.type === 'select' || param.type === 'schoolYear' || param.type === 'schools') ? '' : (param.value || '');
        formControls[param.name] = [initialValue, Validators.required];
      });
    }

    this.form = this.fb.group(formControls);
  }

  private createCustomInjector() {
    this.customInjector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: 'REPORT_DATA', useValue: this.reportData },
        { provide: 'REPORT', useValue: this.selectedReport },
        { provide: 'IS_LOADING', useValue: this.isLoading }
      ]
    });
  }

  getComponentType() {
    const reportTemplate = this.selectedReport?.reportTemplateId;
    const reportType = reportTemplate?.reportType;

    switch (reportType) {
      case 'basicReport':
        return BasicReportComponent;
      default:
        if (reportType) {
          console.error(`Unsupported report type: ${reportType}`);
        }
        return null;
    }
  }

  onReportChange(selectedReport: Report) {
    if (selectedReport) {
      this.selectedReport = selectedReport;
      this.reportData = [];
      this.canExportToPDF = true; // Reset export status
      this.buildForm();
      // Force component destruction first
      this.componentKey = null;

      setTimeout(() => {
        this.createCustomInjector();
        this.componentKey = Date.now(); // Use timestamp for unique key
      }, 0);
    }
  }

  protected loadReport() {
    if (this.form.valid && this.reportSelectForm.valid && this.selectedReport?._id) {
      this.isLoading = true;

      this.componentKey = null;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.createCustomInjector();
        this.componentKey = Date.now();
        this.cdr.detectChanges();
      }, 0);

      this.reportService.generateReport(this.selectedReport._id, this.form.value).subscribe({
        next: (response: any) => {
          this.reportData = response.data || response || [];
          this.isLoading = false;
          
          // Check if report fits in A4 after data is loaded
          this.checkIfReportFitsInA4();

          this.componentKey = null;
          this.cdr.detectChanges();

          setTimeout(() => {
            this.createCustomInjector();
            this.componentKey = Date.now();
            this.cdr.detectChanges();
          }, 10);
        },
        error: (error) => {
          console.log(error);
          this.isLoading = false;
          this.canExportToPDF = false;

          this.componentKey = null;
          this.cdr.detectChanges();

          setTimeout(() => {
            this.createCustomInjector();
            this.componentKey = Date.now();
            this.cdr.detectChanges();
          }, 10);
        }
      });
    }
  }

  private checkIfReportFitsInA4() {
    if (!this.selectedReport || !this.reportData || this.reportData.length === 0) {
      this.canExportToPDF = false;
      return;
    }

    const template = this.selectedReport.reportTemplateId;
    const columns = template?.table?.columns || [];
    
    if (columns.length === 0) {
      this.canExportToPDF = false;
      return;
    }

    // Calculate required width for all columns
    let totalRequiredWidth = 0;
    const defaultColumnWidth = 80; // Default width in points if no minWidth specified

    columns.forEach((col: any) => {
      const minWidth = col?.format?.minWidth || col?.minWidth;
      let width = defaultColumnWidth;

      if (minWidth) {
        if (typeof minWidth === 'number' && !isNaN(minWidth) && minWidth > 0) {
          width = minWidth;
        } else if (typeof minWidth === 'string') {
          const pxMatch = String(minWidth).match(/(\d+)px/);
          if (pxMatch) {
            const pxValue = parseInt(pxMatch[1], 10);
            if (!isNaN(pxValue) && pxValue > 0) {
              width = pxValue * 0.75; // Convert px to points
            }
          }
        }
      }
      
      if (isNaN(width) || width <= 0) {
        width = defaultColumnWidth;
      }
      
      totalRequiredWidth += width;
    });

    // Account for borders and padding
    const borderWidth = (columns.length + 1) * 0.5; // Vertical borders
    const paddingWidth = columns.length * 4; // 2pt padding on each side per column
    const totalTableWidth = totalRequiredWidth + borderWidth + paddingWidth;

    // Get orientation from template
    const isLandscape = template?.orientation === 'landscape';
    
    // A4 dimensions in points (1 inch = 72 points)
    // A4: 8.27" x 11.69" = 595pt x 842pt
    const a4PortraitWidth = 595;
    const a4LandscapeWidth = 842;
    const a4Width = isLandscape ? a4LandscapeWidth : a4PortraitWidth;
    
    // Account for margins: 20pt left + 20pt right = 40pt total
    const availableA4Width = a4Width - 40;

    // Check if table width exceeds available A4 width
    this.canExportToPDF = totalTableWidth <= availableA4Width;
    
    if (!this.canExportToPDF) {
      console.log('Report exceeds A4 size:', {
        totalTableWidth,
        availableA4Width,
        isLandscape
      });
    }
  }

  private checkMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  getControl(controlName: string): FormControl {
    return this.form.get(controlName) as FormControl;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobile();
  }

  exportToPDF() {
    console.log('=== PDF Export Started ===');
    
    if (!this.selectedReport || this.isLoading || !this.reportData || this.reportData.length === 0) {
      console.log('Early return - missing data:', {
        hasReport: !!this.selectedReport,
        isLoading: this.isLoading,
        hasData: !!this.reportData,
        dataLength: this.reportData?.length
      });
      return;
    }

    const reportTitle = this.selectedReport.title || 'Report';
    const template = this.selectedReport.reportTemplateId;
    const columns = template?.table?.columns || [];
    
    console.log('Initial values:', {
      reportTitle,
      hasTemplate: !!template,
      columnsCount: columns.length,
      orientation: template?.orientation,
      paperSize: template?.paperSize
    });

    // Build table body with headers
    const tableBody: any[] = [];

    // Add header row
    const headerRow = columns.map((col: any) => {
      const headerText = col.header || col.field;
      return {
        text: headerText,
        style: 'tableHeader',
        bold: true,
        noWrap: false // Allow text wrapping
      };
    });
    tableBody.push(headerRow);

    // Add data rows
    this.reportData.forEach((row: any) => {
      const dataRow = columns.map((col: any) => {
        const value = this.getNestedValue(row, col.field);
        const formattedValue = this.formatValueForPDF(value, col);

        return {
          text: formattedValue || '',
          style: 'tableCell',
          noWrap: false // Allow text wrapping
        };
      });
      tableBody.push(dataRow);
    });

    // Use auto-sizing for columns - pdfmake will distribute them evenly
    const columnWidths = columns.map(() => '*');

    // Get orientation and paper size from template - always use template settings
    const isLandscape = template?.orientation === 'landscape';
    const isLetter = template?.paperSize === 'letter';
    const finalPageSize = isLetter ? 'LETTER' : 'A4';
    const finalPageOrientation = isLandscape ? 'landscape' : 'portrait';
    
    // Validate column widths
    if (!columnWidths || columnWidths.length !== columns.length) {
      console.error('Column widths array is invalid or length mismatch');
      return;
    }
    
    // Since we're using '*', no need to validate individual widths
    const validColumnWidths = columnWidths;

    // Validate pageMargins - ensure all values are numbers
    const pageMargins = [20, 60, 20, 60].map(m => {
      const num = Number(m);
      return isFinite(num) && num >= 0 ? num : 0;
    });

    // Log values before creating PDF for debugging
    console.log('PDF Generation Values:', {
      finalPageSize,
      finalPageOrientation,
      pageMargins,
      validColumnWidths,
      tableBodyLength: tableBody.length,
      columnsLength: columns.length
    });

    // Create PDF document definition
    const docDefinition: any = {
      pageOrientation: finalPageOrientation,
      pageSize: finalPageSize,
      pageMargins: pageMargins,
      content: [
        {
          text: reportTitle || 'Report',
          style: 'title',
          margin: [0, 0, 0, 20]
        },
        {
          table: {
            headerRows: 1,
            widths: validColumnWidths,
            body: tableBody,
            dontBreakRows: false // Allow rows to break across pages
          },
          layout: {
            hLineWidth: (i: number, node: any) => {
              if (i === 0 || (node && node.table && node.table.body && i === node.table.body.length)) {
                return 1;
              }
              return 0.5;
            },
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc',
            paddingLeft: () => 2,
            paddingRight: () => 2,
            paddingTop: () => 2,
            paddingBottom: () => 2
          }
        }
      ],
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          alignment: 'center'
        },
        tableHeader: {
          fillColor: '#f0f0f0',
          color: '#000000',
          bold: true,
          fontSize: 11,
          alignment: 'left'
        },
        tableCell: {
          fontSize: 11,
          color: '#000000',
          alignment: 'left'
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    // Final validation of document definition
    console.log('=== Final Document Definition Validation ===');
    
    if (!docDefinition.pageSize) {
      console.error('Page size is missing in document definition');
      return;
    }
    
    console.log('Page size before validation:', docDefinition.pageSize, 'Type:', typeof docDefinition.pageSize, 'IsArray:', Array.isArray(docDefinition.pageSize));
    
    if (Array.isArray(docDefinition.pageSize)) {
      const [w, h] = docDefinition.pageSize;
      console.log('Page size array values:', { w, h, wType: typeof w, hType: typeof h, wFinite: isFinite(Number(w)), hFinite: isFinite(Number(h)) });
      
      if (!isFinite(Number(w)) || !isFinite(Number(h))) {
        console.error('Invalid page size in document definition', docDefinition.pageSize);
        docDefinition.pageSize = 'A4';
      } else {
        // Ensure array contains actual numbers
        docDefinition.pageSize = [Number(w), Number(h)];
        console.log('Page size after number conversion:', docDefinition.pageSize);
      }
    }
    
    // Validate all numeric values in styles
    if (docDefinition.styles) {
      Object.keys(docDefinition.styles).forEach(key => {
        const style = docDefinition.styles[key];
        if (style.fontSize && (!isFinite(Number(style.fontSize)) || Number(style.fontSize) <= 0)) {
          console.warn(`Invalid fontSize in style ${key}:`, style.fontSize);
          style.fontSize = 11;
        }
      });
    }
    
    // Log complete document definition structure (but not the full body to avoid console spam)
    console.log('Document definition summary:', {
      pageOrientation: docDefinition.pageOrientation,
      pageSize: docDefinition.pageSize,
      pageMargins: docDefinition.pageMargins,
      contentLength: docDefinition.content?.length,
      tableWidths: docDefinition.content?.[1]?.table?.widths,
      tableBodyRows: docDefinition.content?.[1]?.table?.body?.length,
      styles: Object.keys(docDefinition.styles || {})
    });
    
    // Validate column widths - check for undefined/null but allow '*' for auto-sizing
    const tableWidths = docDefinition.content?.[1]?.table?.widths;
    if (tableWidths) {
      console.log('Table widths validation:', {
        widths: tableWidths,
        lengths: tableWidths.length,
        hasUndefined: tableWidths.some((w: any) => w === undefined || w === null),
        hasAutoSize: tableWidths.some((w: any) => w === '*'),
        allAreStrings: tableWidths.every((w: any) => typeof w === 'string' && w === '*')
      });
      
      // Check only for undefined/null values (not for '*' which is valid for auto-sizing)
      // Also allow numbers and '*' strings
      const hasInvalid = tableWidths.some((w: any, i: number) => {
        // Valid values: numbers, '*' string, or other valid pdfmake width values
        const isValid = w !== undefined && w !== null && (
          typeof w === 'number' || 
          w === '*' || 
          (typeof w === 'string' && w.trim() !== '')
        );
        const invalid = !isValid;
        if (invalid) {
          console.error(`Invalid width at index ${i}:`, w, 'Type:', typeof w);
        }
        return invalid;
      });
      
      if (hasInvalid) {
        console.error('Found invalid widths, cannot generate PDF');
        return;
      }
    }

    console.log('=== About to call pdfMake.createPdf ===');
    
    // Generate and download PDF
    try {
      console.log('Creating PDF document...');
      
      // Double-check all numeric values one more time before calling pdfmake
      console.log('Final pre-flight check:');
      console.log('- pageSize:', docDefinition.pageSize, 'Type:', typeof docDefinition.pageSize);
      if (Array.isArray(docDefinition.pageSize)) {
        const w = docDefinition.pageSize[0];
        const h = docDefinition.pageSize[1];
        console.log('- pageSize[0]:', w, 'Type:', typeof w, 'IsFinite:', isFinite(Number(w)), 'IsNumber:', typeof w === 'number');
        console.log('- pageSize[1]:', h, 'Type:', typeof h, 'IsFinite:', isFinite(Number(h)), 'IsNumber:', typeof h === 'number');
        
        // Force convert to numbers if needed
        if (typeof w !== 'number' || typeof h !== 'number') {
          console.warn('Converting pageSize to numbers');
          docDefinition.pageSize = [Number(w), Number(h)];
          console.log('- Converted pageSize:', docDefinition.pageSize);
        }
        
        // Check for undefined
        if (w === undefined || h === undefined || w === null || h === null) {
          console.error('pageSize contains undefined or null values!', { w, h });
          throw new Error('Page size contains undefined or null values');
        }
      }
      console.log('- pageOrientation:', docDefinition.pageOrientation);
      console.log('- pageMargins:', docDefinition.pageMargins, 'AllFinite:', docDefinition.pageMargins.every((m: any) => isFinite(Number(m))));
      console.log('- table widths count:', docDefinition.content[1]?.table?.widths?.length);
      console.log('- table widths:', docDefinition.content[1]?.table?.widths);
      
      // Check for undefined in table widths (but allow '*' for auto-sizing)
      const widths = docDefinition.content[1]?.table?.widths;
      if (widths) {
        const hasUndefined = widths.some((w: any) => w === undefined || w === null);
        if (hasUndefined) {
          console.error('Table widths contains undefined or null!', widths);
          throw new Error('Table widths contains undefined or null values');
        }
        // '*' is valid for auto-sizing, so no need to check for it
      }
      
      const pdfDoc = pdfMake.createPdf(docDefinition);
      console.log('PDF document object created successfully');
      
      const fileName = `${reportTitle || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('About to call download with fileName:', fileName);
      
      // Use getBlob to trigger PDF generation and catch errors
      pdfDoc.getBlob((blob: Blob) => {
        console.log('PDF blob callback received, size:', blob.size);
        if (blob.size === 0) {
          console.error('PDF blob is empty!');
        } else {
          console.log('PDF blob created successfully');
        }
      });
      
      // Also try download - the error might happen here
      console.log('Calling download()...');
      pdfDoc.download(fileName);
      console.log('Download call completed');
    } catch (error) {
      console.error('=== ERROR generating PDF (synchronous) ===');
      console.error('Error details:', error);
      console.error('Error message:', (error as Error)?.message);
      console.error('Error stack:', (error as Error)?.stack);
      console.error('Document definition (pageSize):', docDefinition.pageSize);
      console.error('Document definition (pageOrientation):', docDefinition.pageOrientation);
      console.error('Document definition (pageMargins):', docDefinition.pageMargins);
      console.error('Document definition (table widths):', docDefinition.content?.[1]?.table?.widths);
      
      // Log a simplified version to avoid circular references
      const simplifiedDef = {
        pageOrientation: docDefinition.pageOrientation,
        pageSize: docDefinition.pageSize,
        pageMargins: docDefinition.pageMargins,
        contentLength: docDefinition.content?.length,
        tableWidths: docDefinition.content?.[1]?.table?.widths,
        tableBodyLength: docDefinition.content?.[1]?.table?.body?.length
      };
      console.error('Simplified document definition:', JSON.stringify(simplifiedDef, null, 2));
    }
    
    console.log('=== PDF Export Completed ===');
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }
    return path.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : undefined;
    }, obj);
  }

  private formatValueForPDF(value: any, column: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const pipeConfig = column?.format?.pipe || column?.pipe;
    if (!pipeConfig) {
      return String(value);
    }

    const parts = pipeConfig.split(':').map((s: string) => s.trim());
    const pipeName = parts[0];

    try {
      switch (pipeName.toLowerCase()) {
        case 'number':
        case 'decimal': {
          const pipeArgs = parts.slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
          const numValue = Number(value);
          if (isNaN(numValue)) return String(value);
          if (pipeArgs) {
            const [minIntegerDigits, minFractionDigits, maxFractionDigits] = pipeArgs.split('-');
            return numValue.toLocaleString('en-US', {
              minimumIntegerDigits: minIntegerDigits ? parseInt(minIntegerDigits) : undefined,
              minimumFractionDigits: minFractionDigits ? parseInt(minFractionDigits) : undefined,
              maximumFractionDigits: maxFractionDigits ? parseInt(maxFractionDigits) : undefined
            });
          }
          return numValue.toLocaleString('en-US');
        }
        case 'date': {
          const pipeArgs = parts.slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) return String(value);
          return dateValue.toLocaleDateString('en-US', {
            year: 'numeric',
            month: pipeArgs === 'short' ? 'short' : 'long',
            day: 'numeric'
          });
        }
        case 'currency': {
          const argsString = parts.slice(1).join(':');
          const quotedMatches = argsString.match(/(['"])(?:(?=(\\?))\2.)*?\1/g) || [];
          const currencyParts = quotedMatches.map((match: string) => match.replace(/^['"]|['"]$/g, ''));
          const currencyCode = currencyParts[0] || 'PHP';
          const numValue = Number(value);
          if (isNaN(numValue)) return String(value);
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode
          }).format(numValue);
        }
        case 'percent': {
          const numValue = Number(value);
          if (isNaN(numValue)) return String(value);
          return (numValue * 100).toFixed(2) + '%';
        }
        case 'lowercase':
          return String(value).toLowerCase();
        case 'uppercase':
          return String(value).toUpperCase();
        default:
          return String(value);
      }
    } catch (error) {
      console.warn(`Error formatting value for PDF:`, error);
      return String(value);
    }
  }

  private calculateColumnWidths(columns: any[], template: any): (string | number)[] {
    if (columns.length === 0) {
      return [];
    }

    // Get page dimensions in points (1 inch = 72 points)
    const isLandscape = template?.orientation === 'landscape';
    const isLetter = template?.paperSize === 'letter';

    // Page dimensions in points (with margins: 40pt left + 40pt right = 80pt total)
    let pageWidth: number;
    if (isLetter) {
      // Letter: 8.5" x 11" = 612pt x 792pt
      pageWidth = isLandscape ? 792 - 80 : 612 - 80;
    } else {
      // A4: 8.27" x 11.69" = 595pt x 842pt
      pageWidth = isLandscape ? 842 - 80 : 595 - 80;
    }

    // Calculate proportional widths based on minWidth if available
    const columnWidths: number[] = [];
    let totalMinWidth = 0;

    columns.forEach((col: any) => {
      const minWidth = col?.format?.minWidth || col?.minWidth;
      let width = 50; // Default minimum width

      if (minWidth) {
        if (typeof minWidth === 'number') {
          width = minWidth;
        } else {
          const pxMatch = String(minWidth).match(/(\d+)px/);
          if (pxMatch) {
            width = parseInt(pxMatch[1]) * 0.75; // Convert px to points
          }
        }
      }
      columnWidths.push(width);
      totalMinWidth += width;
    });

    // If total width exceeds page width, scale down proportionally
    if (totalMinWidth > pageWidth) {
      const scaleFactor = pageWidth / totalMinWidth;
      return columnWidths.map(width => Math.floor(width * scaleFactor));
    }

    // If there's extra space, distribute it evenly among columns
    const extraSpace = pageWidth - totalMinWidth;
    if (extraSpace > 0) {
      const extraPerColumn = Math.floor(extraSpace / columns.length);
      return columnWidths.map(width => width + extraPerColumn);
    }

    return columnWidths;
  }
}
