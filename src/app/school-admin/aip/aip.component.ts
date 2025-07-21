import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AIPProject } from '../../interfaces/aip.model';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDeleteDialogComponent } from '../../table-button-dialog/confirm-delete-dialog/confirm-delete-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AipDetailViewComponent } from '../../table-button-dialog/confirm-delete-dialog/view button/aip-detail-view/aip-detail-view.component';
import {AipService} from "../../common/services/aip.service";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {Aip} from "../../common/model/aip.model";

@Component({
  selector: 'app-aip',
  standalone: true,
  imports: [MatFormField, CommonModule, MatFormFieldModule, MatTooltipModule, MatInputModule, MatSelectModule, MatButtonModule, MatCardModule, ReactiveFormsModule, MatIconButton, MatTableModule, MatIcon, MatPaginator],
  templateUrl: './aip.component.html',
  styleUrls: ['./aip.component.css'],
  providers: [MatDialog],
})
export class AipComponent implements OnInit {
  aipForm: FormGroup;
  displayedColumns: string[] = [ 'apn', 'title', 'totalBudget', 'schoolYear', 'status', 'actions'];
  projects: AIPProject[] = [];
  currentYear: number = new Date().getFullYear();
  pillars: string[] = ['Access', 'Equity', 'Quality', 'Learners Resiliency & Well-Being'];
  statuses: string[] = ['For Implementation', 'Ongoing', 'Completed', 'Incomplete', 'Unimplemented'];
  pageIndex: number = 0;
  pageSize: number = 10;
  dataSource = new MatTableDataSource<Aip>();
  totalAips: number = 0;

  constructor(
    private readonly fb: FormBuilder,
    protected dialog: MatDialog,
    private readonly aipService: AipService) {
    this.aipForm = this.fb.group({
      schoolYear: [this.currentYear, Validators.required],
      title: ['', Validators.required],
      objectives: ['', [Validators.required, Validators.maxLength(500)]],
      intermediateOutcome: ['', Validators.required],
      responsiblePerson: ['', Validators.required],
      materialsNeeded: ['', Validators.required],
      totalBudget: [100, [Validators.required, Validators.min(1)]],
      budgetSource: ['', Validators.required],
      status: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadAips();
  }

  onSubmit() {
    if (this.aipForm.valid) {
      const {intermediateOutcome, schoolYear, ...filteredValues} = this.aipForm.value;
      const newProject: Aip = {
        pillars: intermediateOutcome,
        schoolYear: `${schoolYear}`,
        ...filteredValues,
      };
      this.aipService.createAip(newProject).subscribe({
        next: (res) => {
          this.aipForm.reset({
            schoolYear: this.currentYear,
          }, { emitEvent: false });

          this.aipForm.markAsPristine();
          this.aipForm.markAsUntouched();
          this.loadAips();
        },
        error: (err) => { console.log('Component caught error:', err); }
      });
    }
  }

  viewProject(project: Aip): void {
    this.dialog.open(AipDetailViewComponent, {
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

  loadAips(): void {
    const page = this.pageIndex + 1;
    this.aipService.getAips(page, this.pageSize).subscribe(response => {
      this.dataSource.data = response.data;
      this.totalAips = response.data.total;
    })
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadAips();
  }
}
