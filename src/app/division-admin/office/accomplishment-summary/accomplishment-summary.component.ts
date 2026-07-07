import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, finalize } from 'rxjs';

import { PLAN_CLASSIFICATION } from '../../../common/enums/plan-classification.enum';
import { PpaPlan } from '../../../common/model/ppa-plan.model';
import { Office } from '../../../common/model/office.model';
import { PpaPlanService } from '../../../common/services/ppa-plan.service';
import { OfficeService } from '../../../common/services/office.service';
import { AuthService } from '../../../auth/auth.service';
import { PlanClassificationDisplayService } from '../../../common/services/plan-classification-display.service';

interface ClassificationSummary {
  ppaCount: number;
  completedCount: number;
  percentage: number;
}

interface DivisionAccomplishmentRow {
  division: string;
  displayName: string;
  classifications: Record<string, ClassificationSummary>;
}

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
    private readonly officeService: OfficeService,
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
  }

  private processData(ppas: PpaPlan[], offices: Office[], userOfficeIds?: string[]): void {
    const officeMap = new Map<string, Office>();
    offices.forEach((o) => officeMap.set(o._id, o));

    const officeIdSet = userOfficeIds?.length ? new Set(userOfficeIds) : null;

    const grouped = new Map<string, Map<string, { ppaCount: number; completedCount: number }>>();

    for (const ppa of ppas) {
      const officeId = typeof ppa.officeId === 'string' ? ppa.officeId : ppa.officeId?._id;
      if (!officeId) continue;
      if (officeIdSet && !officeIdSet.has(officeId)) continue;

      const office = officeMap.get(officeId);
      if (!office) continue;

      const division = office.division?.trim() || 'Unassigned';

      if (!grouped.has(division)) {
        grouped.set(division, new Map());
      }
      const classMap = grouped.get(division)!;

      const classification = ppa.classification;
      if (!classification) continue;

      if (!classMap.has(classification)) {
        classMap.set(classification, { ppaCount: 0, completedCount: 0 });
      }
      const data = classMap.get(classification)!;
      data.ppaCount++;
      if (ppa.implementationStatus === 'Fully Implemented') {
        data.completedCount++;
      }
    }

    const rows: DivisionAccomplishmentRow[] = [];

    grouped.forEach((classMap, division) => {
      const classifications: Record<string, ClassificationSummary> = {};

      for (const classification of this.classifications) {
        const raw = classMap.get(classification);
        const ppaCount = raw?.ppaCount ?? 0;
        const completedCount = raw?.completedCount ?? 0;
        classifications[classification] = {
          ppaCount,
          completedCount,
          percentage: this.calcPercentage(completedCount, ppaCount),
        };
      }

      rows.push({
        division,
        displayName: this.divisionDisplayNames[division] || division,
        classifications,
      });
    });

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
    this.computeTotals();
  }

  private computeTotals(): void {
    const totalsMap: Record<string, ClassificationSummary> = {};

    for (const classification of this.classifications) {
      let ppaCount = 0;
      let completedCount = 0;

      for (const row of this.dataSource) {
        const c = row.classifications[classification];
        if (c) {
          ppaCount += c.ppaCount;
          completedCount += c.completedCount;
        }
      }

      totalsMap[classification] = {
        ppaCount,
        completedCount,
        percentage: this.calcPercentage(completedCount, ppaCount),
      };
    }

    this.totals = totalsMap;
  }

  private calcPercentage(completed: number, total: number): number {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
