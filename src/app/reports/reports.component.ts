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

  getControl(controlName: string): FormControl {
    return this.form.get(controlName) as FormControl;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobile();
  }
}
