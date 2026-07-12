import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PpaPlanService } from './ppa-plan.service';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';

describe('PpaPlanService', () => {
  let service: PpaPlanService;
  let httpService: jasmine.SpyObj<HttpService>;

  beforeEach(() => {
    httpService = jasmine.createSpyObj('HttpService', ['get', 'handleError']);
    httpService.get.and.returnValue(of({ data: [], meta: { totalItems: 0 } }));
    httpService.handleError.and.callFake((err) => {
      throw err;
    });

    TestBed.configureTestingModule({
      providers: [
        PpaPlanService,
        { provide: HttpService, useValue: httpService },
      ],
    });
    service = TestBed.inject(PpaPlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getList without division omits division query param', (done) => {
    service.getList({ page: 1, limit: 10 }).subscribe(() => {
      const url = httpService.get.calls.mostRecent().args[0] as string;
      expect(url).toBe(`${API_ENDPOINT.ppaPlan}?page=1&limit=10`);
      expect(url).not.toContain('division=');
      done();
    });
  });

  it('getList with division includes encoded division query param', (done) => {
    const division = 'School Governance & Operations Division';
    service.getList({ division }).subscribe(() => {
      const url = httpService.get.calls.mostRecent().args[0] as string;
      expect(url).toContain(
        `division=${encodeURIComponent(division)}`,
      );
      done();
    });
  });

  it('getList with whitespace-only division omits division query param', (done) => {
    service.getList({ division: '   ' }).subscribe(() => {
      const url = httpService.get.calls.mostRecent().args[0] as string;
      expect(url).toBe(API_ENDPOINT.ppaPlan);
      expect(url).not.toContain('division=');
      done();
    });
  });

  it('getList with division and other params includes all query params', (done) => {
    const division = 'Curriculum Implementation Division';
    const officeId = '507f1f77bcf86cd799439011';
    service
      .getList({ page: 2, limit: 25, officeId, division })
      .subscribe(() => {
        const url = httpService.get.calls.mostRecent().args[0] as string;
        expect(url).toContain('page=2');
        expect(url).toContain('limit=25');
        expect(url).toContain(`officeId=${encodeURIComponent(officeId)}`);
        expect(url).toContain(
          `division=${encodeURIComponent(division)}`,
        );
        done();
      });
  });
});
