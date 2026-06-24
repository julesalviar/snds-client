import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { UserType } from '../registration/user-type.enum';
import { FooterComponent } from './footer.component';
import { VisitorCountService } from '../common/services/visitor-count.service';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let isHomeRouteSubject: BehaviorSubject<boolean>;
  let activeRole: string | undefined;

  beforeEach(async () => {
    isHomeRouteSubject = new BehaviorSubject<boolean>(false);
    activeRole = UserType.DivisionAdmin;

    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        {
          provide: VisitorCountService,
          useValue: {
            isHomeRoute$: isHomeRouteSubject.asObservable(),
            visitorCount$: new BehaviorSubject<number | null>(42).asObservable(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getActiveRole: () => activeRole,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hides the visitor counter on home for allowed roles', () => {
    activeRole = UserType.DivisionAdmin;
    isHomeRouteSubject.next(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-visitor-counter-widget')).toBeNull();
  });

  it('shows the visitor counter on home for excluded roles', () => {
    activeRole = UserType.SchoolAdmin;
    isHomeRouteSubject.next(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('app-visitor-counter-widget'),
    ).not.toBeNull();
  });

  it('shows the visitor counter outside the home route', () => {
    activeRole = UserType.DivisionAdmin;
    isHomeRouteSubject.next(false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('app-visitor-counter-widget'),
    ).not.toBeNull();
  });
});
