import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StakeholdersProfileComponent } from './stakeholders-profile.component';

describe('StakeholdersProfileComponent', () => {
  let component: StakeholdersProfileComponent;
  let fixture: ComponentFixture<StakeholdersProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StakeholdersProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StakeholdersProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
