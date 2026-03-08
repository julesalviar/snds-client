import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {UserService} from '../common/services/user.service';
import {CommonModule, DecimalPipe} from '@angular/common';
import {MatBadgeModule} from '@angular/material/badge';
import {Router, RouterLink} from '@angular/router';
import {ReferenceDataService} from "../common/services/reference-data.service";
import {SchoolNeedService} from "../common/services/school-need.service";
import {AuthService} from "../auth/auth.service";
import {
  BehaviorSubject,
  catchError,
  defer,
  forkJoin,
  from,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap
} from "rxjs";
import {MatIcon} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {getSchoolYear} from "../common/date-utils";
import {AipService} from "../common/services/aip.service";
import {AIP_STATUSES, AipStatus} from "../common/enums/aip-status.enum";
import {UserType} from "../registration/user-type.enum";
import {MatCardModule} from "@angular/material/card";
import {SchoolInfo} from "../common/model/school.model";
import {InternalReferenceDataService} from "../common/services/internal-reference-data.service";
import {PpaPlanService} from "../common/services/ppa-plan.service";
import {PpaPlan} from "../common/model/ppa-plan.model";
import {CalendarNavigationService} from "../common/services/calendar-navigation.service";
import { FieldCheckerService } from '../common/services/utils/field-checker.service';

interface TreeNode {
  name: string;
  children?: TreeNode[];
  expanded?: boolean;
  count?: number;
}

const PROFILE_INCOMPLETE_MESSAGE = 'Please upload School logo / input the School location coordinates to access other functions. Check Edit Profile.';

interface HomeLoadingState {
  internalRefData: boolean;
  schoolNeeds: boolean;
  aipStats: boolean;
  upcomingPlans: boolean;
}

/** Full home view state – single source for template; use with async pipe. */
export interface HomeState {
  loading: HomeLoadingState;
  name: string | undefined;
  userRole: string | undefined;
  treeData: TreeNode[];
  schoolNeedData: any[];
  schoolInfo: SchoolInfo | null;
  divisionName: string;
  divisionLogoUrl: string | null;
  schoolLogoUrl: string | null;
  logoError: boolean;
  aipStatusStats: Map<AipStatus, number>;
  totalAips: number;
  upcomingPlans: PpaPlan[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, MatIcon, MatProgressBarModule, MatCardModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  providers: [DecimalPipe]
})
export class HomeComponent implements OnInit {
  @ViewChild('logoContainer') logoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('logoPreview') logoPreview!: ElementRef<HTMLDivElement>;

  protected readonly UserType = UserType;
  protected readonly AIP_STATUSES = AIP_STATUSES;

  /** Single stream for template – use with async pipe. No manual subscriptions. */
  readonly homeState$: Observable<HomeState>;

  private readonly homeStateSubject: BehaviorSubject<HomeState>;

  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly referenceDataService: ReferenceDataService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly authService: AuthService,
    private readonly aipService: AipService,
    private readonly ppaPlanService: PpaPlanService,
    private readonly calendarNavigationService: CalendarNavigationService,
    private readonly decimalPipe: DecimalPipe,
    private readonly fieldCheckerService: FieldCheckerService
  ) {
    const initial = this.getInitialState();
    this.homeStateSubject = new BehaviorSubject(initial);
    this.homeState$ = this.homeStateSubject.asObservable().pipe(shareReplay(1));
  }

  ngOnInit(): void {
    const isAdmin = this.authService.getActiveRole() === UserType.SchoolAdmin;
    if (isAdmin) {
      this.checkProfileCompleteness();
    }

    this.buildLoadPipeline().subscribe({
      error: (err) => console.error('Home load error:', err),
    });
  }

  private getInitialState(): HomeState {
    const name = this.authService.getName();
    const userRole = this.authService.getActiveRole();
    if (!name || !userRole) console.warn('User information is incomplete.');
    const aipStatusStats = new Map<AipStatus, number>();
    AIP_STATUSES.forEach((s) => aipStatusStats.set(s, 0));
    return {
      loading: {internalRefData: true, schoolNeeds: true, aipStats: true, upcomingPlans: true},
      name,
      userRole,
      treeData: [],
      schoolNeedData: [],
      schoolInfo: null,
      divisionName: '',
      divisionLogoUrl: null,
      schoolLogoUrl: null,
      logoError: false,
      aipStatusStats,
      totalAips: 0,
      upcomingPlans: [],
    };
  }

  private buildLoadPipeline(): Observable<HomeState> {
    return defer(() => {
      const initial = this.getInitialState();
      return of(initial).pipe(
        switchMap((s) =>
          this.loadInternalRefData$(s).pipe(
            tap((result) => this.homeStateSubject.next(result)),
          ),
        ),
        switchMap((s) =>
          this.loadSchoolNeeds$(s).pipe(
            tap((result) => this.homeStateSubject.next(result)),
          ),
        ),
        switchMap((s) =>
          this.loadAipStatsIfNeeded$(s).pipe(
            tap((result) => this.homeStateSubject.next(result)),
          ),
        ),
        switchMap((s) =>
          this.loadUpcomingPlansIfNeeded$(s).pipe(
            tap((result) => this.homeStateSubject.next(result)),
          ),
        ),
      );
    });
  }

  private loadInternalRefData$(state: HomeState): Observable<HomeState> {
    return from(this.internalReferenceDataService.initialize()).pipe(
      map(() => {
        const division = this.internalReferenceDataService.get('division');
        return {
          ...state,
          loading: { ...state.loading, internalRefData: false },
          divisionName: division?.divisionName ?? '',
          divisionLogoUrl: division?.logoUrl ?? null,
          logoError: false,
        };
      }),
      catchError((err) => {
        console.error('Error loading internal ref:', err);
        return of({ ...state, loading: { ...state.loading, internalRefData: false } });
      }),
    );
  }

  toggleChildren(state: HomeState, node: TreeNode): void {
    if (!node.children?.length) return;
    const next = this.toggleNodeExpanded(state.treeData, node);
    this.homeStateSubject.next({ ...state, treeData: next });
  }

  private toggleNodeExpanded(tree: TreeNode[], target: TreeNode): TreeNode[] {
    return tree.map((n) =>
      n === target
        ? { ...n, expanded: !n.expanded }
        : n.children
          ? { ...n, children: this.toggleNodeExpanded(n.children, target) }
          : n,
    );
  }

  async onChildClick(child: TreeNode, state: HomeState): Promise<void> {
    const parentName = state.treeData.find((node) => node.children?.includes(child))?.name;
    this.userService.setContribution({ name: parentName, specificContribution: child.name });
    let path: string;
    const queryParams: Record<string, string> = {};
    const role = state.userRole;
    switch (role) {
      case UserType.SchoolAdmin: {
        const { isComplete } = await this.checkProfileCompleteness();
        if (!isComplete) return;
        path = '/school-admin/school-needs';
        break;
      }
      case UserType.DivisionAdmin:
        path = '/division-admin/school-needs';
        break;
      case UserType.StakeHolder:
        path = '/stakeholder/school-needs';
        queryParams['selectedContribution'] = child.name;
        break;
      default:
        path = '/guest/school-needs';
        queryParams['selectedContribution'] = child.name;
        if (role) console.warn(`Unknown or undefined role: ${role}`);
        break;
    }
    this.router.navigate([path], { queryParams });
}

  private loadSchoolNeeds$(state: HomeState): Observable<HomeState> {
    if (
      state.userRole === UserType.ProgramHolder ||
      state.userRole === UserType.OfficeAdmin ||
      state.userRole === UserType.OfficeAdminAssistant
    ) {
      return of({ ...state, loading: { ...state.loading, schoolNeeds: false } });
    }
    return forkJoin({
      tree: of(this.referenceDataService.get<TreeNode[]>('contributionTree')),
      needs: this.fetchAllSchoolNeedsData(),
    }).pipe(
      map(({ tree, needs }) => {
        const treeWithCounts = this.mapCountsToTreeData(tree, needs.data);
        return {
          ...state,
          loading: { ...state.loading, schoolNeeds: false },
          treeData: treeWithCounts,
          schoolNeedData: needs.data,
          schoolInfo: needs.schoolInfo,
          schoolLogoUrl: needs.schoolInfo?.logoUrl ?? null,
          logoError: false,
        };
      }),
      catchError((err) => {
        console.error('Error fetching school needs:', err);
        return of({ ...state, loading: { ...state.loading, schoolNeeds: false } });
      }),
    );
  }

  private fetchAllSchoolNeedsData(
    page = 1,
    size = 10000,
    acc: any[] = [],
    schoolName = '',
    schoolInfo: SchoolInfo | null = null,
  ): Observable<{ data: any[]; schoolName: string; schoolInfo: SchoolInfo | null }> {
    return this.schoolNeedService
      .getSchoolNeeds(page, size, getSchoolYear(), undefined, undefined, true)
      .pipe(
        switchMap((res) => {
          const currentData = res?.data ?? [];
          const allData = [...acc, ...currentData];
          const sn = page === 1 && res?.school ? res.school.schoolName || '' : schoolName;
          const si = page === 1 && res?.school ? res.school : schoolInfo;
          if (currentData.length < size) {
            return of({ data: allData, schoolName: sn, schoolInfo: si });
          }
          return this.fetchAllSchoolNeedsData(page + 1, size, allData, sn, si);
        }),
      );
  }

  private mapCountsToTreeData(tree: TreeNode[], needs: any[]): TreeNode[] {
    const out = JSON.parse(JSON.stringify(tree)) as TreeNode[];
    for (const node of out) {
      if (node.children) {
        for (const child of node.children) {
          const specificNeeds = needs.filter((n: any) => n.specificContribution === child.name);
          let count = specificNeeds.reduce((sum: number, n: any) => {
            const totalEngaged = (n.engagements ?? []).reduce(
              (engAcc: number, eng: any) => engAcc + (eng.quantity ?? 0),
              0,
            );
            return sum + (n.quantity ?? 0) - totalEngaged;
          }, 0);
          child.count = count <= 0 ? undefined : count;
        }
      }
    }
    return out;
  }

  private loadAipStatsIfNeeded$(state: HomeState): Observable<HomeState> {
    const role = state.userRole;
    if (role !== UserType.SchoolAdmin && role !== UserType.DivisionAdmin) {
      return of({ ...state, loading: { ...state.loading, aipStats: false } });
    }
    const schoolId = role === UserType.SchoolAdmin ? this.authService.getSchoolId() : undefined;
    return this.fetchAllAips(1, 1000, [], schoolId).pipe(
      map((aips) => {
        const stats = new Map<AipStatus, number>();
        AIP_STATUSES.forEach((s) => stats.set(s, 0));
        aips.forEach((aip: any) => {
          if (aip.status && stats.has(aip.status)) {
            stats.set(aip.status, (stats.get(aip.status) ?? 0) + 1);
          }
        });
        return {
          ...state,
          loading: { ...state.loading, aipStats: false },
          aipStatusStats: stats,
          totalAips: aips.length,
        };
      }),
      catchError((err) => {
        console.error('Error loading AIP statistics:', err);
        return of({ ...state, loading: { ...state.loading, aipStats: false } });
      }),
    );
  }

  private fetchAllAips(page: number, size: number, acc: any[] = [], schoolId?: string): Observable<any[]> {
    return this.aipService.getAips(page, size, schoolId).pipe(
      switchMap(res => {
        const currentData = res?.data ?? [];
        const allData = [...acc, ...currentData];

        if (currentData.length < size) {
          return of(allData);
        }

        return this.fetchAllAips(page + 1, size, allData, schoolId);
      })
    );
  }

  private loadUpcomingPlansIfNeeded$(state: HomeState): Observable<HomeState> {
    if (
      state.userRole !== UserType.ProgramHolder &&
      state.userRole !== UserType.OfficeAdmin &&
      state.userRole !== UserType.OfficeAdminAssistant
    ) {
      return of({ ...state, loading: { ...state.loading, upcomingPlans: false } });
    }
    const today = new Date();
    const dateFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const dateTo = `${sixMonthsLater.getFullYear()}-${String(sixMonthsLater.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsLater.getDate()).padStart(2, '0')}`;
    return forkJoin({
      byStart: this.ppaPlanService.getList({ startDateFrom: dateFrom, startDateTo: dateTo }),
      byEnd: this.ppaPlanService.getList({ endDateFrom: dateFrom, endDateTo: dateTo }),
    }).pipe(
      map(({ byStart, byEnd }) => {
        const startPlans = Array.isArray(byStart.data) ? byStart.data : [];
        const endPlans = Array.isArray(byEnd.data) ? byEnd.data : [];
        const seen = new Set<string>();
        const merged = [...startPlans, ...endPlans].filter((p) => {
          const id = p._id ?? '';
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        const sorted = merged.sort((a, b) => {
          const aStart = a.implementationStartDate ?? (a as unknown as Record<string, string>)?.['implementation_start_date'] ?? '';
          const bStart = b.implementationStartDate ?? (b as unknown as Record<string, string>)?.['implementation_start_date'] ?? '';
          return aStart.localeCompare(bStart);
        });
        return {
          ...state,
          loading: { ...state.loading, upcomingPlans: false },
          upcomingPlans: sorted.slice(0, 9),
        };
      }),
      catchError((err) => {
        console.error('Error loading upcoming plans:', err);
        return of({ ...state, loading: { ...state.loading, upcomingPlans: false }, upcomingPlans: [] });
      }),
    );
  }

  /** Whether the user can see the upcoming events widget (office-admin, assistant-office-admin, program-holders). */
  canShowUpcomingEventsWidget(state: HomeState): boolean {
    return (
      state.userRole === UserType.OfficeAdmin ||
      state.userRole === UserType.OfficeAdminAssistant ||
      state.userRole === UserType.ProgramHolder
    );
  }

  /** Calendar route based on user role. */
  getCalendarRoute(state: HomeState): string {
    return state.userRole === UserType.ProgramHolder ? '/program-holder/calendar' : '/office-admin/calendar';
  }

  /** Format plan date for display. If span > 1 day, show dateStart-dateEnd; else dateStart. */
  getPlanDisplayDate(plan: PpaPlan): string {
    const startStr = plan.implementationStartDate ?? (plan as unknown as Record<string, string>)?.['implementation_start_date'];
    if (!startStr) return '—';
    const endStr = plan.implementationEndDate ?? (plan as unknown as Record<string, string>)?.['implementation_end_date'];
    const startDate = new Date(startStr);
    const endDate = new Date(endStr ?? startStr);
    const daysBetween = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysBetween > 1) {
      const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startFormatted} – ${endFormatted}`;
    }
    return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Plan title for display (ppn + title when available). */
  getUpcomingPlanTitle(plan: PpaPlan): string {
    return plan.ppn != null ? `#${plan.ppn}: ${plan.title}` : plan.title;
  }

  /** Called when clicking an upcoming event: set plan for calendar to open dialog. */
  onUpcomingEventClick(plan: PpaPlan): void {
    this.calendarNavigationService.setPlanToOpen(plan);
  }

  /** Office code from officeId (string or populated object). */
  getPlanOfficeCode(plan: PpaPlan): string {
    const office = plan.officeId;
    if (office == null) return '—';
    if (typeof office === 'string') return office || '—';
    const o = office as { code?: string; name?: string; division?: string };
    return o?.code ?? o.name ?? o.division ?? '—';
  }

  /** Assigned user display name. */
  getPlanAssignedUser(plan: PpaPlan): string {
    const assigned = plan.assignedUserId;
    if (assigned == null) return '—';
    if (typeof assigned === 'object' && 'name' in assigned) {
      return (assigned as { name?: string }).name ?? '—';
    }
    return '—';
  }

  /** Participants display: comma-separated (handles string[] or object[] with name). */
  getPlanParticipants(plan: PpaPlan): string {
    const p = plan.participants;
    if (!Array.isArray(p) || p.length === 0) return '—';
    return p
      .map((x) => (typeof x === 'string' ? x : (x as { name?: string })?.name ?? ''))
      .filter(Boolean)
      .join(', ') || '—';
  }

  getStatusPercentage(state: HomeState, status: AipStatus): number {
    if (state.totalAips === 0) return 0;
    const count = state.aipStatusStats.get(status) || 0;
    return Math.round((count / state.totalAips) * 100);
  }

  getStatusCountFormatted(state: HomeState, status: AipStatus): string {
    const count = state.aipStatusStats.get(status) || 0;
    const formattedCount = this.decimalPipe.transform(count, '1.0-2');
    const formattedTotal = this.decimalPipe.transform(state.totalAips, '1.0-2');
    return `${formattedCount}/${formattedTotal}`;
  }

  isSchoolAdmin(state: HomeState): boolean {
    return state.userRole === UserType.SchoolAdmin;
  }

  isDivisionAdmin(state: HomeState): boolean {
    return state.userRole === UserType.DivisionAdmin;
  }

  shouldShowStats(state: HomeState): boolean {
    return this.isSchoolAdmin(state) || this.isDivisionAdmin(state);
  }

  /** Hide tree section for program holder, office admin, and office admin assistant. */
  shouldHideTreeSection(state: HomeState): boolean {
    return (
      state.userRole === UserType.ProgramHolder ||
      state.userRole === UserType.OfficeAdmin ||
      state.userRole === UserType.OfficeAdminAssistant
    );
  }

  isHeaderLoading(state: HomeState): boolean {
    if (this.isDivisionAdmin(state)) return state.loading.internalRefData;
    if (this.isSchoolAdmin(state)) return state.loading.schoolNeeds;
    return false;
  }

  getWelcomeHeaderName(state: HomeState): string {
    switch (state.userRole) {
      case UserType.SchoolAdmin:
        return state.schoolInfo?.schoolName ?? '';
      case UserType.DivisionAdmin:
        return state.divisionName;
      default:
        return '-';
    }
  }

  navigateToAip(): void {
    this.router.navigate(['/school-admin/aip']);
  }

  onLogoError(state: HomeState): void {
    this.homeStateSubject.next({ ...state, logoError: true });
  }

  onLogoHover(event: MouseEvent): void {
    if (this.logoContainer && this.logoPreview) {
      const rect = this.logoContainer.nativeElement.getBoundingClientRect();
      const preview = this.logoPreview.nativeElement;
      const top = rect.top + rect.height / 2;
      const left = rect.right + 16;
      preview.style.top = `${top}px`;
      preview.style.left = `${left}px`;
      preview.style.transform = 'translateY(-50%)';
    }
  }

  /** Checks profile completeness and shows snackbar if incomplete. Returns { isComplete }. */
  private async checkProfileCompleteness(): Promise<{ isComplete: boolean }> {
    try {
      const result = await this.fieldCheckerService.checkRequiredProfileData();
      if (!result.isComplete) {
        this.fieldCheckerService.openSnackbar(PROFILE_INCOMPLETE_MESSAGE);
      }
      return result;
    } catch (err) {
      console.error('Error checking profile data:', err);
      return { isComplete: false };
    }
  }
}
