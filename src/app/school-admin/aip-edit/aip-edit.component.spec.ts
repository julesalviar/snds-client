import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AipEditComponent } from './aip-edit.component';

describe('AipEditComponent', () => {
  let component: AipEditComponent;
  let fixture: ComponentFixture<AipEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AipEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AipEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});


