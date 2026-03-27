import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'school-year-widget-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './school-year-widget-filter.component.html',
  styleUrl: './school-year-widget-filter.component.css',
})
export class SchoolYearWidgetFilterComponent {
  @Input({ required: true }) schoolYear!: string;
  @Input({ required: true }) options!: readonly string[];
  @Input() disabled = false;
  /** Stable id when several filters share one page (label `for` / select `id`). */
  @Input() controlId = '';
  /** When false, toolbar content aligns to the start (e.g. tree column). Default matches chart toolbars. */
  @Input() alignEnd = true;

  @Output() readonly schoolYearChange = new EventEmitter<string>();

  private static idSeq = 0;
  private readonly fallbackId = `school-year-widget-filter-${SchoolYearWidgetFilterComponent.idSeq++}`;

  protected get resolvedControlId(): string {
    return this.controlId.trim() || this.fallbackId;
  }

  protected onSelectChange(value: string): void {
    this.schoolYearChange.emit(value);
  }
}
