import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
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
  filter,
  forkJoin,
  from,
  map,
  Observable,
  of,
  shareReplay,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import {MatIcon} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {
  getResourceBreakdownSchoolYearOptions,
  getResourcePartnerBreakdownDefaultSchoolYear,
  getSchoolYear,
} from '../common/date-utils';
import {AipService} from "../common/services/aip.service";
import {AIP_STATUSES, AipStatus} from "../common/enums/aip-status.enum";
import {UserType} from "../registration/user-type.enum";
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from "@angular/material/card";
import {MatTooltipModule} from '@angular/material/tooltip';
import {SchoolInfo} from "../common/model/school.model";
import {InternalReferenceDataService} from "../common/services/internal-reference-data.service";
import {PpaPlanService} from "../common/services/ppa-plan.service";
import {PpaPlan} from "../common/model/ppa-plan.model";
import {CalendarNavigationService} from "../common/services/calendar-navigation.service";
import { FieldCheckerService } from '../common/services/utils/field-checker.service';
import { ActivityService } from '../common/services/activity.service';
import {
  ResourceGenerationsResponse,
  WidgetService,
  PartnersResponse,
} from '../common/services/widget.service';
import { Activity } from '../common/model/activity.model';
import { ActivityType } from '../common/enums/activity-type.enum';
import { formatDateString, formatTimeString } from '../common/date-utils';
import { UserListItem } from '../registration/user.model';
import { pickRandomMaterialColors } from '../common/utils/material-chart-colors';

echarts.use([LegendComponent, TooltipComponent, PieChart, CanvasRenderer]);

interface TreeNode {
  name: string;
  children?: TreeNode[];
  expanded?: boolean;
  count?: number;
}

/**
 * One pie segment for Resource / Partner breakdown.
 * Map from backend fields (examples): `{ label: row.categoryName, value: row.amountPesos }`.
 */
export interface HomePieSlice {
  label: string;
  value: number;
}

const PROFILE_INCOMPLETE_MESSAGE = 'Please upload school logo and school profile, and input the school location coordinates to access other functions. Check Edit Profile.';

interface HomeLoadingState {
  internalRefData: boolean;
  schoolNeeds: boolean;
  aipStats: boolean;
  upcomingPlans: boolean;
  partnershipActivities: boolean;
  /** Division-admin Resource & Partner breakdown pies (backend). */
  resourcePartnerBreakdown: boolean;
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
  partnershipActivities: Activity[];
  /** Backend: resource generation by category (monetary pie). */
  resourceGenerationBreakdown: HomePieSlice[];
  /** Backend: partner mix (percent pie). */
  partnersBreakdown: HomePieSlice[];
  /** School year filter for division-admin resource/partner breakdown (e.g. `2025-2026`). */
  resourcePartnerSchoolYear: string;
}

type HomeWidgetId =
  | 'ppaFeatures'
  | 'tree'
  | 'schoolContext'
  | 'ppaImplementation'
  | 'resourcePartner'
  | 'partnershipActivities'
  | 'upcomingEvents';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatBadgeModule,
    MatButtonModule,
    MatIcon,
    MatProgressBarModule,
    MatCardModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  providers: [DecimalPipe]
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('logoContainer') logoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('logoPreview') logoPreview!: ElementRef<HTMLDivElement>;
  @ViewChild('resourcePieHost') resourcePieHost?: ElementRef<HTMLDivElement>;
  @ViewChild('partnersPieHost') partnersPieHost?: ElementRef<HTMLDivElement>;

  protected readonly UserType = UserType;
  protected readonly AIP_STATUSES = AIP_STATUSES;
  /** Options for resource/partner breakdown school-year filter (2025-2026 … current year + 3). */
  protected readonly resourcePartnerSchoolYearOptions = getResourceBreakdownSchoolYearOptions();

  /** Accordion: when false, only the widget title row stays visible. */
  private homeWidgetExpanded: Record<HomeWidgetId, boolean> = {
    ppaFeatures: true,
    tree: true,
    schoolContext: true,
    ppaImplementation: true,
    resourcePartner: true,
    partnershipActivities: true,
    upcomingEvents: true,
  };

  private resourceBreakdownChart?: EChartsType;
  private partnersBreakdownChart?: EChartsType;
  private breakdownChartsResizeObserver?: ResizeObserver;
  /** `resize()` during the opening animation cancels ECharts’ first-render animation. */
  private breakdownChartsSuppressResizeUntil = 0;
  private breakdownChartsPostAnimateResizeTimer?: ReturnType<typeof setTimeout>;
  private breakdownChartsDomRetryCount = 0;
  private divisionBreakdownChartsSub?: Subscription;

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
    private readonly fieldCheckerService: FieldCheckerService,
    private readonly activityService: ActivityService,
    private readonly widgetService: WidgetService,
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

    this.divisionBreakdownChartsSub = this.homeState$
      .pipe(
        filter(
          (s) =>
            this.isDivisionAdmin(s) &&
            !s.loading.resourcePartnerBreakdown &&
            s.resourceGenerationBreakdown.length > 0 &&
            s.partnersBreakdown.length > 0,
        ),
      )
      .subscribe(() => {
        queueMicrotask(() => requestAnimationFrame(() => this.initDivisionAdminBreakdownCharts()));
      });

    this.buildLoadPipeline().subscribe({
      error: (err) => console.error('Home load error:', err),
    });
  }

  ngOnDestroy(): void {
    this.divisionBreakdownChartsSub?.unsubscribe();
    this.divisionBreakdownChartsSub = undefined;
    this.disposeDivisionAdminBreakdownCharts();
  }

  private getInitialState(): HomeState {
    const name = this.authService.getName();
    const userRole = this.authService.getActiveRole();
    if (!name || !userRole) console.warn('User information is incomplete.');
    const aipStatusStats = new Map<AipStatus, number>();
    AIP_STATUSES.forEach((s) => aipStatusStats.set(s, 0));
    const isDivisionAdmin = userRole === UserType.DivisionAdmin;
    return {
      loading: {
        internalRefData: true,
        schoolNeeds: true,
        aipStats: true,
        upcomingPlans: true,
        partnershipActivities: true,
        resourcePartnerBreakdown: isDivisionAdmin,
      },
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
      partnershipActivities: [],
      resourceGenerationBreakdown: [],
      partnersBreakdown: [],
      resourcePartnerSchoolYear: getResourcePartnerBreakdownDefaultSchoolYear(),
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
          this.loadResourcePartnerBreakdown$(s).pipe(
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
        switchMap((s) =>
          this.loadPartnershipActivitiesIfNeeded$(s).pipe(
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

  /**
   * Division-admin only: fetch resource + partner breakdown for pies.
   * `GET /widgets/resource-generations` and `GET /widgets/partners` (optional `schoolYear` query).
   */
  private loadResourcePartnerBreakdown$(state: HomeState): Observable<HomeState> {
    if (state.userRole !== UserType.DivisionAdmin) {
      return of({
        ...state,
        loading: { ...state.loading, resourcePartnerBreakdown: false },
      });
    }
    const schoolYear = state.resourcePartnerSchoolYear;
    const emptyResource: ResourceGenerationsResponse = { success: false, data: [], meta: { count: 0, timestamp: '' } };
    const emptyPartners: PartnersResponse = { success: false, data: [], meta: { count: 0, timestamp: '' } };

    return forkJoin({
      resource: this.widgetService.getResourceGenerations(schoolYear).pipe(
        catchError((err) => {
          console.error('Resource generations widget error:', err);
          return of(emptyResource);
        }),
      ),
      partners: this.widgetService.getPartners(schoolYear).pipe(
        catchError((err) => {
          console.error('Partners widget error:', err);
          return of(emptyPartners);
        }),
      ),
    }).pipe(
      map(({ resource, partners }) => {
        const resourceGenerationBreakdown: HomePieSlice[] =
          resource.success && Array.isArray(resource.data)
            ? resource.data.map((row) => ({ label: row.sector, value: row.totalAmount }))
            : [];
        const partnersBreakdown: HomePieSlice[] =
          partners.success && Array.isArray(partners.data)
            ? partners.data.map((row) => ({ label: row.sector, value: row.count }))
            : [];
        return {
          ...state,
          resourcePartnerSchoolYear: schoolYear,
          resourceGenerationBreakdown,
          partnersBreakdown,
          loading: { ...state.loading, resourcePartnerBreakdown: false },
        };
      }),
    );
  }

  onResourcePartnerSchoolYearChange(state: HomeState, schoolYear: string): void {
    if (schoolYear === state.resourcePartnerSchoolYear || state.loading.resourcePartnerBreakdown) {
      return;
    }
    this.disposeDivisionAdminBreakdownCharts();
    this.homeStateSubject.next({
      ...state,
      resourcePartnerSchoolYear: schoolYear,
      loading: { ...state.loading, resourcePartnerBreakdown: true },
    });
    const latest = this.homeStateSubject.getValue();
    this.loadResourcePartnerBreakdown$(latest).subscribe({
      next: (result) => this.homeStateSubject.next(result),
      error: (err) => console.error('Resource partner breakdown load error:', err),
    });
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

  /** Partnership engagement activities widget: school admin, division admin, stakeholder. */
  canShowPartnershipActivitiesWidget(state: HomeState): boolean {
    return (
      state.userRole === UserType.SchoolAdmin ||
      state.userRole === UserType.DivisionAdmin ||
      state.userRole === UserType.StakeHolder
    );
  }

  getPartnershipActivitiesListRoute(state: HomeState): string | null {
    if (state.userRole === UserType.SchoolAdmin) return '/school-admin/activities';
    if (state.userRole === UserType.DivisionAdmin) return '/division-admin/activities';
    return null;
  }

  /** Table layout: School + Activities columns (school / division admin). */
  isPartnershipActivitiesTableAdminView(state: HomeState): boolean {
    return state.userRole === UserType.SchoolAdmin || state.userRole === UserType.DivisionAdmin;
  }

  /** Table layout: List of activities column only (stakeholder). */
  isPartnershipActivitiesTableStakeholderView(state: HomeState): boolean {
    return state.userRole === UserType.StakeHolder;
  }

  formatPartnershipActivityDate(activity: Activity): string {
    const start = formatDateString(activity.startDatetime);
    if (!activity.endDatetime) return start;
    const end = formatDateString(activity.endDatetime);
    return start === end ? start : `${start} – ${end}`;
  }

  formatPartnershipActivityTime(activity: Activity): string {
    if (!activity.hasTime) return '—';
    const start = formatTimeString(activity.startDatetime);
    if (!activity.endDatetime) return start;
    const end = formatTimeString(activity.endDatetime);
    return start === end ? start : `${start} – ${end}`;
  }

  formatPartnershipActivityStakeholder(activity: Activity): string {
    const raw = activity.stakeholderId;
    if (!raw) return '—';
    if (typeof raw === 'object' && raw !== null) {
      const item = raw as UserListItem;
      return item.name ?? item.userName ?? item.email ?? '—';
    }
    return typeof raw === 'string' ? raw : '—';
  }

  formatPartnershipActivitySchool(activity: Activity): string {
    const raw = activity.schoolId;
    if (!raw) return '—';
    if (typeof raw === 'object' && raw !== null && 'schoolName' in raw) {
      return (raw as { schoolName?: string }).schoolName ?? '—';
    }
    return typeof raw === 'string' ? raw : '—';
  }

  private isPartnershipEngagementType(type: string | undefined): boolean {
    if (!type) return false;
    const n = type.toLowerCase().replace(/_/g, '');
    return n === 'partnershipengagement';
  }

  /**
   * Inclusive calendar-day window: first day of this month through last day of (this month + 6 months).
   * Values are date-only (YYYY-MM-DD) so the API can filter without time-of-day effects.
   */
  private getPartnershipActivitiesListDateRange(): { startDatetimeFrom: string; startDatetimeTo: string } {
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = new Date(now.getFullYear(), now.getMonth() + 7, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return {
      startDatetimeFrom: fmt(fromDate),
      startDatetimeTo: fmt(toDate),
    };
  }

  private loadPartnershipActivitiesIfNeeded$(state: HomeState): Observable<HomeState> {
    const role = state.userRole;
    if (
      role !== UserType.SchoolAdmin &&
      role !== UserType.DivisionAdmin &&
      role !== UserType.StakeHolder
    ) {
      return of({ ...state, loading: { ...state.loading, partnershipActivities: false } });
    }
    const { startDatetimeFrom, startDatetimeTo } = this.getPartnershipActivitiesListDateRange();
    return this.activityService
      .getList({
        page: 1,
        limit: 100,
        type: ActivityType.PartnershipEngagement,
        startDatetimeFrom,
        startDatetimeTo,
      })
      .pipe(
        map((res) => {
          const filtered = (res.data ?? []).filter((a) => this.isPartnershipEngagementType(a.type as string | undefined));
          const sorted = [...filtered].sort((a, b) => {
            const ta = a.startDatetime ? new Date(a.startDatetime).getTime() : 0;
            const tb = b.startDatetime ? new Date(b.startDatetime).getTime() : 0;
            return tb - ta;
          });
          return {
            ...state,
            loading: { ...state.loading, partnershipActivities: false },
            partnershipActivities: sorted.slice(0, 15),
          };
        }),
        catchError((err) => {
          console.error('Error loading partnership activities:', err);
          return of({
            ...state,
            loading: { ...state.loading, partnershipActivities: false },
            partnershipActivities: [],
          });
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

  protected isHomeWidgetExpanded(id: HomeWidgetId): boolean {
    return this.homeWidgetExpanded[id];
  }

  protected toggleHomeWidget(id: HomeWidgetId, event?: Event): void {
    event?.stopPropagation();
    const next = !this.homeWidgetExpanded[id];
    this.homeWidgetExpanded[id] = next;
    if (id === 'resourcePartner' && next) {
      queueMicrotask(() =>
        requestAnimationFrame(() => {
          this.resourceBreakdownChart?.resize();
          this.partnersBreakdownChart?.resize();
        }),
      );
    }
  }

  private readonly homeWidgetSectionLabels: Record<HomeWidgetId, string> = {
    ppaFeatures: 'Available Features',
    tree: 'school needs menu',
    schoolContext: 'school or division summary',
    ppaImplementation: 'PPA implementation status',
    resourcePartner: 'resource & partner breakdown',
    partnershipActivities: 'partnership activities',
    upcomingEvents: 'upcoming events',
  };

  /** Hover tooltip for the expand/collapse control. */
  protected homeWidgetToggleTooltip(id: HomeWidgetId): string {
    const label = this.homeWidgetSectionLabels[id];
    return this.isHomeWidgetExpanded(id) ? `Collapse ${label}` : `Expand ${label}`;
  }

  /**
   * Apache ECharts pie (see https://echarts.apache.org/examples/en/editor.html?c=pie-simple).
   * Initialized only when division-admin hosts exist in the template.
   */
  private initDivisionAdminBreakdownCharts(): void {
    if (this.resourceBreakdownChart) return;

    const resEl = this.resourcePieHost?.nativeElement;
    const partEl = this.partnersPieHost?.nativeElement;
    if (!resEl || !partEl) {
      if (
        this.authService.getActiveRole() === UserType.DivisionAdmin &&
        this.breakdownChartsDomRetryCount < 30
      ) {
        this.breakdownChartsDomRetryCount++;
        setTimeout(() => this.initDivisionAdminBreakdownCharts(), 50);
      }
      return;
    }
    this.breakdownChartsDomRetryCount = 0;

    const latest = this.homeStateSubject.getValue();
    const resourceSlices = latest.resourceGenerationBreakdown;
    const partnerSlices = latest.partnersBreakdown;
    if (!resourceSlices.length || !partnerSlices.length) return;

    /** Cover opening animation + stagger + partner delay (see buildBreakdownPieOption). */
    const resizeUnfreezeMs = 1850;
    this.breakdownChartsSuppressResizeUntil = performance.now() + resizeUnfreezeMs;
    this.clearBreakdownChartsPostAnimateResizeTimer();

    this.resourceBreakdownChart = echarts.init(resEl, undefined, { renderer: 'canvas' });
    this.partnersBreakdownChart = echarts.init(partEl, undefined, { renderer: 'canvas' });
    this.resourceBreakdownChart.setOption(
      this.buildBreakdownPieOption(resourceSlices, 'Resource generation', { type: 'monetary' }, 0),
    );
    this.partnersBreakdownChart.setOption(
      this.buildBreakdownPieOption(partnerSlices, 'Partners', { type: 'percent' }, 200),
    );

    this.breakdownChartsResizeObserver = new ResizeObserver(() => {
      if (performance.now() < this.breakdownChartsSuppressResizeUntil) return;
      this.resourceBreakdownChart?.resize();
      this.partnersBreakdownChart?.resize();
    });
    this.breakdownChartsResizeObserver.observe(resEl);
    this.breakdownChartsResizeObserver.observe(partEl);

    this.breakdownChartsPostAnimateResizeTimer = setTimeout(() => {
      this.breakdownChartsPostAnimateResizeTimer = undefined;
      this.breakdownChartsSuppressResizeUntil = 0;
      this.resourceBreakdownChart?.resize();
      this.partnersBreakdownChart?.resize();
    }, resizeUnfreezeMs);
  }

  private clearBreakdownChartsPostAnimateResizeTimer(): void {
    if (this.breakdownChartsPostAnimateResizeTimer != null) {
      clearTimeout(this.breakdownChartsPostAnimateResizeTimer);
      this.breakdownChartsPostAnimateResizeTimer = undefined;
    }
  }

  private disposeDivisionAdminBreakdownCharts(): void {
    this.clearBreakdownChartsPostAnimateResizeTimer();
    this.breakdownChartsSuppressResizeUntil = 0;
    this.breakdownChartsResizeObserver?.disconnect();
    this.breakdownChartsResizeObserver = undefined;
    this.resourceBreakdownChart?.dispose();
    this.partnersBreakdownChart?.dispose();
    this.resourceBreakdownChart = undefined;
    this.partnersBreakdownChart = undefined;
  }

  private buildBreakdownPieOption(
    slices: readonly HomePieSlice[],
    seriesName: string,
    display: { type: 'monetary' } | { type: 'percent' },
    animationBaseDelayMs = 0,
  ): EChartsCoreOption {
    const monetaryNumberFormat = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    type BreakdownPieParams = { name: string; value: number; percent: number };
    /** Above this length, monetary value is shown on the next line (slice labels only). */
    const monetaryNameWrapMinChars = 10;
    const formatBreakdownItem = (p: BreakdownPieParams, lineSep: string): string => {
      if (display.type === 'monetary') {
        const amount = monetaryNumberFormat.format(p.value);
        if (p.name.length > monetaryNameWrapMinChars) {
          return `${p.name}${lineSep}${amount}`;
        }
        return `${p.name} ${amount}`;
      }
      return `${p.name}${lineSep}${Math.round(p.percent)}%`;
    };

    /** Tooltip: `name` / `value` (`percent`%). */
    const formatBreakdownTooltip = (params: unknown): string => {
      const p = params as { name: string; value: number | string; percent: number };
      const raw = typeof p.value === 'number' ? p.value : Number(p.value);
      const valueStr =
        display.type === 'monetary' ? monetaryNumberFormat.format(raw) : `${raw}`;
      const pct = Math.round(p.percent);
      return `${p.name}<br/>${valueStr} (${pct}%)`;
    };

    const sliceStaggerMs = 95;
    const initialDurationMs = 1000;
    const chartColors = pickRandomMaterialColors(slices.length);

    return {
      color: chartColors,
      animation: true,
      animationDuration: initialDurationMs,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove|click',
        formatter: formatBreakdownTooltip,
      },
      legend: {
        bottom: '0%',
        left: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#333', fontSize: 11 },
        selectedMode: false,
      },
      series: [
        {
          name: seriesName,
          type: 'pie',
          radius: '57%',
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 2,
            borderColor: '#fff',
            borderWidth: 1,
          },
          label: {
            show: true,
            color: '#333',
            fontSize: 11,
            formatter: (params: unknown) => formatBreakdownItem(params as BreakdownPieParams, '\n'),
          },
          labelLine: {
            show: true,
            length: 12,
            length2: 8,
            lineStyle: { color: '#999', width: 1 },
          },
          animationType: 'expansion',
          animationDuration: initialDurationMs,
          animationEasing: 'cubicOut',
          animationDelay: (dataIndex: number) => animationBaseDelayMs + dataIndex * sliceStaggerMs,
          data: slices.map((s) => ({ value: s.value, name: s.label })),
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.28)',
            },
          },
        },
      ],
    };
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
