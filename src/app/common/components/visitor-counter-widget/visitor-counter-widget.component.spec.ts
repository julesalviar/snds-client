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
  let onlineUsersSubject: BehaviorSubject<OnlineUsersSnapshot | null>;
  let startOnlineUsersPolling: jasmine.Spy;
  let stopOnlineUsersPolling: jasmine.Spy;

  beforeEach(async () => {
    activeRole = UserType.DivisionAdmin;
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
            visitorCount$: new BehaviorSubject<number | null>(10).asObservable(),
            activeVisitorCount$: new BehaviorSubject<number | null>(7).asObservable(),
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

  it('enables online users on the home variant for allowed roles', () => {
    component.variant = 'home';
    activeRole = UserType.OfficeAdmin;

    component.ngOnInit();

    expect(component.showOnlineUsers).toBe(true);
    expect(startOnlineUsersPolling).toHaveBeenCalled();
  });

  it('does not enable online users for excluded roles', () => {
    component.variant = 'home';
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
    component.ngOnInit();
    component.ngOnDestroy();

    expect(stopOnlineUsersPolling).toHaveBeenCalled();
  });

  it('renders the Guests chip and active total in the template', () => {
    component.variant = 'home';
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
    expect(root.querySelector('.visitor-counter-home-widget__online-info-btn')).not.toBeNull();
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
