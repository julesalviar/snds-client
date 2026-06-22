import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { FooterComponent } from './footer.component';
import { VisitorCountService } from '../common/services/visitor-count.service';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let isHomeRouteSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    isHomeRouteSubject = new BehaviorSubject<boolean>(false);

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide the visitor counter on the home route', () => {
    isHomeRouteSubject.next(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-visitor-counter-widget')).toBeNull();
  });

  it('should show the visitor counter outside the home route', () => {
    isHomeRouteSubject.next(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-visitor-counter-widget')).not.toBeNull();
  });
});
