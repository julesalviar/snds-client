import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { OfficeTableComponent } from './office-table.component';
import { PpaPlanService } from '../../common/services/ppa-plan.service';
import { PlanClassificationDisplayService } from '../../common/services/plan-classification-display.service';

describe('OfficeTableComponent', () => {
  let component: OfficeTableComponent;
  let fixture: ComponentFixture<OfficeTableComponent>;
  let ppaPlanService: jasmine.SpyObj<PpaPlanService>;
  let queryParams$: BehaviorSubject<Record<string, string>>;

  beforeEach(async () => {
    queryParams$ = new BehaviorSubject<Record<string, string>>({});
    ppaPlanService = jasmine.createSpyObj('PpaPlanService', ['getList']);
    ppaPlanService.getList.and.returnValue(of({ data: [], totalItems: 0 }));

    await TestBed.configureTestingModule({
      imports: [OfficeTableComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParams$.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: PpaPlanService, useValue: ppaPlanService },
        {
          provide: PlanClassificationDisplayService,
          useValue: {
            getDisplayText: (value: string) => value,
            getDisplayTitle: () => 'Classification',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OfficeTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('calls getList with division, officeId, and subject from route', () => {
    const division = 'School Governance & Operations Division';
    const subject = 'Finance Office';
    const officeId = '507f1f77bcf86cd799439011';

    queryParams$.next({ division, subject, officeId });
    fixture.detectChanges();

    expect(component.divisionTitle).toBe(division);
    expect(component.subjectTitle).toBe(subject);
    expect(ppaPlanService.getList).toHaveBeenCalledWith({
      limit: 1000,
      officeId,
      division,
    });
  });

  it('calls getList with officeId only when division is absent', () => {
    const officeId = '507f1f77bcf86cd799439011';

    queryParams$.next({ officeId });
    fixture.detectChanges();

    expect(component.divisionTitle).toBeFalsy();
    expect(ppaPlanService.getList).toHaveBeenCalledWith({
      limit: 1000,
      officeId,
    });
  });

  it('calls getList with division only when officeId is absent', () => {
    const division = 'Curriculum Implementation Division';

    queryParams$.next({ division });
    fixture.detectChanges();

    expect(component.divisionTitle).toBe(division);
    expect(ppaPlanService.getList).toHaveBeenCalledWith({
      limit: 1000,
      division,
    });
  });
});
