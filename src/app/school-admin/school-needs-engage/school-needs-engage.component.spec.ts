import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolNeedsEngageComponent } from './school-needs-engage.component';

describe('SchoolNeedsEngageComponent', () => {
  let component: SchoolNeedsEngageComponent;
  let fixture: ComponentFixture<SchoolNeedsEngageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolNeedsEngageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolNeedsEngageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
