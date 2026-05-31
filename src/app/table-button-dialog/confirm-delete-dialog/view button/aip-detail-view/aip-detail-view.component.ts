import { Component, Inject, OnInit } from '@angular/core';
import { PillarConfigService } from '../../../../common/services/pillar-config.service';
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
export class AipDetailViewComponent implements OnInit {
  readonly formatAipSchoolYearsDisplay = formatAipSchoolYearsDisplay;
  pillarsDisplayLabel = '';

  constructor(
    private dialogRef: MatDialogRef<AipDetailViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Aip,
    private readonly pillarConfigService: PillarConfigService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.pillarConfigService.initialize();
      this.pillarsDisplayLabel = this.pillarConfigService.getDisplayLabel(
        this.data.pillars,
      );
    } catch {
      this.pillarsDisplayLabel = this.data.pillars ?? '';
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

