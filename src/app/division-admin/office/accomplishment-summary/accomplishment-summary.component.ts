import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';

import { PLAN_CLASSIFICATION } from '../../../common/enums/plan-classification.enum';
import { PpaPlanService, PpaPlanListParams } from '../../../common/services/ppa-plan.service';
import { AuthService } from '../../../auth/auth.service';
import { PlanClassificationDisplayService } from '../../../common/services/plan-classification-display.service';
import { ClassificationSummary, DivisionAccomplishmentRow, PpaPlan } from '../../../common/model/ppa-plan.model';

@Component({
  selector: 'app-accomplishment-summary',
  imports: [CommonModule, MatCardModule, MatProgressBarModule, MatIconModule, MatButtonModule],
  templateUrl: './accomplishment-summary.component.html',
  styleUrl: './accomplishment-summary.component.css',
})
export class AccomplishmentSummaryComponent implements OnInit {
  readonly classifications = PLAN_CLASSIFICATION;

  dataSource: DivisionAccomplishmentRow[] = [];
  totals: Record<string, ClassificationSummary> = {};
  isLoading = true;
  error: string | null = null;
  expandedCell: { division: string; classification: string; type: 'total' | 'completed' } | null = null;
  detailPpas: PpaPlan[] = [];
  isLoadingDetail = false;

  classificationColumns: { key: string; label: string }[] = [];

  constructor(
    private readonly ppaPlanService: PpaPlanService,
    private readonly authService: AuthService,
    readonly classificationDisplay: PlanClassificationDisplayService,
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

    this.ppaPlanService.getAccomplishmentSummary()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ rows, totals }) => {
          rows.sort((a, b) => a.division.localeCompare(b.division));
          for (const row of rows) {
            row.displayName ||= row.division;
          }
          this.dataSource = rows;
          this.totals = totals;
        },
        error: () => {
          this.error = 'Failed to load data. Please try again later.';
        },
      });
  }

  onCellClick(row: DivisionAccomplishmentRow, classification: string, type: 'total' | 'completed'): void {
    const key = `${row.division}|${classification}|${type}`;
    const currentKey = this.expandedCell
      ? `${this.expandedCell.division}|${this.expandedCell.classification}|${this.expandedCell.type}`
      : null;

    if (currentKey === key) {
      this.expandedCell = null;
      this.detailPpas = [];
      return;
    }

    this.expandedCell = { division: row.division, classification, type };
    this.isLoadingDetail = true;
    this.detailPpas = [];

    const baseParams: Omit<PpaPlanListParams, 'page' | 'limit'> = {
      classification,
      division: row.division,
      ...(type === 'completed' && { implementationStatus: 'Fully Implemented' }),
    };

    this.loadDetailPages(baseParams, 1);
    this.scrollToDetail();
  }

  private scrollToDetail(): void {
    setTimeout(() => {
      const el = document.querySelector('.expanded-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  getExpandedRowDisplayName(): string {
    const cell = this.expandedCell;
    if (!cell) return '';
    const row = this.dataSource.find(r => r.division === cell.division);
    return row ? row.displayName : cell.division;
  }

  private loadDetailPages(
    baseParams: Omit<PpaPlanListParams, 'page' | 'limit'>,
    page: number
  ): void {
    this.ppaPlanService.getList({ ...baseParams, page, limit: 1000 }).subscribe({
      next: ({ data, totalItems }) => {
        const cell = this.expandedCell;
        const expectedStatus = cell?.type === 'completed' ? 'Fully Implemented' : undefined;
        if (!cell || cell.division !== baseParams.division || cell.classification !== baseParams.classification || (baseParams.implementationStatus ?? undefined) !== expectedStatus) return;

        this.detailPpas.push(...data);
        if (page * 1000 < totalItems) {
          this.loadDetailPages(baseParams, page + 1);
        } else {
          this.isLoadingDetail = false;
        }
      },
      error: () => {
        const cell = this.expandedCell;
        const expectedStatus = cell?.type === 'completed' ? 'Fully Implemented' : undefined;
        if (!cell || cell.division !== baseParams.division || cell.classification !== baseParams.classification || (baseParams.implementationStatus ?? undefined) !== expectedStatus) return;
        this.isLoadingDetail = false;
      },
    });
  }
}
