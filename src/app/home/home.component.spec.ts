import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { UserType } from '../registration/user-type.enum';
import { HomeComponent, HomeState } from './home.component';
import { UserService } from '../common/services/user.service';
import { ReferenceDataService } from '../common/services/reference-data.service';
import { InternalReferenceDataService } from '../common/services/internal-reference-data.service';
import { SchoolService } from '../common/services/school.service';
import { PpaPlanService } from '../common/services/ppa-plan.service';
import { CalendarNavigationService } from '../common/services/calendar-navigation.service';
import { FieldCheckerService } from '../common/services/utils/field-checker.service';
import { ActivityService } from '../common/services/activity.service';
import { WidgetService } from '../common/services/widget.service';
import { AnnouncementService } from '../common/services/announcement.service';
import { AnnouncementDismissalService } from '../common/services/announcement-dismissal.service';
import { VisitorCountService } from '../common/services/visitor-count.service';
import { MatDialog } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';
import { AIP_STATUSES } from '../common/enums/aip-status.enum';
import { ChangeRequestService } from '../common/services/change-request.service';

function createHomeState(userRole: string | undefined, isLoggedIn = true): HomeState {
  const aipStatusStats = new Map();
  const aipStatusPercentageDisplays = new Map();
  for (const status of AIP_STATUSES) {
    aipStatusStats.set(status, 0);
    aipStatusPercentageDisplays.set(status, '0');
  }

  return {
    loading: {
      internalRefData: false,
      schoolNeeds: false,
      aipStats: false,
      upcomingPlans: false,
      partnershipActivities: false,
      resourcePartnerBreakdown: false,
      pendingChangeRequests: false,
      activePartners: false,
    },
    name: 'Test User',
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
    resourcePartnerSchoolYear: '2025-2026',
    aipStatsSchoolYear: '2025-2026',
    treeSchoolYear: '2025-2026',
    activePartnersSchoolYear: '2025-2026',
    activePartnersRotateIntervalSeconds: 12,
    showStats:
      userRole === UserType.SchoolAdmin || userRole === UserType.DivisionAdmin,
    hideTree:
      userRole === UserType.ProgramHolder ||
      userRole === UserType.OfficeAdmin ||
      userRole === UserType.OfficeAdminAssistant,
    showVisitorCounter:
      userRole === UserType.DivisionAdmin ||
      userRole === UserType.OfficeAdmin ||
      userRole === UserType.SystemAdmin ||
      userRole === UserType.StakeHolder,
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
      !isLoggedIn ||
      userRole === UserType.SchoolAdmin ||
      userRole === UserType.StakeHolder ||
      userRole === UserType.DivisionAdmin,
    showPartnerEngagementAmounts: userRole === UserType.DivisionAdmin,
    mountOnlineVisitorWidget: false,
    isSchoolAdminRole: userRole === UserType.SchoolAdmin,
    isDivisionAdminRole: userRole === UserType.DivisionAdmin,
  };
}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let homeStateSubject: BehaviorSubject<HomeState>;
  let widgetService: jasmine.SpyObj<
    Pick<
      WidgetService,
      | 'getSchoolNeedContributionCounts'
      | 'getAipStatusStats'
      | 'getResourceGenerations'
      | 'getPartners'
      | 'getActivePartners'
      | 'getActivePartnersWidgetSettings'
    >
  >;
  let authService: { getActiveRole: () => string; getName: () => string; getSchoolId: () => string; isLoggedIn: () => boolean };

  beforeEach(async () => {
    homeStateSubject = new BehaviorSubject<HomeState>(
      createHomeState(UserType.SchoolAdmin),
    );

    widgetService = jasmine.createSpyObj('WidgetService', [
      'getSchoolNeedContributionCounts',
      'getAipStatusStats',
      'getResourceGenerations',
      'getPartners',
      'getActivePartners',
      'getActivePartnersWidgetSettings',
    ]);
    widgetService.getSchoolNeedContributionCounts.and.returnValue(
      of({ success: true, data: [], meta: { count: 0, timestamp: '' } }),
    );
    widgetService.getAipStatusStats.and.returnValue(
      of({
        success: true,
        data: { total: 0, byStatus: [] },
        meta: { count: 0, timestamp: '' },
      }),
    );
    widgetService.getResourceGenerations.and.returnValue(
      of({ success: true, data: [], meta: { count: 0, timestamp: '' } }),
    );
    widgetService.getPartners.and.returnValue(
      of({ success: true, data: [], meta: { count: 0, timestamp: '' } }),
    );
    widgetService.getActivePartnersWidgetSettings.and.returnValue(
      of({
        success: true,
        data: {
          minEngagementAmount: 100,
          defaultSchoolYear: null,
          excludedTagKeys: [],
          excludedSectors: [],
          excludePreInstalledStakeholders: true,
          rotateIntervalSeconds: 6,
          resolvedDefaultSchoolYear: '2025-2026',
        },
        meta: { timestamp: '' },
      }),
    );
    widgetService.getActivePartners.and.returnValue(
      of({ success: true, data: [], meta: { count: 0, timestamp: '' } }),
    );

    authService = {
      getActiveRole: () => UserType.SchoolAdmin,
      getName: () => 'Test User',
      getSchoolId: () => 'school-1',
      isLoggedIn: () => true,
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [
        DecimalPipe,
        { provide: UserService, useValue: {} },
        { provide: ReferenceDataService, useValue: { get: () => [] } },
        {
          provide: InternalReferenceDataService,
          useValue: { initialize: async () => undefined, get: () => null },
        },
        { provide: SchoolService, useValue: { getSchoolById: () => of(null) } },
        {
          provide: AuthService,
          useValue: authService,
        },
        { provide: PpaPlanService, useValue: { getList: () => of({ data: [] }) } },
        { provide: CalendarNavigationService, useValue: {} },
        { provide: FieldCheckerService, useValue: { checkRequiredProfileData: async () => ({ isComplete: true }) } },
        { provide: ActivityService, useValue: { getList: () => of({ data: [] }) } },
        { provide: WidgetService, useValue: widgetService },
        { provide: AnnouncementService, useValue: { getActive: () => of([]) } },
        { provide: AnnouncementDismissalService, useValue: { isDismissed: () => false } },
        {
          provide: VisitorCountService,
          useValue: {
            visitorCount$: of(10),
            activeVisitorCount$: of(7),
            onlineUsers$: of(null),
            startOnlineUsersPolling: jasmine.createSpy('startOnlineUsersPolling'),
            stopOnlineUsersPolling: jasmine.createSpy('stopOnlineUsersPolling'),
          },
        },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
        {
          provide: ChangeRequestService,
          useValue: {
            getRequests: () =>
              of({
                data: [],
                meta: { count: 0, totalItems: 0, currentPage: 1, totalPages: 0 },
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    Object.defineProperty(component, 'homeState$', {
      value: homeStateSubject.asObservable(),
    });
    (
      component as unknown as { homeStateSubject: BehaviorSubject<HomeState> }
    ).homeStateSubject = homeStateSubject;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the stats visitor widget for division admin', () => {
    const state = createHomeState(UserType.DivisionAdmin);
    homeStateSubject.next(state);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('app-visitor-counter-widget').length,
    ).toBe(1);
  });

  it('shows the online visitor widget when deferred mount is enabled', () => {
    const state = {
      ...createHomeState(UserType.DivisionAdmin),
      mountOnlineVisitorWidget: true,
    };
    homeStateSubject.next(state);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('app-visitor-counter-widget').length,
    ).toBe(2);
  });

  it('hides the visitor widget for school admin', () => {
    homeStateSubject.next(createHomeState(UserType.SchoolAdmin));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-visitor-counter-widget')).toBeNull();
  });

  it('shows the pending requests widget for division admin', () => {
    homeStateSubject.next(createHomeState(UserType.DivisionAdmin));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pending-requests-widget')).not.toBeNull();
  });

  it('shows the pending requests widget for system admin', () => {
    homeStateSubject.next(createHomeState(UserType.SystemAdmin));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pending-requests-widget')).not.toBeNull();
  });

  it('hides the pending requests widget for school admin', () => {
    homeStateSubject.next(createHomeState(UserType.SchoolAdmin));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pending-requests-widget')).toBeNull();
  });

  it('shows the active partners widget for school admin', () => {
    homeStateSubject.next({
      ...createHomeState(UserType.SchoolAdmin),
      showActivePartners: true,
      loading: { ...createHomeState(UserType.SchoolAdmin).loading, activePartners: false },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.active-partners-widget')).not.toBeNull();
  });

  it('shows the active partners widget for guest users', () => {
    authService.isLoggedIn = () => false;
    homeStateSubject.next({
      ...createHomeState(undefined, false),
      showActivePartners: true,
      loading: { ...createHomeState(undefined, false).loading, activePartners: false },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.active-partners-widget')).not.toBeNull();
  });

  it('hides the active partners widget for office admin', () => {
    homeStateSubject.next(createHomeState(UserType.OfficeAdmin));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.active-partners-widget')).toBeNull();
  });

  it('applies fade class while rotating active partners', () => {
    homeStateSubject.next({
      ...createHomeState(UserType.SchoolAdmin),
      showActivePartners: true,
      activePartnersPool: [
        {
          stakeholderUserId: 'p1',
          name: 'Partner One',
          totalEngagementAmount: 500,
        },
      ],
      displayedActivePartners: [
        {
          stakeholderUserId: 'p1',
          name: 'Partner One',
          totalEngagementAmount: 500,
        },
      ],
      loading: { ...createHomeState(UserType.SchoolAdmin).loading, activePartners: false },
    });
    fixture.detectChanges();

    const shuffleButton = fixture.nativeElement.querySelector(
      '.active-partners-shuffle-btn',
    ) as HTMLButtonElement | null;
    expect(shuffleButton).not.toBeNull();
    shuffleButton!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.active-partners-row--fading')).not.toBeNull();
  });

  it('pre-selects configured default school year for active partners', (done) => {
    widgetService.getActivePartnersWidgetSettings.and.returnValue(
      of({
        success: true,
        data: {
          minEngagementAmount: 100000,
          defaultSchoolYear: '2024-2025',
          excludedTagKeys: [],
          excludedSectors: [],
          excludePreInstalledStakeholders: true,
          rotateIntervalSeconds: 20,
          resolvedDefaultSchoolYear: '2024-2025',
        },
        meta: { timestamp: '' },
      }),
    );

    const state = {
      ...createHomeState(UserType.SchoolAdmin),
      activePartnersSchoolYear: '',
      showActivePartners: true,
    };

    (
      component as unknown as {
        applyActivePartnersDefaultSchoolYear$: (
          s: HomeState,
        ) => import('rxjs').Observable<HomeState>;
      }
    )
      .applyActivePartnersDefaultSchoolYear$(state)
      .subscribe((result) => {
        expect(result.activePartnersSchoolYear).toBe('2024-2025');
        expect(result.activePartnersRotateIntervalSeconds).toBe(20);
        done();
      });
  });

  it('reloads active partners when school year filter changes', () => {
    widgetService.getActivePartners.calls.reset();
    homeStateSubject.next({
      ...createHomeState(UserType.DivisionAdmin),
      showActivePartners: true,
      activePartnersSchoolYear: '2024-2025',
      activePartnersPool: [
        {
          stakeholderUserId: 'p1',
          name: 'Partner One',
          totalEngagementAmount: 500,
        },
      ],
      displayedActivePartners: [
        {
          stakeholderUserId: 'p1',
          name: 'Partner One',
          totalEngagementAmount: 500,
        },
      ],
      loading: { ...createHomeState(UserType.DivisionAdmin).loading, activePartners: false },
    });
    fixture.detectChanges();

    component.onActivePartnersSchoolYearChange(
      homeStateSubject.getValue(),
      '2023-2024',
    );

    expect(widgetService.getActivePartners).toHaveBeenCalledWith('2023-2024', 100);
  });

  it('maps contribution counts onto the tree without fetching all school needs', () => {
    const tree = [
      {
        name: 'Parent',
        children: [{ name: 'Books' }, { name: 'Chairs' }],
      },
    ];
    const counts = [
      { specificContribution: 'Books', count: 3 },
      { specificContribution: 'Chairs', count: 0 },
    ];

    const result = (component as unknown as {
      mapCountsToTreeData: (
        nodes: typeof tree,
        rows: typeof counts,
      ) => { children?: { name: string; count?: number }[] }[];
    }).mapCountsToTreeData(tree, counts);

    expect(result[0].children?.[0].count).toBe(3);
    expect(result[0].children?.[1].count).toBeUndefined();
  });
});
