import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PpaPlanService } from '../common/services/ppa-plan.service';
import { PpaPlan } from '../common/model/ppa-plan.model';
import { PpaPlanContextDialogComponent } from './ppa-plan-context-dialog/ppa-plan-context-dialog.component';
import { PpaPlanFormComponent } from '../division-admin/ppa-plan/ppa-plan-form.component';
import { AuthService } from '../auth/auth.service';
import { UserType } from '../registration/user-type.enum';

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

  /** Currently selected date, or null */
  selectedDate: Date | null = null;

  /** Plans on the selected date that have an _id (for sidebar links) */
  get plansInSelectedDay(): PpaPlan[] {
    if (this.selectedDate === null) return [];
    return this.getPlansForDate(this.selectedDate).filter((p) => !!p._id);
  }

  /** Whether the given day (in current month) matches selectedDate (day, month, year) */
  isDaySelected(day: number | null): boolean {
    if (day === null || this.selectedDate === null) return false;
    return (
      this.selectedDate.getDate() === day &&
      this.selectedDate.getMonth() === this.currentMonth &&
      this.selectedDate.getFullYear() === this.currentYear
    );
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

  /** Main month grid: 6 rows × 7 columns. Each cell has unique id and day (null for empty). */
  monthGrid: { id: number; day: number | null }[][] = [];

  /** Today's date number (1–31) in the current month, or null if a different month */
  get todayDate(): number | null {
    const today = new Date();
    if (today.getMonth() === this.currentMonth && today.getFullYear() === this.currentYear) {
      return today.getDate();
    }
    return null;
  }

  isLoading = false;

  get isProgramHolder(): boolean {
    return this.authService.getActiveRole() === UserType.ProgramHolder;
  }

  constructor(
    private readonly ppaPlanService: PpaPlanService,
    private readonly dialog: MatDialog,
    private readonly authService: AuthService,
    private readonly breakpointObserver: BreakpointObserver,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.rebuildGrid();
    this.loadPlans();
  }

  /** Load PPA plans for the visible month using startDateFrom and startDateTo */
  loadPlans(): void {
    this.isLoading = true;
    const startDateFrom = this.getMonthStartDateString();
    const startDateTo = this.getMonthEndDateString();
    this.ppaPlanService.getList({ startDateFrom, startDateTo }).subscribe({
      next: (res) => {
        this.plans = Array.isArray(res.data) ? res.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private getMonthStartDateString(): string {
    const y = this.currentYear;
    const m = String(this.currentMonth + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  private getMonthEndDateString(): string {
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const y = this.currentYear;
    const m = String(this.currentMonth + 1).padStart(2, '0');
    const d = String(lastDay).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Plans that fall on a given day in the current month */
  getPlansForDay(day: number | null): PpaPlan[] {
    if (day === null) return [];
    const dateStr = this.toDateString(day);
    return this.plans.filter((plan) => this.planOverlapsDay(plan, dateStr));
  }

  /** Plans that fall on a given date (any month/year) */
  getPlansForDate(date: Date): PpaPlan[] {
    const dateStr = this.toDateStringFromDate(date);
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

  private toDateStringFromDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  selectDay(day: number | null): void {
    this.selectedDate = day !== null ? new Date(this.currentYear, this.currentMonth, day) : null;
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.selectedDate = null;
    this.rebuildGrid();
    this.loadPlans();
  }

  goPrev(): void {
    this.selectedDate = null;
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.rebuildGrid();
    this.loadPlans();
  }

  goNext(): void {
    this.selectedDate = null;
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.rebuildGrid();
    this.loadPlans();
  }

  trackByPlan(plan: any, index: number) { return plan._id ?? index; }

  /** Program/office display: division or officeDivision from officeId (string or populated object) */
  getPlanProgramDisplay(plan: PpaPlan): string {
    const office = plan.officeId;
    if (office == null) return '—';
    if (typeof office === 'string') return office || '—';
    const o = office as { division?: string; officeDivision?: string; code?: string; name?: string };
    return o?.code ?? o.name ?? o.division ?? '—';
  }

  /** Office code and assigned user: "o.code - p.name" when both exist */
  getPlanOfficeAndAssignedDisplay(plan: PpaPlan): string {
    const oCode = this.getPlanProgramDisplay(plan);
    const assigned = plan.assignedUserId;
    const pName =
      assigned == null
        ? ''
        : typeof assigned === 'object' && 'name' in assigned
          ? (assigned as { name?: string }).name ?? ''
          : '';
    if (oCode && oCode !== '—' && pName) return `${oCode} | ${pName}`;
    if (oCode && oCode !== '—') return oCode;
    if (pName) return pName;
    return '—';
  }

  /** Participants display: comma-separated list */
  getPlanParticipantsDisplay(plan: PpaPlan): string {
    const p = plan.participants;
    if (!Array.isArray(p) || p.length === 0) return '';
    return p.join(', ');
  }

  /** True if this plan shares at least one participant with another plan on the same day */
  hasParticipantConflict(plan: PpaPlan): boolean {
    const participants = plan.participants;
    if (!Array.isArray(participants) || participants.length === 0) return false;

    const toId = (p: string | { _id?: string }): string =>
      typeof p === 'string' ? p : (p as { _id?: string })?._id ?? '';
    const planIds = new Set(participants.map(toId).filter(Boolean));

    const others = this.plansInSelectedDay.filter((p) => p._id !== plan._id);
    return others.some((other) => {
      const op = other.participants;
      if (!Array.isArray(op)) return false;
      return op.some((x) => planIds.has(toId(x)));
    });
  }

  openCreatePlanModal(): void {
    if (this.selectedDate === null) {
      this.snackBar.open('Please select a day first', 'Close', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      });
      return;
    }
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(PpaPlanFormComponent, {
      width: isMobile ? '100vw' : 'min(900px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { initialDate: this.selectedDate },
      disableClose: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.loadPlans();
    });
  }

  openEditPlanModal(planId: string): void {
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(PpaPlanFormComponent, {
      width: isMobile ? '100vw' : 'min(900px, 95vw)',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: { planId },
      disableClose: false,
      panelClass: isMobile ? 'ppa-plan-dialog-mobile' : 'ppa-plan-dialog',
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.loadPlans();
    });
  }

  openPlanContext(plan: PpaPlan): void {
    const dialogRef = this.dialog.open(PpaPlanContextDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { plan },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'deleted') {
        this.loadPlans();
      } else if (result?.action === 'edit' && result?.planId) {
        this.openEditPlanModal(result.planId);
      }
    });
  }

  private rebuildGrid(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const flat: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) flat.push(null);
    for (let d = 1; d <= daysInMonth; d++) flat.push(d);
    while (flat.length < 42) flat.push(null);
    this.monthGrid = [];
    for (let row = 0; row < 6; row++) {
      const rowCells = flat.slice(row * 7, (row + 1) * 7).map((day, col) => ({
        id: row * 7 + col,
        day,
      }));
      this.monthGrid.push(rowCells);
    }
  }
}
