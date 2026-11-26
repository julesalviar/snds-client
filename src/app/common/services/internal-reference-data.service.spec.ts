import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { API_ENDPOINT } from '../api-endpoints';
import { HttpService } from './http.service';
import { InternalReferenceDataService } from './internal-reference-data.service';

describe('InternalReferenceDataService', () => {
  let service: InternalReferenceDataService;
  let http: jasmine.SpyObj<HttpService>;

  beforeEach(() => {
    http = jasmine.createSpyObj('HttpService', ['get', 'put']);
    http.put.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        InternalReferenceDataService,
        { provide: HttpService, useValue: http },
      ],
    });
    service = TestBed.inject(InternalReferenceDataService);
  });

  it('sends fund sources as { value } so the update DTO accepts the body', async () => {
    const sources = ['SDO', 'CO', 'SEF'];

    await service.updateFundSources(sources);

    expect(http.put).toHaveBeenCalledWith(
      `${API_ENDPOINT.internalReferenceData}/fundSource`,
      { value: sources },
    );
  });
});
