import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ListOfSchoolNeedsComponent } from './list-of-school-needs.component';
import { SchoolNeedService } from '../../common/services/school-need.service';

describe('ListOfSchoolNeedsComponent', () => {
  let component: ListOfSchoolNeedsComponent;
  let fixture: ComponentFixture<ListOfSchoolNeedsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListOfSchoolNeedsComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) },
        },
        {
          provide: SchoolNeedService,
          useValue: {
            getSchoolNeeds: () =>
              of({
                data: [],
                school: { schoolName: 'Test', logoUrl: null },
                meta: { totalItems: 0 },
              }),
            deleteSchoolNeed: () => of(void 0),
          },
        },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(false) }) } },
        {
          provide: BreakpointObserver,
          useValue: { isMatched: () => false },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListOfSchoolNeedsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
