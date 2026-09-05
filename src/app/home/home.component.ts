import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import {UserService} from '../common/services/user.service';
import {CommonModule, DecimalPipe} from '@angular/common';
import {MatBadgeModule} from '@angular/material/badge';
import {Router, RouterLink} from '@angular/router';
import {ReferenceDataService} from "../common/services/reference-data.service";
import {SchoolService} from "../common/services/school.service";
import {AuthService} from "../auth/auth.service";
import {
  BehaviorSubject,
  catchError,
  defer,
  EMPTY,
  filter,
  forkJoin,
  from,
  map,
  merge,
  Observable,
  of,
  shareReplay,
  switchMap,
  Subscription,
  tap,
} from 'rxjs';
import {MatIcon} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {
  getSchoolYearOptions,
  getCurrentSchoolYear,
} from '../common/date-utils';
import {AIP_STATUSES, AipStatus} from "../common/enums/aip-status.enum";
import {UserType} from "../registration/user-type.enum";
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from "@angular/material/card";
import {MatTooltipModule} from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {SchoolInfo} from "../common/model/school.model";
import {InternalReferenceDataService} from "../common/services/internal-reference-data.service";
import {PpaPlanService} from "../common/services/ppa-plan.service";
import {PpaPlan} from "../common/model/ppa-plan.model";
import {CalendarNavigationService} from "../common/services/calendar-navigation.service";
import { FieldCheckerService } from '../common/services/utils/field-checker.service';
import { getDisplayInitials } from '../common/string-utils';
import { ActivityService } from '../common/services/activity.service';
import {
  ResourceGenerationsResponse,
  WidgetService,
  PartnersResponse,
  AipStatusStatsResponse,
  SchoolNeedContributionCountsResponse,
  ActivePartnerItem,
} from '../common/services/widget.service';
import { Activity } from '../common/model/activity.model';
import { ActivityType } from '../common/enums/activity-type.enum';
import { formatDateString, formatDateTimeString, formatTimeString } from '../common/date-utils';
import { ChangeRequestService } from '../common/services/change-request.service';
import {
  ChangeRequest,
  ChangeRequestStatus,
  getChangeRequestTypeIcon,
  getChangeRequestTypeLabel,
} from '../common/model/change-request.model';
import { UserListItem } from '../registration/user.model';
import { pickRandomMaterialColors } from '../common/utils/material-chart-colors';
import { SchoolYearWidgetFilterComponent } from '../common/components/school-year-widget-filter/school-year-widget-filter.component';
import { VisitorCounterWidgetComponent } from '../common/components/visitor-counter-widget/visitor-counter-widget.component';
import { canShowHomeVisitorCounterWidget } from '../common/utils/visitor-counter-visibility.util';
import { MatDialog } from '@angular/material/dialog';
import { AnnouncementService } from '../common/services/announcement.service';
import { AnnouncementDismissalService } from '../common/services/announcement-dismissal.service';
import { Announcement } from '../common/model/announcement.model';
import {
  AnnouncementDialogComponent,
  AnnouncementDialogResult,
} from './announcement-dialog/announcement-dialog.component';
import { pickWeightedActivePartners } from './pick-weighted-active-partners.util';
import { resolveActivePartnersSchoolYear, DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS } from '../common/utils/active-partners-widget-settings.util';
import {
  ContributionSearchOption,
  ContributionTreeNode,
  filterContributionSearchOptions,
  flattenContributionTree,
  mapCountsToContributionTree,
} from '../common/utils/contribution-tree.util';

const ACTIVE_PARTNERS_FADE_MS = 1500;

type TreeNode = ContributionTreeNode;

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
  pendingChangeRequests: boolean;
  activePartners: boolean;
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
  aipStatusPercentageDisplays: Map<AipStatus, string>;
  totalAips: number;
  upcomingPlans: PpaPlan[];
  partnershipActivities: Activity[];
  /** Backend: resource generation by category (monetary pie). */
  resourceGenerationBreakdown: HomePieSlice[];
  /** Backend: partner mix (percent pie). */
  partnersBreakdown: HomePieSlice[];
  /** School year filter for division-admin resource/partner breakdown (e.g. `2025-2026`). */
  resourcePartnerSchoolYear: string;
  /** School year filter for AIP implementation status widget (e.g. `2025-2026`). */
  aipStatsSchoolYear: string;
  /** School year for the home tree filter; passed to school-needs API for tree counts. */
  treeSchoolYear: string;
  /** School year filter for active partners widget (e.g. `2025-2026`). */
  activePartnersSchoolYear: string;
  /** Seconds between automatic partner transitions on the active partners widget. */
  activePartnersRotateIntervalSeconds: number;
  /** Precomputed template flags (OnPush-friendly). */
  showStats: boolean;
  hideTree: boolean;
  showVisitorCounter: boolean;
  showPartnershipActivities: boolean;
  showUpcomingEvents: boolean;
  showPendingRequests: boolean;
  pendingChangeRequests: ChangeRequest[];
  pendingChangeRequestsTotal: number;
  showActivePartners: boolean;
  showPartnerEngagementAmounts: boolean;
  activePartnersPool: ActivePartnerItem[];
  displayedActivePartners: ActivePartnerItem[];
  /** Deferred mount for online-users visitor panel. */
  mountOnlineVisitorWidget: boolean;
  isSchoolAdminRole: boolean;
  isDivisionAdminRole: boolean;
}

type HomeLoaderId =
  | 'internalRef'
  | 'resourcePartner'
  | 'schoolNeeds'
  | 'aipStats'
  | 'upcomingPlans'
  | 'partnershipActivities'
  | 'pendingChangeRequests'
  | 'activePartners';

type HomeWidgetId =
  | 'ppaFeatures'
  | 'tree'
  | 'schoolContext'
  | 'ppaImplementation'
  | 'resourcePartner'
  | 'partnershipActivities'
  | 'upcomingEvents'
  | 'pendingRequests'
  | 'activePartners';

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
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    RouterLink,
    SchoolYearWidgetFilterComponent,
    VisitorCounterWidgetComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  providers: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('logoContainer') logoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('logoPreview') logoPreview!: ElementRef<HTMLDivElement>;
  @ViewChild('resourcePieHost') resourcePieHost?: ElementRef<HTMLDivElement>;
  @ViewChild('partnersPieHost') partnersPieHost?: ElementRef<HTMLDivElement>;

  protected readonly UserType = UserType;
  protected readonly AIP_STATUSES = AIP_STATUSES;
  protected readonly getChangeRequestTypeIcon = getChangeRequestTypeIcon;
  protected readonly getChangeRequestTypeLabel = getChangeRequestTypeLabel;
  /** School-year options for home widget filters (recomputed so rollover stays correct). */
  protected get schoolYearWidgetOptions(): readonly string[] {
    return getSchoolYearOptions();
  }

  /** Accordion: when false, only the widget title row stays visible. */
  private homeWidgetExpanded: Record<HomeWidgetId, boolean> = {
    ppaFeatures: true,
    tree: true,
    schoolContext: true,
    ppaImplementation: true,
    resourcePartner: true,
    partnershipActivities: true,
    upcomingEvents: true,
    pendingRequests: true,
    activePartners: true,
  };

  protected activePartnersFading = false;

  /** Flat contribution options for home search autocomplete. */
  protected contributionSearchOptions: ContributionSearchOption[] = [];
  /** Filtered subset shown in the autocomplete panel. */
  protected filteredContributionOptions: ContributionSearchOption[] = [];
  /** Current search input text (UI-only; not part of HomeState). */
  protected contributionSearchQuery = '';
  /** True while navigating after quick-search / tree selection (slow network feedback). */
  protected contributionNavBusy = false;
  /** Status line shown under the search field while busy. */
  protected contributionNavMessage = '';

  private readonly partnerAvatarErrors = new Set<string>();
  private activePartnersRotateTimer?: ReturnType<typeof setInterval>;
  private activePartnersFadeTimer?: ReturnType<typeof setTimeout>;

  private resourceBreakdownChart?: EChartsType;
  private partnersBreakdownChart?: EChartsType;
  private breakdownChartsResizeObserver?: ResizeObserver;
  /** `resize()` during the opening animation cancels ECharts’ first-render animation. */
  private breakdownChartsSuppressResizeUntil = 0;
  private breakdownChartsPostAnimateResizeTimer?: ReturnType<typeof setTimeout>;
  private breakdownChartsDomRetryCount = 0;
  private divisionBreakdownChartsSub?: Subscription;
  private echartsCore?: typeof import('echarts/core');

  /** Single stream for template – use with async pipe. No manual subscriptions. */
  readonly homeState$: Observable<HomeState>;

  private readonly homeStateSubject: BehaviorSubject<HomeState>;

  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly referenceDataService: ReferenceDataService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly schoolService: SchoolService,
    private readonly authService: AuthService,
    private readonly ppaPlanService: PpaPlanService,
    private readonly calendarNavigationService: CalendarNavigationService,
    private readonly decimalPipe: DecimalPipe,
    private readonly fieldCheckerService: FieldCheckerService,
    private readonly activityService: ActivityService,
    private readonly widgetService: WidgetService,
    private readonly announcementService: AnnouncementService,
    private readonly announcementDismissalService: AnnouncementDismissalService,
    private readonly dialog: MatDialog,
    private readonly changeRequestService: ChangeRequestService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const initial = this.getInitialState();
    this.homeStateSubject = new BehaviorSubject(initial);
    this.homeState$ = this.homeStateSubject.asObservable().pipe(shareReplay(1));
  }

  ngOnInit(): void {
    this.homeStateSubject.next(
      this.withWidgetSchoolYearsSetToCurrent(
        this.withComputedFlags(this.homeStateSubject.getValue()),
      ),
    );

    this.divisionBreakdownChartsSub = this.homeState$
      .pipe(
        filter(
          (s) =>
            s.isDivisionAdminRole &&
            !s.loading.resourcePartnerBreakdown &&
            s.resourceGenerationBreakdown.length > 0 &&
            s.partnersBreakdown.length > 0,
        ),
      )
      .subscribe(() => {
        queueMicrotask(() =>
          requestAnimationFrame(() => void this.initDivisionAdminBreakdownCharts()),
        );
      });

    this.buildLoadPipeline().subscribe({
      error: (err) => console.error('Home load error:', err),
    });

    this.scheduleDeferredInit();
  }

  private scheduleDeferredInit(): void {
    const run = () => {
      if (this.authService.getActiveRole() === UserType.SchoolAdmin) {
        void this.checkProfileCompleteness();
      }
      this.loadAndShowAnnouncements();
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run);
    } else {
      setTimeout(run, 0);
    }
  }

  private maybeEnableDeferredUi(state: HomeState): void {
    if (state.mountOnlineVisitorWidget || !this.isTier1Complete(state)) {
      return;
    }
    const enable = () => {
      const current = this.homeStateSubject.getValue();
      if (current.mountOnlineVisitorWidget) {
        return;
      }
      this.homeStateSubject.next(
        this.withComputedFlags({ ...current, mountOnlineVisitorWidget: true }),
      );
      this.cdr.markForCheck();
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(enable);
    } else {
      setTimeout(enable, 0);
    }
  }

  private isTier1Complete(state: HomeState): boolean {
    if (state.hideTree) {
      return !state.loading.schoolNeeds;
    }
    if (state.loading.schoolNeeds) {
      return false;
    }
    if (state.isDivisionAdminRole) {
      return !state.loading.internalRefData;
    }
    return true;
  }

  private withComputedFlags(state: HomeState): HomeState {
    const userRole = state.userRole;
    return {
      ...state,
      showStats:
        userRole === UserType.SchoolAdmin || userRole === UserType.DivisionAdmin,
      hideTree:
        userRole === UserType.ProgramHolder ||
        userRole === UserType.OfficeAdmin ||
        userRole === UserType.OfficeAdminAssistant,
      showVisitorCounter: canShowHomeVisitorCounterWidget(userRole),
      showPartnershipActivities:
        userRole === UserType.SchoolAdmin ||
        userRole === UserType.DivisionAdmin ||
        userRole === UserType.StakeHolder,
      showUpcomingEvents:
        userRole === UserType.OfficeAdmin ||
        userRole === UserType.OfficeAdminAssistant ||
        userRole === UserType.ProgramHolder,
      showPendingRequests:
        userRole === UserType.DivisionAdmin ||
        userRole === UserType.SystemAdmin,
      showActivePartners:
        !this.authService.isLoggedIn() ||
        userRole === UserType.SchoolAdmin ||
        userRole === UserType.StakeHolder ||
        userRole === UserType.DivisionAdmin,
      showPartnerEngagementAmounts: userRole === UserType.DivisionAdmin,
      isSchoolAdminRole: userRole === UserType.SchoolAdmin,
      isDivisionAdminRole: userRole === UserType.DivisionAdmin,
      mountOnlineVisitorWidget: state.mountOnlineVisitorWidget ?? false,
    };
  }

  private mergeLoaderResult(
    current: HomeState,
    loaded: HomeState,
    loaderId: HomeLoaderId,
  ): HomeState {
    const loading = { ...current.loading };
    switch (loaderId) {
      case 'internalRef':
        loading.internalRefData = loaded.loading.internalRefData;
        return {
          ...current,
          loading,
          divisionName: loaded.divisionName,
          divisionLogoUrl: loaded.divisionLogoUrl,
          logoError: loaded.logoError,
        };
      case 'resourcePartner':
        loading.resourcePartnerBreakdown = loaded.loading.resourcePartnerBreakdown;
        return {
          ...current,
          loading,
          resourcePartnerSchoolYear: loaded.resourcePartnerSchoolYear,
          resourceGenerationBreakdown: loaded.resourceGenerationBreakdown,
          partnersBreakdown: loaded.partnersBreakdown,
        };
      case 'schoolNeeds':
        loading.schoolNeeds = loaded.loading.schoolNeeds;
        return {
          ...current,
          loading,
          treeData: loaded.treeData,
          schoolNeedData: loaded.schoolNeedData,
          schoolInfo: loaded.schoolInfo,
          schoolLogoUrl: loaded.schoolLogoUrl,
          logoError: loaded.logoError,
          treeSchoolYear: loaded.treeSchoolYear,
        };
      case 'aipStats':
        loading.aipStats = loaded.loading.aipStats;
        return {
          ...current,
          loading,
          aipStatsSchoolYear: loaded.aipStatsSchoolYear,
          aipStatusStats: loaded.aipStatusStats,
          aipStatusPercentageDisplays: loaded.aipStatusPercentageDisplays,
          totalAips: loaded.totalAips,
        };
      case 'upcomingPlans':
        loading.upcomingPlans = loaded.loading.upcomingPlans;
        return {
          ...current,
          loading,
          upcomingPlans: loaded.upcomingPlans,
        };
      case 'partnershipActivities':
        loading.partnershipActivities = loaded.loading.partnershipActivities;
        return {
          ...current,
          loading,
          partnershipActivities: loaded.partnershipActivities,
        };
      case 'pendingChangeRequests':
        loading.pendingChangeRequests = loaded.loading.pendingChangeRequests;
        return {
          ...current,
          loading,
          pendingChangeRequests: loaded.pendingChangeRequests,
          pendingChangeRequestsTotal: loaded.pendingChangeRequestsTotal,
        };
      case 'activePartners':
        loading.activePartners = loaded.loading.activePartners;
        return {
          ...current,
          loading,
          activePartnersSchoolYear: loaded.activePartnersSchoolYear,
          activePartnersPool: loaded.activePartnersPool,
          displayedActivePartners: loaded.displayedActivePartners,
        };
      default:
        return current;
    }
  }

  private loadAndShowAnnouncements(): void {
    this.announcementService.getActive('home').subscribe({
      next: (announcements) => {
        const eligible = announcements.filter(
          (a) =>
            a.forceShowEveryVisit ||
            !this.announcementDismissalService.isDismissed(a._id),
        );
        this.showAnnouncementQueue(eligible, 0);
      },
      error: (err) => console.error('Failed to load announcements:', err),
    });
  }

  private showAnnouncementQueue(announcements: Announcement[], index: number): void {
    if (index >= announcements.length) return;

    const ref = this.dialog.open(AnnouncementDialogComponent, {
      width: 'min(560px, 95vw)',
      maxWidth: '95vw',
      data: { announcement: announcements[index] },
      panelClass: 'announcement-dialog-panel',
    });

    ref.afterClosed().subscribe((result: AnnouncementDialogResult | undefined) => {
      const current = announcements[index];
      if (result?.dontShowAgain && !current.forceShowEveryVisit) {
        this.announcementDismissalService.markDismissed(current._id);
      }
      this.showAnnouncementQueue(announcements, index + 1);
    });
  }

  ngOnDestroy(): void {
    this.divisionBreakdownChartsSub?.unsubscribe();
    this.divisionBreakdownChartsSub = undefined;
    this.disposeDivisionAdminBreakdownCharts();
    this.stopActivePartnersAutoRotate();
    if (this.activePartnersFadeTimer != null) {
      clearTimeout(this.activePartnersFadeTimer);
      this.activePartnersFadeTimer = undefined;
    }
  }

  /** Align widget filters to the current school year (handles rollover / stale SPA state). */
  private withWidgetSchoolYearsSetToCurrent(state: HomeState): HomeState {
    const current = getCurrentSchoolYear();
    const options = getSchoolYearOptions();
    const year = options.includes(current) ? current : options[options.length - 1] ?? current;
    return {
      ...state,
      treeSchoolYear: year,
      aipStatsSchoolYear: year,
      resourcePartnerSchoolYear: year,
    };
  }

  private getInitialState(): HomeState {
    const name = this.authService.getName();
    const userRole = this.authService.getActiveRole();
    if (!name || !userRole) console.warn('User information is incomplete.');
    const aipStatusStats = new Map<AipStatus, number>();
    const aipStatusPercentageDisplays = new Map<AipStatus, string>();
    AIP_STATUSES.forEach((s) => {
      aipStatusStats.set(s, 0);
      aipStatusPercentageDisplays.set(s, '0');
    });
    const isDivisionAdmin = userRole === UserType.DivisionAdmin;
    const isPendingRequestsRole =
      userRole === UserType.DivisionAdmin || userRole === UserType.SystemAdmin;
    const isActivePartnersAudience =
      !this.authService.isLoggedIn() ||
      userRole === UserType.SchoolAdmin ||
      userRole === UserType.StakeHolder ||
      userRole === UserType.DivisionAdmin;
    const base: HomeState = {
      loading: {
        internalRefData: true,
        schoolNeeds: true,
        aipStats: true,
        upcomingPlans: true,
        partnershipActivities: true,
        resourcePartnerBreakdown: isDivisionAdmin,
        pendingChangeRequests: isPendingRequestsRole,
        activePartners: isActivePartnersAudience,
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
      aipStatusPercentageDisplays,
      totalAips: 0,
      upcomingPlans: [],
      partnershipActivities: [],
      pendingChangeRequests: [],
      pendingChangeRequestsTotal: 0,
      activePartnersPool: [],
      displayedActivePartners: [],
      resourceGenerationBreakdown: [],
      partnersBreakdown: [],
      resourcePartnerSchoolYear: getCurrentSchoolYear(),
      aipStatsSchoolYear: getCurrentSchoolYear(),
      treeSchoolYear: getCurrentSchoolYear(),
      activePartnersSchoolYear: '',
      activePartnersRotateIntervalSeconds:
        DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS,
      showStats: false,
      hideTree: false,
      showVisitorCounter: false,
      showPartnershipActivities: false,
      showUpcomingEvents: false,
      showPendingRequests: false,
      showActivePartners: false,
      showPartnerEngagementAmounts: false,
      mountOnlineVisitorWidget: false,
      isSchoolAdminRole: false,
      isDivisionAdminRole: false,
    };
    return this.withComputedFlags(base);
  }

  private buildLoadPipeline(): Observable<HomeState> {
    return defer(() => {
      const initial = this.withWidgetSchoolYearsSetToCurrent(this.getInitialState());

      return this.applyActivePartnersDefaultSchoolYear$(initial).pipe(
        switchMap((ready) => {
          this.homeStateSubject.next(ready);

          const loaders: { id: HomeLoaderId; obs: Observable<HomeState> }[] = [
            { id: 'internalRef', obs: this.loadInternalRefData$(ready) },
            { id: 'resourcePartner', obs: this.loadResourcePartnerBreakdown$(ready) },
            { id: 'schoolNeeds', obs: this.loadSchoolNeeds$(ready) },
            { id: 'aipStats', obs: this.loadAipStatsIfNeeded$(ready) },
            { id: 'upcomingPlans', obs: this.loadUpcomingPlansIfNeeded$(ready) },
            { id: 'partnershipActivities', obs: this.loadPartnershipActivitiesIfNeeded$(ready) },
            { id: 'pendingChangeRequests', obs: this.loadPendingChangeRequestsIfNeeded$(ready) },
            { id: 'activePartners', obs: this.loadActivePartnersIfNeeded$(ready) },
          ];

          return merge(
            ...loaders.map(({ id, obs }) =>
              obs.pipe(
                tap((loaded) => {
                  const merged = this.withComputedFlags(
                    this.mergeLoaderResult(this.homeStateSubject.getValue(), loaded, id),
                  );
                  this.homeStateSubject.next(merged);
                  this.maybeEnableDeferredUi(merged);
                  this.maybeSyncActivePartnersAutoRotate(merged);
                }),
                catchError((err) => {
                  console.error(`Home loader error (${id}):`, err);
                  return EMPTY;
                }),
              ),
            ),
          ).pipe(map(() => this.homeStateSubject.getValue()));
        }),
      );
    });
  }

  private applyActivePartnersDefaultSchoolYear$(state: HomeState): Observable<HomeState> {
    if (!state.showActivePartners || state.activePartnersSchoolYear?.trim()) {
      return of(state);
    }

    const schoolYearOptions = this.schoolYearWidgetOptions;
    const currentSchoolYear = getCurrentSchoolYear();

    return this.widgetService.getActivePartnersWidgetSettings().pipe(
      map((settingsRes) => ({
        ...state,
        activePartnersSchoolYear: resolveActivePartnersSchoolYear(
          settingsRes.data,
          schoolYearOptions,
          currentSchoolYear,
        ),
        activePartnersRotateIntervalSeconds:
          settingsRes.data.rotateIntervalSeconds,
      })),
      catchError((err) => {
        console.error('Error loading active partners widget settings:', err);
        return of({
          ...state,
          activePartnersSchoolYear: schoolYearOptions.includes(currentSchoolYear)
            ? currentSchoolYear
            : schoolYearOptions[schoolYearOptions.length - 1] ?? currentSchoolYear,
          activePartnersRotateIntervalSeconds:
            DEFAULT_ACTIVE_PARTNERS_ROTATE_INTERVAL_SECONDS,
        });
      }),
    );
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

  onTreeSchoolYearChange(state: HomeState, schoolYear: string): void {
    if (schoolYear === state.treeSchoolYear || state.loading.schoolNeeds) {
      return;
    }
    if (
      state.userRole === UserType.ProgramHolder ||
      state.userRole === UserType.OfficeAdmin ||
      state.userRole === UserType.OfficeAdminAssistant
    ) {
      this.homeStateSubject.next({ ...state, treeSchoolYear: schoolYear });
      return;
    }
    this.homeStateSubject.next({
      ...state,
      treeSchoolYear: schoolYear,
      loading: { ...state.loading, schoolNeeds: true },
    });
    const latest = this.homeStateSubject.getValue();
    this.loadSchoolNeeds$(latest).subscribe({
      next: (result) => this.homeStateSubject.next(result),
      error: (err) => console.error('School needs reload error:', err),
    });
  }

  onAipStatsSchoolYearChange(state: HomeState, schoolYear: string): void {
    if (schoolYear === state.aipStatsSchoolYear || state.loading.aipStats) {
      return;
    }
    this.homeStateSubject.next({
      ...state,
      aipStatsSchoolYear: schoolYear,
      loading: { ...state.loading, aipStats: true },
    });
    const latest = this.homeStateSubject.getValue();
    this.loadAipStatsIfNeeded$(latest).subscribe({
      next: (result) => this.homeStateSubject.next(result),
      error: (err) => console.error('AIP status stats reload error:', err),
    });
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

  onActivePartnersSchoolYearChange(state: HomeState, schoolYear: string): void {
    if (
      schoolYear === state.activePartnersSchoolYear ||
      state.loading.activePartners
    ) {
      return;
    }
    this.stopActivePartnersAutoRotate();
    this.partnerAvatarErrors.clear();
    this.homeStateSubject.next({
      ...state,
      activePartnersSchoolYear: schoolYear,
      loading: { ...state.loading, activePartners: true },
    });
    const latest = this.homeStateSubject.getValue();
    this.loadActivePartnersIfNeeded$(latest).subscribe({
      next: (result) => {
        this.homeStateSubject.next(result);
        this.maybeSyncActivePartnersAutoRotate(result);
      },
      error: (err) => console.error('Active partners reload error:', err),
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

  onContributionSearchChange(query: string): void {
    if (this.contributionNavBusy) return;
    this.contributionSearchQuery = query ?? '';
    this.filteredContributionOptions = filterContributionSearchOptions(
      this.contributionSearchOptions,
      this.contributionSearchQuery,
    );
    this.cdr.markForCheck();
  }

  displayContributionOption(opt: ContributionSearchOption | string | null): string {
    if (opt == null) return '';
    if (typeof opt === 'string') return opt;
    return `${opt.type} → ${opt.specific}`;
  }

  async onContributionSearchSelect(
    event: MatAutocompleteSelectedEvent,
    state: HomeState,
  ): Promise<void> {
    if (this.contributionNavBusy) return;
    const opt = event.option.value as ContributionSearchOption;
    if (!opt?.specific || !opt?.type) return;
    this.contributionSearchQuery = this.displayContributionOption(opt);
    await this.runContributionNavigation(opt.type, opt.specific, state, 'search');
  }

  async onChildClick(
    child: TreeNode,
    state: HomeState,
    parentName?: string,
  ): Promise<void> {
    if (this.contributionNavBusy) return;
    const type =
      parentName ??
      state.treeData.find((node) =>
        node.children?.some((c) => c.name === child.name),
      )?.name;
    if (!type) return;
    await this.runContributionNavigation(type, child.name, state, 'tree');
  }

  private async runContributionNavigation(
    contributionType: string,
    specificContribution: string,
    state: HomeState,
    source: 'search' | 'tree',
  ): Promise<void> {
    this.contributionNavBusy = true;
    this.contributionNavMessage =
      state.userRole === UserType.SchoolAdmin
        ? `Opening create form for ${specificContribution}…`
        : `Opening school needs for ${specificContribution}…`;
    this.cdr.markForCheck();

    try {
      await this.navigateForContribution(
        contributionType,
        specificContribution,
        state,
      );
    } finally {
      this.contributionNavBusy = false;
      this.contributionNavMessage = '';
      if (source === 'search') {
        this.contributionSearchQuery = '';
        this.filteredContributionOptions = [...this.contributionSearchOptions];
      }
      this.cdr.markForCheck();
    }
  }

  private async navigateForContribution(
    contributionType: string,
    specificContribution: string,
    state: HomeState,
  ): Promise<void> {
    this.userService.setContribution({
      name: contributionType,
      specificContribution,
    });
    this.userService.setSchoolYear(state.treeSchoolYear);
    let path: string;
    const queryParams: Record<string, string> = {};
    const role = state.userRole;
    switch (role) {
      case UserType.SchoolAdmin: {
        const { isComplete } = await this.checkProfileCompleteness();
        if (!isComplete) return;
        path = '/school-admin/list-of-school-needs';
        queryParams['openCreate'] = '1';
        break;
      }
      case UserType.DivisionAdmin:
        path = '/division-admin/school-needs';
        queryParams['selectedContribution'] = specificContribution;
        queryParams['schoolYear'] = state.treeSchoolYear;
        break;
      case UserType.StakeHolder:
        path = '/stakeholder/school-needs';
        queryParams['selectedContribution'] = specificContribution;
        queryParams['schoolYear'] = state.treeSchoolYear;
        break;
      default:
        path = '/guest/school-needs';
        queryParams['selectedContribution'] = specificContribution;
        queryParams['schoolYear'] = state.treeSchoolYear;
        if (role) console.warn(`Unknown or undefined role: ${role}`);
        break;
    }
    await this.router.navigate([path], { queryParams });
  }

  private loadSchoolNeeds$(state: HomeState): Observable<HomeState> {
    if (state.hideTree) {
      return of({ ...state, loading: { ...state.loading, schoolNeeds: false } });
    }

    const schoolId = state.isSchoolAdminRole ? this.authService.getSchoolId() : undefined;
    const emptyCounts: SchoolNeedContributionCountsResponse = {
      success: false,
      data: [],
      meta: { count: 0, timestamp: '' },
    };

    return forkJoin({
      tree: of(this.referenceDataService.get<TreeNode[]>('contributionTree') ?? []),
      counts: this.widgetService
        .getSchoolNeedContributionCounts(state.treeSchoolYear, schoolId)
        .pipe(
          catchError((err) => {
            console.error('Contribution counts widget error:', err);
            return of(emptyCounts);
          }),
        ),
      school:
        state.isSchoolAdminRole && schoolId
          ? this.schoolService.getSchoolById(schoolId).pipe(
              catchError((err) => {
                console.error('School header load error:', err);
                return of(null);
              }),
            )
          : of(null),
    }).pipe(
      map(({ tree, counts, school }) => {
        const countRows =
          counts.success && Array.isArray(counts.data) ? counts.data : [];
        const treeWithCounts = this.mapCountsToTreeData(tree, countRows);
        this.syncContributionSearchOptions(treeWithCounts);
        const schoolInfo = (school as SchoolInfo | null) ?? null;
        return {
          ...state,
          loading: { ...state.loading, schoolNeeds: false },
          treeData: treeWithCounts,
          schoolNeedData: [],
          schoolInfo,
          schoolLogoUrl: schoolInfo?.logoUrl ?? null,
          logoError: false,
        };
      }),
      catchError((err) => {
        console.error('Error fetching school needs tree:', err);
        return of({ ...state, loading: { ...state.loading, schoolNeeds: false } });
      }),
    );
  }

  private syncContributionSearchOptions(tree: TreeNode[]): void {
    this.contributionSearchOptions = flattenContributionTree(tree);
    this.filteredContributionOptions = filterContributionSearchOptions(
      this.contributionSearchOptions,
      this.contributionSearchQuery,
    );
  }

  private mapCountsToTreeData(
    tree: TreeNode[],
    counts: { specificContribution: string; count: number }[],
  ): TreeNode[] {
    return mapCountsToContributionTree(tree, counts);
  }

  private loadAipStatsIfNeeded$(state: HomeState): Observable<HomeState> {
    const role = state.userRole;
    if (role !== UserType.SchoolAdmin && role !== UserType.DivisionAdmin) {
      return of({ ...state, loading: { ...state.loading, aipStats: false } });
    }
    const schoolId = role === UserType.SchoolAdmin ? this.authService.getSchoolId() : undefined;
    const emptyStats: AipStatusStatsResponse = {
      success: false,
      data: { total: 0, byStatus: [] },
      meta: { count: 0, timestamp: '' },
    };
    return this.widgetService.getAipStatusStats(state.aipStatsSchoolYear, schoolId).pipe(
      map((response) => ({
        ...state,
        loading: { ...state.loading, aipStats: false },
        aipStatsSchoolYear: state.aipStatsSchoolYear,
        ...this.mapAipStatusStatsResponse(response),
      })),
      catchError((err) => {
        console.error('Error loading AIP statistics:', err);
        return of({
          ...state,
          loading: { ...state.loading, aipStats: false },
          ...this.mapAipStatusStatsResponse(emptyStats),
        });
      }),
    );
  }

  private mapAipStatusStatsResponse(
    response: AipStatusStatsResponse,
  ): Pick<HomeState, 'aipStatusStats' | 'aipStatusPercentageDisplays' | 'totalAips'> {
    const stats = new Map<AipStatus, number>();
    const percentageDisplays = new Map<AipStatus, string>();
    AIP_STATUSES.forEach((s) => {
      stats.set(s, 0);
      percentageDisplays.set(s, '0');
    });
    const total = response.success ? response.data.total : 0;
    if (response.success && Array.isArray(response.data.byStatus)) {
      for (const row of response.data.byStatus) {
        const status = row.status as AipStatus;
        if (AIP_STATUSES.includes(status)) {
          stats.set(status, row.count);
          percentageDisplays.set(
            status,
            row.percentageDisplay ?? String(row.percentage ?? 0),
          );
        }
      }
    }
    return {
      aipStatusStats: stats,
      aipStatusPercentageDisplays: percentageDisplays,
      totalAips: total,
    };
  }

  private loadUpcomingPlansIfNeeded$(state: HomeState): Observable<HomeState> {
    if (
      state.userRole !== UserType.ProgramHolder &&
      state.userRole !== UserType.OfficeAdmin &&
      state.userRole !== UserType.OfficeAdminAssistant
    ) {
      return of({ ...state, loading: { ...state.loading, upcomingPlans: false } });
    }
    const { from: startDateFrom } = this.getSixMonthWindowFromStartOfCurrentMonth();
    return this.ppaPlanService.getList({ startDateFrom }).pipe(
      map((res) => {
        const plans = Array.isArray(res.data) ? res.data : [];
        const sorted = [...plans].sort((a, b) => {
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
  private getSixMonthWindowFromStartOfCurrentMonth(): { from: string; to: string } {
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = new Date(now.getFullYear(), now.getMonth() + 7, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return {
      from: fmt(fromDate),
      to: fmt(toDate),
    };
  }

  private getPartnershipActivitiesListDateRange(): { startDatetimeFrom: string; startDatetimeTo: string } {
    const { from, to } = this.getSixMonthWindowFromStartOfCurrentMonth();
    return {
      startDatetimeFrom: from,
      startDatetimeTo: to,
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

  private loadActivePartnersIfNeeded$(state: HomeState): Observable<HomeState> {
    if (!state.showActivePartners) {
      return of({ ...state, loading: { ...state.loading, activePartners: false } });
    }

    const schoolYearOptions = this.schoolYearWidgetOptions;
    const currentSchoolYear = getCurrentSchoolYear();
    const schoolYear$ = state.activePartnersSchoolYear?.trim()
      ? of(state.activePartnersSchoolYear.trim())
      : this.widgetService.getActivePartnersWidgetSettings().pipe(
          map((settingsRes) =>
            resolveActivePartnersSchoolYear(
              settingsRes.data,
              schoolYearOptions,
              currentSchoolYear,
            ),
          ),
          catchError(() =>
            of(
              schoolYearOptions.includes(currentSchoolYear)
                ? currentSchoolYear
                : schoolYearOptions[schoolYearOptions.length - 1] ?? currentSchoolYear,
            ),
          ),
        );

    return schoolYear$.pipe(
      switchMap((schoolYear) =>
        this.widgetService.getActivePartners(schoolYear, 100).pipe(
          map((res) => {
            const pool = res.data ?? [];
            return {
              ...state,
              activePartnersSchoolYear: schoolYear,
              loading: { ...state.loading, activePartners: false },
              activePartnersPool: pool,
              displayedActivePartners: pickWeightedActivePartners(pool),
            };
          }),
        ),
      ),
      catchError((err) => {
        console.error('Error loading active partners:', err);
        return of({
          ...state,
          loading: { ...state.loading, activePartners: false },
          activePartnersPool: [],
          displayedActivePartners: [],
        });
      }),
    );
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private shouldAutoRotateActivePartners(): boolean {
    return (
      !this.prefersReducedMotion() &&
      this.isHomeWidgetExpanded('activePartners')
    );
  }

  private maybeSyncActivePartnersAutoRotate(state: HomeState): void {
    if (!state.showActivePartners) {
      this.stopActivePartnersAutoRotate();
      return;
    }
    if (state.loading.activePartners || state.activePartnersPool.length === 0) {
      this.stopActivePartnersAutoRotate();
      return;
    }
    if (this.shouldAutoRotateActivePartners() && !this.activePartnersRotateTimer) {
      this.startActivePartnersAutoRotate();
    }
    if (!this.shouldAutoRotateActivePartners()) {
      this.stopActivePartnersAutoRotate();
    }
  }

  private startActivePartnersAutoRotate(): void {
    this.stopActivePartnersAutoRotate();
    if (!this.shouldAutoRotateActivePartners()) {
      return;
    }
    const state = this.homeStateSubject.getValue();
    const rotateMs = Math.max(
      1000,
      state.activePartnersRotateIntervalSeconds * 1000,
    );
    this.activePartnersRotateTimer = setInterval(
      () => this.rotateDisplayedActivePartners(),
      rotateMs,
    );
  }

  private stopActivePartnersAutoRotate(): void {
    if (this.activePartnersRotateTimer != null) {
      clearInterval(this.activePartnersRotateTimer);
      this.activePartnersRotateTimer = undefined;
    }
  }

  protected rotateDisplayedActivePartners(): void {
    const state = this.homeStateSubject.getValue();
    if (!state.activePartnersPool.length || state.loading.activePartners) {
      return;
    }
    if (this.activePartnersFading) {
      return;
    }

    const fadeMs = this.prefersReducedMotion() ? 0 : ACTIVE_PARTNERS_FADE_MS;
    this.activePartnersFading = true;
    this.cdr.markForCheck();

    if (this.activePartnersFadeTimer != null) {
      clearTimeout(this.activePartnersFadeTimer);
    }

    this.activePartnersFadeTimer = setTimeout(() => {
      const latest = this.homeStateSubject.getValue();
      const next = pickWeightedActivePartners(latest.activePartnersPool);
      this.homeStateSubject.next({
        ...latest,
        displayedActivePartners: next,
      });
      this.activePartnersFading = false;
      this.activePartnersFadeTimer = undefined;
      requestAnimationFrame(() => this.cdr.markForCheck());
    }, fadeMs);
  }

  protected onActivePartnersShuffleClick(event: Event): void {
    event.stopPropagation();
    this.rotateDisplayedActivePartners();
    this.stopActivePartnersAutoRotate();
    this.startActivePartnersAutoRotate();
  }

  private loadPendingChangeRequestsIfNeeded$(state: HomeState): Observable<HomeState> {
    if (!state.showPendingRequests) {
      return of({ ...state, loading: { ...state.loading, pendingChangeRequests: false } });
    }
    return this.changeRequestService
      .getRequests({ status: ChangeRequestStatus.PENDING, limit: 10 })
      .pipe(
        map((res) => ({
          ...state,
          loading: { ...state.loading, pendingChangeRequests: false },
          pendingChangeRequests: res.data ?? [],
          pendingChangeRequestsTotal: res.meta?.totalItems ?? 0,
        })),
        catchError((err) => {
          console.error('Error loading pending change requests:', err);
          return of({
            ...state,
            loading: { ...state.loading, pendingChangeRequests: false },
            pendingChangeRequests: [],
            pendingChangeRequestsTotal: 0,
          });
        }),
      );
  }

  canShowVisitorCounterWidget(state: HomeState): boolean {
    return canShowHomeVisitorCounterWidget(state.userRole);
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

  getStatusPercentageDisplay(state: HomeState, status: AipStatus): string {
    return state.aipStatusPercentageDisplays.get(status) ?? '0';
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
    if (id === 'activePartners') {
      if (next) {
        this.maybeSyncActivePartnersAutoRotate(this.homeStateSubject.getValue());
      } else {
        this.stopActivePartnersAutoRotate();
      }
    }
    this.cdr.markForCheck();
  }

  trackByTreeNode(_index: number, node: TreeNode): string {
    return node.name;
  }

  trackByContributionSearchOption(
    _index: number,
    opt: ContributionSearchOption,
  ): string {
    return `${opt.type}::${opt.specific}`;
  }

  trackByActivity(_index: number, activity: Activity): string {
    return activity._id ?? `${activity.title ?? ''}-${activity.startDatetime ?? _index}`;
  }

  trackByPlan(_index: number, plan: PpaPlan): string {
    return plan._id ?? `${plan.title ?? ''}-${_index}`;
  }

  trackByChangeRequest(_index: number, request: ChangeRequest): string {
    return request._id ?? `${request.type}-${_index}`;
  }

  getPendingRequestsListRoute(state: HomeState): string | null {
    if (state.userRole === UserType.DivisionAdmin) {
      return '/division-admin/requests';
    }
    if (state.userRole === UserType.SystemAdmin) {
      return '/system-admin/requests';
    }
    return null;
  }

  getChangeRequestRequestorName(row: ChangeRequest): string {
    return row.requestor?.name?.trim() || row.requestor?.userName || '—';
  }

  getChangeRequestRequestorEmail(row: ChangeRequest): string {
    return row.requestor?.email || row.snapshot.before.email || '—';
  }

  formatChangeRequestDate(value?: string): string {
    return value ? formatDateTimeString(value) : '—';
  }

  trackByActivePartner(_index: number, partner: ActivePartnerItem): string {
    return partner.stakeholderUserId;
  }

  formatPartnerEngagementAmount(amount: number): string {
    return `₱${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  }

  protected readonly getDisplayInitials = getDisplayInitials;

  hasPartnerAvatarError(partnerId: string): boolean {
    return this.partnerAvatarErrors.has(partnerId);
  }

  onPartnerAvatarError(partnerId: string): void {
    this.partnerAvatarErrors.add(partnerId);
    this.cdr.markForCheck();
  }

  private readonly homeWidgetSectionLabels: Record<HomeWidgetId, string> = {
    ppaFeatures: 'Available Features',
    tree: 'school needs menu',
    schoolContext: 'school or division summary',
    ppaImplementation: 'PPA implementation status',
    resourcePartner: 'resource & partner breakdown',
    partnershipActivities: 'partnership activities',
    upcomingEvents: 'upcoming events',
    pendingRequests: 'pending requests',
    activePartners: 'active partners',
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
  private async initDivisionAdminBreakdownCharts(): Promise<void> {
    if (this.resourceBreakdownChart) return;

    const resEl = this.resourcePieHost?.nativeElement;
    const partEl = this.partnersPieHost?.nativeElement;
    if (!resEl || !partEl) {
      if (
        this.authService.getActiveRole() === UserType.DivisionAdmin &&
        this.breakdownChartsDomRetryCount < 30
      ) {
        this.breakdownChartsDomRetryCount++;
        setTimeout(() => void this.initDivisionAdminBreakdownCharts(), 50);
      }
      return;
    }
    this.breakdownChartsDomRetryCount = 0;

    const latest = this.homeStateSubject.getValue();
    const resourceSlices = latest.resourceGenerationBreakdown;
    const partnerSlices = latest.partnersBreakdown;
    if (!resourceSlices.length || !partnerSlices.length) return;

    const echarts = await this.ensureEcharts();

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

  private async ensureEcharts(): Promise<typeof import('echarts/core')> {
    if (!this.echartsCore) {
      const core = await import('echarts/core');
      const { PieChart } = await import('echarts/charts');
      const { LegendComponent, TooltipComponent } = await import('echarts/components');
      const { CanvasRenderer } = await import('echarts/renderers');
      core.use([LegendComponent, TooltipComponent, PieChart, CanvasRenderer]);
      this.echartsCore = core;
    }
    return this.echartsCore;
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
    if (state.isDivisionAdminRole) return state.loading.internalRefData;
    if (state.isSchoolAdminRole) return state.loading.schoolNeeds;
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
