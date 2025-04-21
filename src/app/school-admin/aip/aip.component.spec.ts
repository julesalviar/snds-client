import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AipComponent } from './aip.component';

describe('AipComponent', () => {
  let component: AipComponent;
  let fixture: ComponentFixture<AipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AipComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
