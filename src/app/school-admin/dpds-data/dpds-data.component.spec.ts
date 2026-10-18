import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DpdsDataComponent } from './dpds-data.component';
import { EngagementService } from '../../common/services/engagement.service';
import { AuthService } from '../../auth/auth.service';
import { ReferenceDataService } from '../../common/services/reference-data.service';

describe('DpdsDataComponent', () => {
  let component: DpdsDataComponent;
  let fixture: ComponentFixture<DpdsDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DpdsDataComponent, NoopAnimationsModule],
      providers: [
        {
          provide: EngagementService,
          useValue: {
            getAllEngagement: () => of({ data: [], total: 0 }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getSchoolId: () => 'school-123',
          },
        },
        {
          provide: ReferenceDataService,
          useValue: {
            initialize: () => Promise.resolve(),
            get: () => [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DpdsDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initSortedColumns populates sortedColumns alphabetically by label', () => {
    component.initSortedColumns();
    const sorted = component.sortedColumns;
    expect(sorted.length).toBeGreaterThan(0);
    for (let i = 1; i < sorted.length; i++) {
      const prev = (sorted[i - 1].displayLabel ?? sorted[i - 1].label).toLowerCase();
      const curr = (sorted[i].displayLabel ?? sorted[i].label).toLowerCase();
      expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
    }
  });

  it('trackByColumnId returns column id', () => {
    const col = { id: 'partnerName', label: 'Partner Name', visible: true };
    expect(component.trackByColumnId(0, col)).toBe('partnerName');
  });

  it('toggleColumnVisibility updates column visibility and saves to localStorage', () => {
    const col = component.sortedColumns[0];
    const initial = col.visible;
    component.toggleColumnVisibility(col);
    expect(col.visible).toBe(!initial);

    const stored = localStorage.getItem('dpds-data-table-columns');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed[col.id]).toBe(!initial);
  });

  it('toggleColumnVisibility does not hide column if it is the only visible one', () => {
    component.columnCategories.forEach((cat) => {
      cat.columns.forEach((c) => (c.visible = false));
    });
    const lastCol = component.columnCategories[0].columns[0];
    lastCol.visible = true;

    component.toggleColumnVisibility(lastCol);
    expect(lastCol.visible).toBe(true);
  });
});
