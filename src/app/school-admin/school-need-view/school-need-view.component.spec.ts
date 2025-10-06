import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolNeedViewComponent } from './school-need-view.component';

describe('SchoolNeedViewComponent', () => {
  let component: SchoolNeedViewComponent;
  let fixture: ComponentFixture<SchoolNeedViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolNeedViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolNeedViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
