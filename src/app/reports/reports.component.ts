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
import {jsPDF} from "jspdf";
import autoTable from "jspdf-autotable";

@Component({
  selector: 'app-reports',
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

  private checkMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  exportToPdf() {
    if (!this.reportData?.length || !this.selectedReport?.reportTemplateId?.table?.columns?.length) {
      return;
    }

    const columns = this.selectedReport.reportTemplateId.table.columns;
    const headers = columns.map((c: any) => c.header);
    const rows = this.reportData.map((row: any) =>
      columns.map((col: any) => {
        const val = this.getNestedValue(row, col.field);
        return val != null ? String(val) : '';
      })
    );

    const colWidth = 50;
    const margin = 14;
    const tableWidth = columns.length * colWidth;
    const pageWidth = tableWidth + margin * 2;
    const orientation = (this.selectedReport.reportTemplateId.orientation || 'portrait').toLowerCase();
    const isLandscape = orientation === 'landscape';
    const pageHeight = isLandscape ? 210 : 297;

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });

    doc.setFontSize(18);
    doc.text(this.selectedReport.title ?? 'Report', margin, 20);

    const columnStyles: Record<number, { cellWidth: number }> = {};
    columns.forEach((_: any, i: number) => {
      columnStyles[i] = { cellWidth: colWidth };
    });

    const innerBorder = 0.25;
    const outerBorder = 0.5;

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      margin: { left: margin, right: margin },
      tableWidth,
      columnStyles,
      theme: 'grid',
      styles: { fontSize: 9, fillColor: false, textColor: 0, lineColor: 0 },
      headStyles: { fillColor: false, textColor: 0, fontStyle: 'bold', lineColor: 0 },
      didParseCell: (data: any) => {
        const isFirstCol = data.column.index === 0;
        const isLastCol = data.column.index === columns.length - 1;
        const isLastRow = data.section === 'body' && data.row.index === rows.length - 1;

        data.cell.styles.lineWidth = {
          top: data.section === 'head' ? outerBorder : innerBorder,
          right: isLastCol ? outerBorder : innerBorder,
          bottom: isLastRow ? outerBorder : innerBorder,
          left: isFirstCol ? outerBorder : innerBorder
        };
      }
    });

    const totalPages = doc.getNumberOfPages();
    const timestamp = new Date().toLocaleString();
    const footerY = pageHeight - 10;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i}/${totalPages}`, margin, footerY);
      doc.text(timestamp, pageWidth - margin - doc.getTextWidth(timestamp), footerY);
    }

    doc.save(`${(this.selectedReport.title ?? 'report').replace(/\s+/g, '_')}.pdf`);
  }

  exportToExcel() {
    if (!this.reportData?.length || !this.selectedReport?.reportTemplateId?.table?.columns?.length) {
      return;
    }

    import('xlsx').then((XLSX) => {
      const columns = this.selectedReport!.reportTemplateId!.table!.columns!;
      const headers = columns.map((c: any) => c.header);
      const dataRows = this.reportData.map((row: any) =>
        columns.map((col: any) => {
          const val = this.getNestedValue(row, col.field);
          return val != null ? val : '';
        })
      );

      const aoa = [headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${(this.selectedReport!.title ?? 'report').replace(/\s+/g, '_')}.xlsx`);
    });
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((current: any, prop: string) =>
      current && current[prop] !== undefined ? current[prop] : undefined, obj);
  }

  getControl(controlName: string): FormControl {
    return this.form.get(controlName) as FormControl;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobile();
  }
}
