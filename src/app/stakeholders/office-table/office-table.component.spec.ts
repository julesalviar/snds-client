import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfficeTableComponent } from './office-table.component';

describe('OfficeTableComponent', () => {
  let component: OfficeTableComponent;
  let fixture: ComponentFixture<OfficeTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfficeTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
