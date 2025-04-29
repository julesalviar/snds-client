import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImplementationStatusDialogComponent } from './implementation-status-dialog.component';

describe('ImplementationStatusDialogComponent', () => {
  let component: ImplementationStatusDialogComponent;
  let fixture: ComponentFixture<ImplementationStatusDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImplementationStatusDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImplementationStatusDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
