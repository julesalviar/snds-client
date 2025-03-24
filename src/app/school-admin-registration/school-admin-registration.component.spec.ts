import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolAdminRegistrationComponent } from './school-admin-registration.component';

describe('SchoolAdminRegistrationComponent', () => {
  let component: SchoolAdminRegistrationComponent;
  let fixture: ComponentFixture<SchoolAdminRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolAdminRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolAdminRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
