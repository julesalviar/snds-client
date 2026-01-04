import {Component, Injector, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {NgClass, NgComponentOutlet, NgForOf, NgIf} from "@angular/common";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import {MatSelect, MatSelectModule} from "@angular/material/select";
import {DpdsReportComponent} from "./templates/dpds/dpds-report.component";
import {BudgetReportComponent} from "./templates/budget/budget-report.component";

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
    NgComponentOutlet,
    NgIf
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit, OnChanges {
  @Input() template: any;
  form!: FormGroup;
  reportSelectForm!: FormGroup;
  reportData: any[] = [];
  customInjector!: Injector;
  selectedReportId: string = '';
  availableTemplates: any[] = [];

  // Sample template 1: DPDS Report
  private dpdsTemplate = {
    reportId: "dpdsReport",
    title: "DPDS Report",
    orientation: "landscape",
    paperSize: "A4",
    parameters: [
      { name: "startDate", type: "date", label: "Start Date", value: "" },
      { name: "endDate", type: "date", label: "End Date", value: "" },
      { name: "schoolName", type: "text", label: "School Name", value: "" }
    ],
    reportType: "dpds",
    table: {
      columns: [
        { header: "Product", field: "productName" },
        { header: "Amount", field: "amount" },
        { header: "Date", field: "date" },
        { header: "Status", field: "status" }
      ]
    }
  };

  // Sample template 2: School Enrollment Report
  private enrollmentTemplate = {
    reportId: "enrollmentReport",
    title: "School Enrollment Report",
    orientation: "portrait",
    paperSize: "A4",
    parameters: [
      { name: "schoolYear", type: "text", label: "School Year", value: "" },
      { name: "gradeLevel", type: "text", label: "Grade Level", value: "" },
      { name: "district", type: "text", label: "District", value: "" }
    ],
    reportType: "dpds", // Using same component for now
    table: {
      columns: [
        { header: "School Name", field: "schoolName" },
        { header: "Grade", field: "grade" },
        { header: "Enrolled", field: "enrolled" },
        { header: "Male", field: "male" },
        { header: "Female", field: "female" },
        { header: "Total Classrooms", field: "classrooms" }
      ]
    }
  };

  // Sample template 3: Budget Allocation Report
  private budgetTemplate = {
    reportId: "budgetReport",
    title: "Budget Allocation Report",
    orientation: "portrait",
    paperSize: "A4",
    parameters: [
      { name: "fiscalYear", type: "text", label: "Fiscal Year", value: "" },
      { name: "department", type: "text", label: "Department", value: "" },
      { name: "budgetType", type: "text", label: "Budget Type", value: "" }
    ],
    reportType: "budget",
    table: {
      columns: [
        { header: "Category", field: "category" },
        { header: "Allocated", field: "allocated" },
        { header: "Spent", field: "spent" },
        { header: "Remaining", field: "remaining" },
        { header: "Percentage", field: "percentage" }
      ]
    }
  };

  // Sample data for DPDS Report
  private dpdsData = [
    { productName: "Laptops", amount: "$15,000", date: "2024-01-15", status: "Delivered" },
    { productName: "Projectors", amount: "$8,500", date: "2024-02-20", status: "Pending" },
    { productName: "Desks", amount: "$12,000", date: "2024-03-10", status: "Delivered" },
    { productName: "Chairs", amount: "$5,200", date: "2024-03-25", status: "In Transit" },
    { productName: "Whiteboards", amount: "$3,800", date: "2024-04-05", status: "Delivered" },
    { productName: "Books", amount: "$9,600", date: "2024-04-18", status: "Pending" }
  ];

  // Sample data for Enrollment Report
  private enrollmentData = [
    { schoolName: "General Santos City High School", grade: "Grade 7", enrolled: 450, male: 230, female: 220, classrooms: 12 },
    { schoolName: "General Santos City High School", grade: "Grade 8", enrolled: 420, male: 215, female: 205, classrooms: 11 },
    { schoolName: "General Santos City High School", grade: "Grade 9", enrolled: 380, male: 195, female: 185, classrooms: 10 },
    { schoolName: "General Santos City High School", grade: "Grade 10", enrolled: 360, male: 180, female: 180, classrooms: 10 },
    { schoolName: "Lagao National High School", grade: "Grade 7", enrolled: 320, male: 165, female: 155, classrooms: 9 },
    { schoolName: "Lagao National High School", grade: "Grade 8", enrolled: 310, male: 160, female: 150, classrooms: 9 },
    { schoolName: "Fatima National High School", grade: "Grade 7", enrolled: 280, male: 145, female: 135, classrooms: 8 },
    { schoolName: "Fatima National High School", grade: "Grade 8", enrolled: 270, male: 140, female: 130, classrooms: 8 }
  ];

  // Sample data for Budget Report
  private budgetData = [
    { category: "Personnel", allocated: "$500,000", spent: "$420,000", remaining: "$80,000", percentage: "84%" },
    { category: "Infrastructure", allocated: "$300,000", spent: "$180,000", remaining: "$120,000", percentage: "60%" },
    { category: "Equipment", allocated: "$200,000", spent: "$195,000", remaining: "$5,000", percentage: "97.5%" },
    { category: "Training & Development", allocated: "$150,000", spent: "$95,000", remaining: "$55,000", percentage: "63.3%" },
    { category: "Maintenance", allocated: "$100,000", spent: "$75,000", remaining: "$25,000", percentage: "75%" },
    { category: "Utilities", allocated: "$80,000", spent: "$78,000", remaining: "$2,000", percentage: "97.5%" },
    { category: "Supplies", allocated: "$70,000", spent: "$45,000", remaining: "$25,000", percentage: "64.3%" },
    { category: "Other Expenses", allocated: "$50,000", spent: "$32,000", remaining: "$18,000", percentage: "64%" }
  ];

  constructor(
    protected injector: Injector,
    private fb: FormBuilder
  ) {
  }

  ngOnInit() {
    // Initialize available templates
    this.availableTemplates = [
      { id: "dpdsReport", name: "DPDS Report", template: this.dpdsTemplate },
      { id: "enrollmentReport", name: "School Enrollment Report", template: this.enrollmentTemplate },
      { id: "budgetReport", name: "Budget Allocation Report", template: this.budgetTemplate }
    ];

    // Initialize report selector form
    this.reportSelectForm = this.fb.group({
      reportType: ['dpdsReport', Validators.required]
    });

    // Initialize with sample template if no template is provided via @Input
    if (!this.template) {
      this.template = this.dpdsTemplate;
      this.selectedReportId = "dpdsReport";
    } else {
      // Find matching template from available templates
      const found = this.availableTemplates.find(t => t.template.reportId === this.template.reportId);
      if (found) {
        this.selectedReportId = found.id;
        this.reportSelectForm.patchValue({ reportType: found.id });
      }
    }
    this.buildForm();
    this.createCustomInjector();

    // Watch for report type changes
    this.reportSelectForm.get('reportType')?.valueChanges.subscribe(reportId => {
      this.onReportChange(reportId);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['template'] && !changes['template'].firstChange) {
      this.buildForm();
      this.createCustomInjector();
    }
  }

  private buildForm() {
    const formControls: { [key: string]: any } = {};
    
    if (this.template?.parameters) {
      this.template.parameters.forEach((param: any) => {
        formControls[param.name] = [param.value || '', Validators.required];
      });
    }
    
    this.form = this.fb.group(formControls);
  }

  private createCustomInjector() {
    this.customInjector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: 'REPORT_DATA', useValue: this.reportData },
        { provide: 'REPORT_TEMPLATE', useValue: this.template }
      ]
    });
  }

  getComponentType() {
    switch (this.template?.reportType) {
      case 'dpds':
        return DpdsReportComponent;
      case 'budget':
        return BudgetReportComponent;
      default:
        return null;
    }
  }

  onReportChange(reportId: string) {
    const selectedTemplate = this.availableTemplates.find(t => t.id === reportId);
    if (selectedTemplate) {
      this.template = selectedTemplate.template;
      this.selectedReportId = reportId;
      this.reportData = []; // Clear previous report data
      this.buildForm();
      this.createCustomInjector();
    }
  }

  protected loadReport() {
    if (this.form.valid) {
      // Generate sample data based on form values and selected template
      this.reportData = this.generateReportData(this.form.value);
      this.createCustomInjector();
      
      // Log the form values for debugging
      console.log('Form values:', this.form.value);
      console.log('Report data:', this.reportData);
    }
  }

  private generateReportData(formValues: any): any[] {
    // Get the appropriate data based on the selected template
    let data: any[] = [];
    
    if (this.template?.reportId === "dpdsReport") {
      data = [...this.dpdsData];
      
      // Example: Filter by date range if provided
      if (formValues.startDate) {
        console.log('Filtering by start date:', formValues.startDate);
      }
      
      if (formValues.endDate) {
        console.log('Filtering by end date:', formValues.endDate);
      }
      
      if (formValues.schoolName) {
        console.log('Filtering by school name:', formValues.schoolName);
      }
    } else if (this.template?.reportId === "enrollmentReport") {
      data = [...this.enrollmentData];
      
      // Example: Filter by school year if provided
      if (formValues.schoolYear) {
        console.log('Filtering by school year:', formValues.schoolYear);
      }
      
      if (formValues.gradeLevel) {
        data = data.filter(item => item.grade.toLowerCase().includes(formValues.gradeLevel.toLowerCase()));
      }
      
      if (formValues.district) {
        console.log('Filtering by district:', formValues.district);
      }
    } else if (this.template?.reportId === "budgetReport") {
      data = [...this.budgetData];
      
      // Example: Filter by fiscal year if provided
      if (formValues.fiscalYear) {
        console.log('Filtering by fiscal year:', formValues.fiscalYear);
      }
      
      if (formValues.department) {
        console.log('Filtering by department:', formValues.department);
      }
      
      if (formValues.budgetType) {
        console.log('Filtering by budget type:', formValues.budgetType);
      }
    }
    
    return data;
  }
}
