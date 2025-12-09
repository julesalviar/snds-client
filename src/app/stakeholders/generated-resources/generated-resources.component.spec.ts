import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratedResourcesComponent } from './generated-resources.component';

describe('GeneratedResourcesComponent', () => {
  let component: GeneratedResourcesComponent;
  let fixture: ComponentFixture<GeneratedResourcesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratedResourcesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratedResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
