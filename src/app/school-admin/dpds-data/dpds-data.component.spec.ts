import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DpdsDataComponent } from './dpds-data.component';

describe('DpdsDataComponent', () => {
  let component: DpdsDataComponent;
  let fixture: ComponentFixture<DpdsDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DpdsDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DpdsDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
