import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllSchoolComponent } from './all-school.component';

describe('AllSchoolComponent', () => {
  let component: AllSchoolComponent;
  let fixture: ComponentFixture<AllSchoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllSchoolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllSchoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
