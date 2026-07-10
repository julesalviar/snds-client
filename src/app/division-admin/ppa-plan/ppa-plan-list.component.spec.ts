import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { PpaPlanListComponent } from './ppa-plan-list.component';
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { AuthService } from '../../auth/auth.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { PpaPlan } from '../../common/model/ppa-plan.model';

describe('PpaPlanListComponent', () => {
  let component: PpaPlanListComponent;
  let fixture: ComponentFixture<PpaPlanListComponent>;
  let authService: jasmine.SpyObj<Pick<AuthService, 'getActiveRole' | 'getUserId'>>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['getActiveRole', 'getUserId']);
    authService.getActiveRole.and.returnValue('programHolder');
    authService.getUserId.and.returnValue('user-1');

    await TestBed.configureTestingModule({
      imports: [PpaPlanListComponent],
      providers: [
        {
          provide: PpaPlanService,
          useValue: {
            getList: () => of({ data: [], totalItems: 0 }),
            delete: () => of(undefined),
          },
        },
        { provide: AuthService, useValue: authService },
        {
          provide: PlanClassificationDisplayService,
          useValue: { getDisplayText: (v: string) => v },
        },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
        {
          provide: BreakpointObserver,
          useValue: {
            isMatched: () => false,
            observe: () => of({ matches: false, breakpoints: {} }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PpaPlanListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('canActOnPlan allows program holder for own plan only', () => {
    const ownPlan = { assignedUserId: 'user-1' } as PpaPlan;
    const otherPlan = { assignedUserId: 'user-2' } as PpaPlan;
    expect(component.canActOnPlan(ownPlan)).toBe(true);
    expect(component.canActOnPlan(otherPlan)).toBe(false);
  });

  it('canActOnPlan allows office admin for any plan', () => {
    authService.getActiveRole.and.returnValue('officeAdmin');
    const otherPlan = { assignedUserId: 'user-2' } as PpaPlan;
    expect(component.canActOnPlan(otherPlan)).toBe(true);
  });

  it('getAssigneeDisplay shows Unknown user for orphan id', () => {
    expect(
      component.getAssigneeDisplay({
        assignedUserId: '507f1f77bcf86cd799439011',
      } as PpaPlan),
    ).toBe('Unknown user');
  });

  it('getStakeholderDisplay shows populated name', () => {
    expect(component.getStakeholderDisplay({ _id: '1', name: 'BFP' })).toBe(
      'BFP',
    );
  });
});
