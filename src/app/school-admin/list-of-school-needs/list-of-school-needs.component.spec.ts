import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListOfSchoolNeedsComponent } from './list-of-school-needs.component';

describe('ListOfSchoolNeedsComponent', () => {
  let component: ListOfSchoolNeedsComponent;
  let fixture: ComponentFixture<ListOfSchoolNeedsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListOfSchoolNeedsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListOfSchoolNeedsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
