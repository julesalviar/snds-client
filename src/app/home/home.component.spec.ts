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

function createHomeState(userRole: string | undefined): HomeState {
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
    resourceGenerationBreakdown: [],
    partnersBreakdown: [],
    resourcePartnerSchoolYear: '2025-2026',
    aipStatsSchoolYear: '2025-2026',
    treeSchoolYear: '2025-2026',
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
    >
  >;

  beforeEach(async () => {
    homeStateSubject = new BehaviorSubject<HomeState>(
      createHomeState(UserType.SchoolAdmin),
    );

    widgetService = jasmine.createSpyObj('WidgetService', [
      'getSchoolNeedContributionCounts',
      'getAipStatusStats',
      'getResourceGenerations',
      'getPartners',
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
          useValue: {
            getActiveRole: () => UserType.SchoolAdmin,
            getName: () => 'Test User',
            getSchoolId: () => 'school-1',
          },
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
