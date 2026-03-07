import { TestBed } from '@angular/core/testing';

import { FieldCheckerService } from './field-checker.service';

describe('FieldCheckerService', () => {
  let service: FieldCheckerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FieldCheckerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
