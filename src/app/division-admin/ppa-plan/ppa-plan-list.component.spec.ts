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
          useValue: {
            getDisplayText: (v: string) => v,
            getDisplayTitle: () => 'DEPED PILLAR (Project Champ)',
          },
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

  it('toggleColumnVisibility toggles column visibility and persists to localStorage', () => {
    const col = component.columnCategories[0].columns[0];
    const initialVisibility = col.visible;
    component.toggleColumnVisibility(col);
    expect(col.visible).toBe(!initialVisibility);

    const stored = localStorage.getItem('ppa-plan-table-columns');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed[col.id]).toBe(!initialVisibility);
  });

  it('toggleColumnVisibility does not hide column if it is the only visible one', () => {
    // Hide all columns except one
    component.columnCategories.forEach((cat) => {
      cat.columns.forEach((c) => (c.visible = false));
    });
    const lastCol = component.columnCategories[0].columns[0];
    lastCol.visible = true;

    // Attempt to toggle the last remaining visible column off
    component.toggleColumnVisibility(lastCol);
    expect(lastCol.visible).toBe(true);
  });

  it('sortedColumns returns columns sorted alphabetically by display label and precomputes displayLabel', () => {
    component.initSortedColumns();
    const sorted = component.sortedColumns;
    expect(sorted.length).toBeGreaterThan(0);
    for (let i = 0; i < sorted.length; i++) {
      expect(sorted[i].displayLabel).toBeTruthy();
      if (i > 0) {
        const prev = (sorted[i - 1].displayLabel ?? sorted[i - 1].label).toLowerCase();
        const curr = (sorted[i].displayLabel ?? sorted[i].label).toLowerCase();
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('getColumnDisplayLabel returns classification title for classification column', () => {
    const classificationCol = { id: 'classification', label: 'Classification', visible: true };
    expect(component.getColumnDisplayLabel(classificationCol)).toBe('DEPED PILLAR (Project Champ)');

    const standardCol = { id: 'activity', label: 'Activity', visible: true };
    expect(component.getColumnDisplayLabel(standardCol)).toBe('Activity');
  });

  it('trackByColumnId returns column id', () => {
    const col = { id: 'venue', label: 'Venue', visible: true };
    expect(component.trackByColumnId(0, col)).toBe('venue');
  });
});
