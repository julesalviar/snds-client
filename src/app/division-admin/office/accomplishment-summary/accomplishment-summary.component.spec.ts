import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccomplishmentSummaryComponent } from './accomplishment-summary.component';

describe('AccomplishmentSummaryComponent', () => {
  let component: AccomplishmentSummaryComponent;
  let fixture: ComponentFixture<AccomplishmentSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccomplishmentSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccomplishmentSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
