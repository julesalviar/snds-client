import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';

import { PLAN_CLASSIFICATION } from '../../../common/enums/plan-classification.enum';
import { PpaPlanService } from '../../../common/services/ppa-plan.service';
import { AuthService } from '../../../auth/auth.service';
import { PlanClassificationDisplayService } from '../../../common/services/plan-classification-display.service';
import { ClassificationSummary, DivisionAccomplishmentRow } from '../../../common/model/ppa-plan.model';

@Component({
  selector: 'app-accomplishment-summary',
  imports: [CommonModule, MatCardModule, MatProgressBarModule],
  templateUrl: './accomplishment-summary.component.html',
  styleUrl: './accomplishment-summary.component.css',
})
export class AccomplishmentSummaryComponent implements OnInit {
  readonly classifications = PLAN_CLASSIFICATION;

  private readonly divisionDisplayNames: Record<string, string> = {
    'Curriculum Implementation Division': 'Curriculum Implementation Division (CID)',
    'School Governance & Operations Division': 'School Governance & Operations Division (SGOD)',
    'Office of the Division Superintendent': 'Office of the Division Superintendent (OSDS)',
  };

  private readonly divisionOrder: Record<string, number> = {
    'Curriculum Implementation Division': 1,
    'School Governance & Operations Division': 2,
    'Office of the Division Superintendent': 3,
  };

  dataSource: DivisionAccomplishmentRow[] = [];
  totals: Record<string, ClassificationSummary> = {};
  isLoading = true;
  error: string | null = null;

  classificationColumns: { key: string; label: string }[] = [];

  constructor(
    private readonly ppaPlanService: PpaPlanService,
    private readonly authService: AuthService,
    private readonly classificationDisplay: PlanClassificationDisplayService,
  ) {}

  ngOnInit(): void {
    this.classificationColumns = this.classifications.map((c) => ({
      key: c,
      label: this.classificationDisplay.getDisplayText(c).replace(/^Outcome \d+:\s*/i, ''),
    }));
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.error = null;

    const officeIds = this.authService.getOfficeIds();
    const params = officeIds.length ? { officeIds } : undefined;

    this.ppaPlanService.getAccomplishmentSummary(params)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ rows, totals }) => {
          for (const row of rows) {
            row.displayName = this.divisionDisplayNames[row.division] || row.division;
          }

          for (const [division, displayName] of Object.entries(this.divisionDisplayNames)) {
            if (!rows.some((r) => r.division === division)) {
              const classifications: Record<string, ClassificationSummary> = {};
              for (const c of this.classifications) {
                classifications[c] = { ppaCount: 0, completedCount: 0, percentage: 0 };
              }
              rows.push({ division, displayName, classifications });
            }
          }

          rows.sort((a, b) => {
            const aOrder = this.divisionOrder[a.division] ?? 99;
            const bOrder = this.divisionOrder[b.division] ?? 99;
            return aOrder - bOrder || a.division.localeCompare(b.division);
          });

          this.dataSource = rows;
          this.totals = totals;
        },
        error: () => {
          this.error = 'Failed to load data. Please try again later.';
        },
      });
  }}
