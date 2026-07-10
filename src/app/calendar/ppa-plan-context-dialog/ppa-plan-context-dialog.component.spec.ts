import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { PpaPlanContextDialogComponent } from './ppa-plan-context-dialog.component';
import { AuthService } from '../../auth/auth.service';
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';
import { PpaPlan } from '../../common/model/ppa-plan.model';

describe('PpaPlanContextDialogComponent', () => {
  let component: PpaPlanContextDialogComponent;
  let fixture: ComponentFixture<PpaPlanContextDialogComponent>;
  let authService: jasmine.SpyObj<Pick<AuthService, 'getActiveRole' | 'getUserId'>>;

  const basePlan: PpaPlan = {
    kra: 'KRA',
    title: 'Plan',
    activity: 'Activity',
    objective: 'Objective',
    classification: 'enablingLearningEnvironment',
    expectedOutput: 'Output',
    implementationStatus: 'forImplementation',
    _id: 'plan-1',
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['getActiveRole', 'getUserId']);
    authService.getActiveRole.and.returnValue('programHolder');
    authService.getUserId.and.returnValue('user-1');

    await TestBed.configureTestingModule({
      imports: [PpaPlanContextDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { plan: { ...basePlan, assignedUserId: 'user-1' } },
        },
        { provide: AuthService, useValue: authService },
        { provide: PpaPlanService, useValue: { delete: () => of(undefined) } },
        {
          provide: PlanClassificationDisplayService,
          useValue: { getDisplayText: () => 'Classification' },
        },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(false) }) },
        },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PpaPlanContextDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows program holder to edit own assigned plan', () => {
    expect(component.canEdit).toBe(true);
    expect(component.canDuplicate).toBe(true);
  });

  it('denies program holder edit when not assignee', () => {
    component.data.plan = { ...basePlan, assignedUserId: 'other-user' };
    expect(component.canEdit).toBe(false);
    expect(component.canDuplicate).toBe(false);
  });

  it('allows office admin to edit any assigned plan', () => {
    authService.getActiveRole.and.returnValue('officeAdmin');
    component.data.plan = { ...basePlan, assignedUserId: 'other-user' };
    expect(component.canEdit).toBe(true);
    expect(component.canDuplicate).toBe(false);
  });

  it('shows Unknown user for orphan stakeholder id string', () => {
    expect(component.getUserDisplay('507f1f77bcf86cd799439011')).toBe(
      'Unknown user',
    );
  });

  it('shows populated stakeholder name', () => {
    expect(component.getUserDisplay({ _id: '1', name: 'DepEd RO' })).toBe(
      'DepEd RO',
    );
  });
});
