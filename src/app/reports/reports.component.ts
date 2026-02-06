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
  selectedParamGroups: { [groupName: string]: string } = {}; // Track selected values for each paramGroup
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
        const initialValue = (param.type === 'select' || param.type === 'schoolYear' || param.type === 'schools' || param.type === 'paramGroup') ? '' : (param.value || '');
        // Grouped parameters should not be required initially (only when their group is selected)
        if (param.group && param.type !== 'paramGroup') {
          formControls[param.name] = [initialValue]; // No validators for grouped parameters initially
        } else {
          formControls[param.name] = [initialValue, Validators.required];
        }
      });
    }

    this.form = this.fb.group(formControls);

    // Reset selected param groups when form is rebuilt
    this.selectedParamGroups = {};
    
    // Clear all grouped parameters initially (since no groups are selected yet)
    this.clearParametersFromUnselectedGroups();

    // Subscribe to paramGroup changes
    if (reportTemplate?.parameters) {
      reportTemplate.parameters.forEach((param: any) => {
        if (param.type === 'paramGroup') {
          const groupName = param.group || param.name;
          this.form.get(param.name)?.valueChanges.subscribe(value => {
            this.selectedParamGroups[groupName] = value;
            
            // Clear parameters from groups that are not currently selected
            this.clearParametersFromUnselectedGroups();
            
            // Update validation for all selected groups
            this.updateValidationForAllSelectedGroups();
          });
        }
      });
    }
  }

  private updateGroupedParametersValidation(groupName: string, isSelected: boolean) {
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (reportTemplate?.parameters) {
      reportTemplate.parameters.forEach((param: any) => {
        if (param.group === groupName && param.type !== 'paramGroup') {
          const control = this.form.get(param.name);
          if (control) {
            if (isSelected) {
              // Add required validator when group is selected
              control.setValidators([Validators.required]);
            } else {
              // Remove validators when group is not selected
              control.clearValidators();
            }
            control.updateValueAndValidity();
          }
        }
      });
    }
  }

  private clearParametersFromUnselectedGroups() {
    // Clear all grouped parameters that don't belong to any currently selected group
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (!reportTemplate?.parameters) return;
    
    // Get all currently selected group names
    const selectedGroupNames = new Set<string>();
    reportTemplate.parameters.forEach((param: any) => {
      if (param.type === 'paramGroup') {
        const controlValue = this.form.get(param.name)?.value;
        if (controlValue) {
          selectedGroupNames.add(controlValue);
        }
      }
    });
    
    // Clear parameters from groups that are not selected
    reportTemplate.parameters.forEach((param: any) => {
      if (param.group && param.type !== 'paramGroup') {
        if (!selectedGroupNames.has(param.group)) {
          const control = this.form.get(param.name);
          if (control) {
            control.setValue('');
            control.markAsPristine();
            control.markAsUntouched();
            control.clearValidators();
            control.updateValueAndValidity();
          }
        }
      }
    });
  }

  private updateValidationForAllSelectedGroups() {
    // Update validation for all parameters in currently selected groups
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (!reportTemplate?.parameters) return;
    
    // Get all currently selected group names
    const selectedGroupNames = new Set<string>();
    reportTemplate.parameters.forEach((param: any) => {
      if (param.type === 'paramGroup') {
        const controlValue = this.form.get(param.name)?.value;
        if (controlValue) {
          selectedGroupNames.add(controlValue);
        }
      }
    });
    
    // Update validation for parameters in selected groups
    reportTemplate.parameters.forEach((param: any) => {
      if (param.group && param.type !== 'paramGroup') {
        const control = this.form.get(param.name);
        if (control) {
          if (selectedGroupNames.has(param.group)) {
            // Group is selected, make parameter required
            control.setValidators([Validators.required]);
          } else {
            // Group is not selected, remove validators
            control.clearValidators();
          }
          control.updateValueAndValidity();
        }
      }
    });
  }

  getParamGroupParameters(): any[] {
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (!reportTemplate?.parameters) return [];
    return reportTemplate.parameters.filter((param: any) => param.type === 'paramGroup');
  }

  getRegularParameters(): any[] {
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (!reportTemplate?.parameters) return [];
    return reportTemplate.parameters.filter((param: any) => param.type !== 'paramGroup' && !param.group);
  }

  getGroupedParameters(groupName: string): any[] {
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (!reportTemplate?.parameters) return [];
    return reportTemplate.parameters.filter((param: any) => param.group === groupName && param.type !== 'paramGroup');
  }

  getAllGroupNames(): string[] {
    // Get all unique groupNames from paramGroup options
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (!reportTemplate?.parameters) return [];

    const groupNames = new Set<string>();
    const paramGroups = reportTemplate.parameters.filter((param: any) => param.type === 'paramGroup');

    paramGroups.forEach((paramGroup: any) => {
      if (paramGroup.value && Array.isArray(paramGroup.value)) {
        paramGroup.value.forEach((option: any) => {
          if (option && typeof option === 'object' && 'groupName' in option) {
            groupNames.add(option.groupName);
          }
        });
      }
    });

    return Array.from(groupNames);
  }

  isGroupSelected(groupName: string): boolean {
    // Check if any paramGroup has a selected value (groupName) that matches the provided groupName
    // The groupName parameter is the 'group' field from regular parameters (e.g., "schoolYearGroup")
    // The form control stores the groupName string directly (e.g., "periodGroup")
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (reportTemplate?.parameters) {
      // Find all paramGroup parameters
      const paramGroups = reportTemplate.parameters.filter((param: any) => param.type === 'paramGroup');

      // Check if any paramGroup has the groupName selected
      for (const paramGroup of paramGroups) {
        const controlValue = this.form.get(paramGroup.name)?.value;
        if (controlValue !== null && controlValue !== undefined && controlValue !== '') {
          // The selected value is the groupName string, so compare directly
          if (controlValue === groupName) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getSelectedGroupValue(groupName: string): string {
    const reportTemplate = this.selectedReport?.reportTemplateId;
    if (reportTemplate?.parameters) {
      const paramGroup = reportTemplate.parameters.find((param: any) =>
        param.type === 'paramGroup' && (param.group || param.name) === groupName
      );
      if (paramGroup) {
        const controlValue = this.form.get(paramGroup.name)?.value;
        return controlValue || this.selectedParamGroups[groupName] || '';
      }
    }
    return this.selectedParamGroups[groupName] || '';
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
