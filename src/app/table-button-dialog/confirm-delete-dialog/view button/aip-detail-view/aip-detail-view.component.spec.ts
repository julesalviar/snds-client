import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AipDetailViewComponent } from './aip-detail-view.component';

describe('AipDetailViewComponent', () => {
  let component: AipDetailViewComponent;
  let fixture: ComponentFixture<AipDetailViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AipDetailViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AipDetailViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
