import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StakeholdersProfileComponent } from './stakeholders-profile.component';
import { StakeholderProfileService } from '../common/services/stakeholder-profile.service';
import { ReferenceDataService } from '../common/services/reference-data.service';

describe('StakeholdersProfileComponent', () => {
  let component: StakeholdersProfileComponent;
  let fixture: ComponentFixture<StakeholdersProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StakeholdersProfileComponent],
      providers: [
        {
          provide: StakeholderProfileService,
          useValue: {
            listProfiles: () =>
              of({
                success: true,
                data: [],
                meta: {
                  count: 0,
                  totalItems: 0,
                  currentPage: 1,
                  totalPages: 0,
                },
              }),
            getStatistics: () =>
              of({
                success: true,
                data: {
                  engaged: 0,
                  notEngaged: 0,
                  filters: {
                    sector: null,
                    schoolYear: null,
                    schoolId: null,
                    includeReferenceAccounts: false,
                  },
                },
              }),
          },
        },
        {
          provide: ReferenceDataService,
          useValue: { initialize: () => Promise.resolve(), get: () => [] },
        },
        { provide: MatSnackBar, useValue: { open: () => ({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StakeholdersProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
