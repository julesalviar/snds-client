import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms'; 
import { AIPProject } from '../../interfaces/aip.model';
import { MatTableModule } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDeleteDialogComponent } from '../../table-button-dialog/confirm-delete-dialog/confirm-delete-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AipDetailViewComponent } from '../../table-button-dialog/confirm-delete-dialog/view button/aip-detail-view/aip-detail-view.component';

@Component({
  selector: 'app-aip',
  standalone: true,
  imports: [MatFormField, CommonModule, MatFormFieldModule, MatTooltipModule, MatInputModule, MatSelectModule, MatButtonModule, MatCardModule, ReactiveFormsModule, MatIconButton, MatTableModule, MatIcon],
  templateUrl: './aip.component.html',
  styleUrls: ['./aip.component.css'],
  providers: [MatDialog],
})
export class AipComponent implements OnInit {
  aipForm: FormGroup;
  displayedColumns: string[] = [ 'apn', 'projectTitle', 'totalBudget', 'schoolYear', 'status', 'actions'];
  projects: AIPProject[] = [];
  apnCounter: number = 2524; // Starting APN assumed
  currentYear: number = new Date().getFullYear();
  pillars: string[] = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  statuses: string[] = ['For Implementation', 'Ongoing', 'Completed', 'Incomplete', 'Unimplemented'];

  constructor(private fb: FormBuilder, public dialog: MatDialog) {
    this.aipForm = this.fb.group({
      schoolYear: [{ value: this.currentYear, disabled: true }, Validators.required],
      projectTitle: ['', Validators.required],
      objectives: ['', [Validators.required, Validators.maxLength(500)]],
      intermediateOutcome: ['', Validators.required],
      personsResponsible: ['', Validators.required],
      materialsNeeded: ['', Validators.required],
      totalBudget: [100, [Validators.required, Validators.min(100)]],
      budgetSource: ['', Validators.required],
      status: ['', Validators.required],
    });
  }

  ngOnInit() {
    // Sample data
    this.projects = [
      { apn: this.apnCounter++, projectTitle: "Project A", totalBudget: 1000, schoolYear: this.currentYear, status: "Ongoing" },
      { apn: this.apnCounter++, projectTitle: "Project B", totalBudget: 2000, schoolYear: this.currentYear, status: "Completed" },
      { apn: this.apnCounter++, projectTitle: "Project C", totalBudget: 1500, schoolYear: this.currentYear, status: "For Implementation" },
    ];
  }

  onSubmit() {
    if (this.aipForm.valid) {
      const newProject: AIPProject = {
        apn: this.apnCounter++, 
        ...this.aipForm.value, 
      };
      this.projects.push(newProject); 
      this.aipForm.reset(); 
    }
  }

  viewProject(project: any): void {
    const dialogRef = this.dialog.open(AipDetailViewComponent, {
      data: project,
    });
}

editProject(project: AIPProject) {
    console.log("Editing project", project);
}

deleteProject(project: AIPProject): void {
  const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent);

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      console.log('Deleted project:', project);
      this.projects = this.projects.filter(p => p.apn !== project.apn);
    } else {
      console.log('Deletion canceled');
    }
  });
} 

}
