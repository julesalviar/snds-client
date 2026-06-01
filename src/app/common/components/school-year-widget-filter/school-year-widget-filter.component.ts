import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getDefaultSchoolYear } from '../../date-utils';

@Component({
  selector: 'school-year-widget-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './school-year-widget-filter.component.html',
  styleUrl: './school-year-widget-filter.component.css',
})
export class SchoolYearWidgetFilterComponent implements OnInit, OnChanges {
  @Input({ required: true }) schoolYear!: string;
  @Input({ required: true }) options!: readonly string[];
  @Input() disabled = false;
  /** Stable id when several filters share one page (label `for` / select `id`). */
  @Input() controlId = '';
  /** When false, toolbar content aligns to the start (e.g. tree column). Default matches chart toolbars. */
  @Input() alignEnd = true;

  @Output() readonly schoolYearChange = new EventEmitter<string>();

  /** Bound with ngModel so the native select shows the correct option. */
  protected selectedYear = '';

  private static idSeq = 0;
  private readonly fallbackId = `school-year-widget-filter-${SchoolYearWidgetFilterComponent.idSeq++}`;

  protected get resolvedControlId(): string {
    return this.controlId.trim() || this.fallbackId;
  }

  ngOnInit(): void {
    this.syncSelectedFromInputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolYear'] || changes['options']) {
      this.syncSelectedFromInputs();
    }
  }

  protected onModelChange(value: string): void {
    this.selectedYear = value;
    this.schoolYearChange.emit(value);
  }

  private syncSelectedFromInputs(): void {
    const display = this.resolveDisplayYear();
    this.selectedYear = display;
    if (display !== this.schoolYear?.trim()) {
      this.schoolYearChange.emit(display);
    }
  }

  private resolveDisplayYear(): string {
    const current = getDefaultSchoolYear();
    const trimmed = this.schoolYear?.trim();
    if (trimmed && this.options.includes(trimmed)) {
      return trimmed;
    }
    if (this.options.includes(current)) {
      return current;
    }
    return this.options[0] ?? current;
  }
}
