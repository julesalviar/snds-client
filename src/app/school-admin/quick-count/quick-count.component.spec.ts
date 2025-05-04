import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuickCountComponent } from './quick-count.component';

describe('QuickCountComponent', () => {
  let component: QuickCountComponent;
  let fixture: ComponentFixture<QuickCountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickCountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuickCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
