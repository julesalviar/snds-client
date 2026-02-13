import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PpaPlanService } from '../common/services/ppa-plan.service';
import { PpaPlan } from '../common/model/ppa-plan.model';

/** Calendar UI inspired by calendar.google.com. Tasks are PPA plans. */
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRippleModule,
    MatTooltipModule,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent implements OnInit {
  /** Weekday labels for the grid header */
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /** PPA plans loaded from the service */
  plans: PpaPlan[] = [];

  /** Currently selected day (1–31) in the current month, or null */
  selectedDay: number | null = null;

  /** Plans on the selected day that have an _id (for sidebar links) */
  get plansInSelectedDay(): PpaPlan[] {
    if (this.selectedDay === null) return [];
    return this.getPlansForDay(this.selectedDay).filter((p) => !!p._id);
  }

  /** Current month (0–11) and year for the visible calendar */
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();

  /** Month label (e.g. "February 2025") */
  get monthLabel(): string {
    return new Date(this.currentYear, this.currentMonth).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  /** Main month grid: 6 rows × 7 columns. Empty cells are null. */
  monthGrid: (number | null)[][] = [];

  /** Today's date number (1–31) in the current month, or null if a different month */
  get todayDate(): number | null {
    const today = new Date();
    if (today.getMonth() === this.currentMonth && today.getFullYear() === this.currentYear) {
      return today.getDate();
    }
    return null;
  }

  isLoading = false;

  private hasInitialLoad = false;

  constructor(private readonly ppaPlanService: PpaPlanService) {}

  ngOnInit(): void {
    this.rebuildGrid();
    this.loadPlans();
  }

  /** Load PPA plans for the visible month range */
  loadPlans(): void {
    this.isLoading = true;
    this.ppaPlanService.getList({ limit: 500 }).subscribe({
      next: (res) => {
        this.plans = Array.isArray(res.data) ? res.data : [];
        if (!this.hasInitialLoad && this.plans.length > 0) {
          this.hasInitialLoad = true;
          this.navigateToFirstMonthWithPlansIfNeeded();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  /** When we have plans but none in the current month, jump to the first month that has plans */
  private navigateToFirstMonthWithPlansIfNeeded(): void {
    if (this.plans.length === 0) return;
    const firstDateStr = this.plans
      .map((p) => this.getPlanDateStr(p, 'implementationStartDate') ?? this.getPlanDateStr(p, 'implementation_start_date'))
      .filter((s): s is string => !!s)
      .sort()[0];
    if (!firstDateStr) return;
    const [y, m] = firstDateStr.split('-').map(Number);
    const planMonth = m - 1;
    if (this.currentYear !== y || this.currentMonth !== planMonth) {
      this.currentYear = y;
      this.currentMonth = planMonth;
      this.selectedDay = null;
      this.rebuildGrid();
    }
  }

  /** Plans that fall on a given day in the current month */
  getPlansForDay(day: number | null): PpaPlan[] {
    if (day === null) return [];
    const dateStr = this.toDateString(day);
    return this.plans.filter((plan) => this.planOverlapsDay(plan, dateStr));
  }

  private planOverlapsDay(plan: PpaPlan, dateStr: string): boolean {
    const start = this.getPlanDateStr(plan, 'implementationStartDate') ?? this.getPlanDateStr(plan, 'implementation_start_date');
    const end = this.getPlanDateStr(plan, 'implementationEndDate') ?? this.getPlanDateStr(plan, 'implementation_end_date') ?? start;
    if (!start) return false;
    return dateStr >= start && dateStr <= (end ?? start);
  }

  private getPlanDateStr(plan: PpaPlan, key: string): string | undefined {
    const value = (plan as unknown as Record<string, unknown>)[key];
    return this.normalizeDateString(value as string | Date | undefined);
  }

  private normalizeDateString(value: string | Date | undefined | { $date?: string }): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object' && value !== null && '$date' in value) {
      const d = (value as { $date: string }).$date;
      return typeof d === 'string' ? d.slice(0, 10) : undefined;
    }
    return undefined;
  }

  private toDateString(day: number): string {
    const y = this.currentYear;
    const m = String(this.currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  selectDay(day: number | null): void {
    console.log('Selected day:', day);
    this.selectedDay = day;
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.selectedDay = null;
    this.rebuildGrid();
  }

  goPrev(): void {
    this.selectedDay = null;
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.rebuildGrid();
  }

  goNext(): void {
    this.selectedDay = null;
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.rebuildGrid();
  }

  trackByPlan(plan: any, index: number) { return plan._id ?? index; }

  private rebuildGrid(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const flat: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) flat.push(null);
    for (let d = 1; d <= daysInMonth; d++) flat.push(d);
    while (flat.length < 42) flat.push(null);
    this.monthGrid = [];
    for (let row = 0; row < 6; row++) {
      this.monthGrid.push(flat.slice(row * 7, (row + 1) * 7));
    }
  }
}
