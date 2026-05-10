import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardTitle, MatCard, MatCardContent } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import {Aip} from "../../../../common/model/aip.model";
import { formatAipSchoolYearsDisplay } from "../../../../common/date-utils";


@Component({
  selector: 'app-aip-detail-view',
  imports: [MatCardTitle, MatCard, MatCardContent, ReactiveFormsModule, CommonModule],
  templateUrl: './aip-detail-view.component.html',
  styleUrl: './aip-detail-view.component.css',
})
export class AipDetailViewComponent {
  readonly formatAipSchoolYearsDisplay = formatAipSchoolYearsDisplay;

  constructor(
    private dialogRef: MatDialogRef<AipDetailViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Aip
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}

