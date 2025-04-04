import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DivisionAdminComponent } from './division-admin.component';

describe('DivisionAdminComponent', () => {
  let component: DivisionAdminComponent;
  let fixture: ComponentFixture<DivisionAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DivisionAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DivisionAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
