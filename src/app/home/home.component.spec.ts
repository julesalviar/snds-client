import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { UserType } from '../registration/user-type.enum';
import { HomeComponent, HomeState } from './home.component';
import { UserService } from '../common/services/user.service';
import { ReferenceDataService } from '../common/services/reference-data.service';
import { InternalReferenceDataService } from '../common/services/internal-reference-data.service';
import { SchoolNeedService } from '../common/services/school-need.service';
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
    resourceGenerationBreakdown: [],
    partnersBreakdown: [],
    resourcePartnerSchoolYear: '2025-2026',
    aipStatsSchoolYear: '2025-2026',
    treeSchoolYear: '2025-2026',
  };
}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let homeStateSubject: BehaviorSubject<HomeState>;

  beforeEach(async () => {
    homeStateSubject = new BehaviorSubject<HomeState>(
      createHomeState(UserType.SchoolAdmin),
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
        { provide: SchoolNeedService, useValue: {} },
        {
          provide: AuthService,
          useValue: {
            getActiveRole: () => UserType.SchoolAdmin,
            getName: () => 'Test User',
          },
        },
        { provide: PpaPlanService, useValue: {} },
        { provide: CalendarNavigationService, useValue: {} },
        { provide: FieldCheckerService, useValue: {} },
        { provide: ActivityService, useValue: {} },
        { provide: WidgetService, useValue: {} },
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

  it('shows the visitor widget for division admin', () => {
    const state = createHomeState(UserType.DivisionAdmin);
    homeStateSubject.next(state);
    fixture.detectChanges();

    expect(component.canShowVisitorCounterWidget(state)).toBe(true);
    expect(
      fixture.nativeElement.querySelectorAll('app-visitor-counter-widget').length,
    ).toBe(2);
  });

  it('shows the visitor widget for office admin', () => {
    const state = createHomeState(UserType.OfficeAdmin);
    homeStateSubject.next(state);
    fixture.detectChanges();

    expect(component.canShowVisitorCounterWidget(state)).toBe(true);
    expect(
      fixture.nativeElement.querySelectorAll('app-visitor-counter-widget').length,
    ).toBe(2);
  });

  it('hides the visitor widget for school admin', () => {
    homeStateSubject.next(createHomeState(UserType.SchoolAdmin));
    fixture.detectChanges();

    expect(component.canShowVisitorCounterWidget(createHomeState(UserType.SchoolAdmin))).toBe(
      false,
    );
    expect(fixture.nativeElement.querySelector('app-visitor-counter-widget')).toBeNull();
  });
});
