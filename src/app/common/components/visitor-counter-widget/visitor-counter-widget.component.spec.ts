import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '../../../auth/auth.service';
import { UserType } from '../../../registration/user-type.enum';
import {
  OnlineUsersSnapshot,
  VisitorCountService,
} from '../../services/visitor-count.service';
import { VisitorCounterWidgetComponent } from './visitor-counter-widget.component';

describe('VisitorCounterWidgetComponent', () => {
  let component: VisitorCounterWidgetComponent;
  let fixture: ComponentFixture<VisitorCounterWidgetComponent>;
  let activeRole: string | undefined;
  let visitorCountSubject: BehaviorSubject<number | null>;
  let activeVisitorCountSubject: BehaviorSubject<number | null>;
  let onlineUsersSubject: BehaviorSubject<OnlineUsersSnapshot | null>;
  let startOnlineUsersPolling: jasmine.Spy;
  let stopOnlineUsersPolling: jasmine.Spy;

  beforeEach(async () => {
    activeRole = UserType.DivisionAdmin;
    visitorCountSubject = new BehaviorSubject<number | null>(10);
    activeVisitorCountSubject = new BehaviorSubject<number | null>(7);
    onlineUsersSubject = new BehaviorSubject<OnlineUsersSnapshot | null>(null);
    startOnlineUsersPolling = jasmine.createSpy('startOnlineUsersPolling');
    stopOnlineUsersPolling = jasmine.createSpy('stopOnlineUsersPolling');

    await TestBed.configureTestingModule({
      imports: [VisitorCounterWidgetComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getActiveRole: () => activeRole,
          },
        },
        {
          provide: VisitorCountService,
          useValue: {
            visitorCount$: visitorCountSubject.asObservable(),
            activeVisitorCount$: activeVisitorCountSubject.asObservable(),
            onlineUsers$: onlineUsersSubject.asObservable(),
            startOnlineUsersPolling,
            stopOnlineUsersPolling,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorCounterWidgetComponent);
    component = fixture.componentInstance;
  });

  it('enables online users on the home online panel for allowed roles', () => {
    component.variant = 'home';
    component.homeSection = 'online';
    activeRole = UserType.OfficeAdmin;

    component.ngOnInit();

    expect(component.showOnlineUsers).toBe(true);
    expect(startOnlineUsersPolling).toHaveBeenCalled();
  });

  it('does not enable online users on the home stats panel', () => {
    component.variant = 'home';
    component.homeSection = 'stats';
    activeRole = UserType.OfficeAdmin;

    component.ngOnInit();

    expect(component.showOnlineUsers).toBe(false);
    expect(startOnlineUsersPolling).not.toHaveBeenCalled();
  });

  it('does not enable online users for excluded roles', () => {
    component.variant = 'home';
    component.homeSection = 'online';
    activeRole = UserType.SchoolAdmin;

    component.ngOnInit();

    expect(component.showOnlineUsers).toBe(false);
    expect(startOnlineUsersPolling).not.toHaveBeenCalled();
  });

  it('does not enable online users on the footer variant', () => {
    component.variant = 'footer';
    activeRole = UserType.DivisionAdmin;

    component.ngOnInit();

    expect(component.showOnlineUsers).toBe(false);
    expect(startOnlineUsersPolling).not.toHaveBeenCalled();
  });

  it('stops polling on destroy when online users were enabled', () => {
    component.variant = 'home';
    component.homeSection = 'online';
    component.ngOnInit();
    component.ngOnDestroy();

    expect(stopOnlineUsersPolling).toHaveBeenCalled();
  });

  it('renders inline stats on the home stats panel', () => {
    component.variant = 'home';
    component.homeSection = 'stats';
    component.ngOnInit();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Site Visitors');
    expect(root.textContent).toContain('Total visitors');
    expect(root.textContent).toContain('Active now');
    expect(root.textContent).toContain('10');
    expect(root.textContent).toContain('7');
    expect(root.querySelector('.visitor-counter-home-widget__stats-inline, .visitor-counter-home-widget__body')).not.toBeNull();
    expect(root.textContent).not.toContain("Who's online");
  });

  it('toggles the stats panel body when collapse control is clicked', () => {
    component.variant = 'home';
    component.homeSection = 'stats';
    component.ngOnInit();
    fixture.detectChanges();

    const body = fixture.nativeElement.querySelector(
      '.visitor-counter-home-widget__collapsible-body',
    ) as HTMLElement | null;
    const toggle = fixture.nativeElement.querySelector(
      '.visitor-counter-home-widget__toggle-btn',
    ) as HTMLButtonElement | null;

    toggle?.click();
    fixture.detectChanges();

    expect(component.expanded).toBe(false);
    expect(body?.classList.contains('visitor-counter-home-widget__collapsible-body--collapsed')).toBe(
      true,
    );
  });

  it('toggles the online panel body when collapse control is clicked', () => {
    component.variant = 'home';
    component.homeSection = 'online';
    component.ngOnInit();
    onlineUsersSubject.next({
      activeCount: 1,
      anonymousSessionCount: 0,
      users: [],
    });
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      '.visitor-counter-home-widget__toggle-btn',
    ) as HTMLButtonElement | null;

    toggle?.click();
    fixture.detectChanges();

    expect(component.expanded).toBe(false);
  });

  it('renders the Guests chip and active total on the home online panel', () => {
    component.variant = 'home';
    component.homeSection = 'online';
    component.ngOnInit();
    onlineUsersSubject.next({
      activeCount: 5,
      anonymousSessionCount: 3,
      users: [
        {
          userId: 'u1',
          displayName: 'Alice',
          activeRole: UserType.DivisionAdmin,
          lastSeen: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const guestChip = root.querySelector(
      '.visitor-counter-home-widget__online-chip--guest',
    ) as HTMLElement | null;

    expect(root.textContent).toContain("Who's online");
    expect(root.textContent).toContain('5');
    expect(root.textContent).toContain('Guests');
    expect(root.textContent).toContain('Alice');
    expect(guestChip?.textContent).toContain('3');
    expect(guestChip?.querySelector('.visitor-counter-home-widget__online-chip-count')?.textContent?.trim()).toBe(
      '3',
    );
    expect(root.querySelector('.visitor-counter-home-widget__online-title-icon')?.textContent?.trim()).toBe(
      'sensors',
    );
    expect(root.querySelector('.visitor-counter-home-widget__online-count')).not.toBeNull();
    expect(root.querySelector('.visitor-counter-home-widget__toggle-btn')).not.toBeNull();
  });

  it('renders skeleton placeholders while stats are loading', () => {
    visitorCountSubject.next(null);
    activeVisitorCountSubject.next(null);
    component.variant = 'home';
    component.homeSection = 'stats';
    component.alwaysShow = true;
    component.ngOnInit();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.visitor-counter-home-widget__value-skeleton').length).toBe(2);
    expect(root.textContent).not.toContain('—');
  });

  it('renders skeleton chips while online users are loading', () => {
    component.variant = 'home';
    component.homeSection = 'online';
    component.alwaysShow = true;
    component.ngOnInit();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.visitor-counter-home-widget__online-count-skeleton')).not.toBeNull();
    expect(root.querySelectorAll('.visitor-counter-home-widget__online-chip-skeleton').length).toBe(4);
    expect(root.textContent).not.toContain('—');
  });

  it('describes the online breakdown in the help tooltip', () => {
    const tooltip = component.onlineUsersHelpTooltip({
      total: 5,
      users: [
        {
          userId: 'u1',
          displayName: 'Alice',
          activeRole: UserType.DivisionAdmin,
          lastSeen: '2026-01-01T00:00:00.000Z',
        },
      ],
      anonymousSessionCount: 3,
      overflowCount: 0,
    });

    expect(tooltip).toContain('1 signed-in user');
    expect(tooltip).toContain('3 guest sessions');
  });
});
