import { Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';
import { Office, OfficeListResponse } from '../model/office.model';

@Injectable({ providedIn: 'root' })
export class OfficeService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch offices from the backend.
   * GET /office?page=1&limit=10&search=...&ids=...&includePpaPlanCount=true
   */
  getOffices(params: {
    page: number;
    limit: number;
    search?: string;
    ids?: string[];
    division?: string;
    includePpaPlanCount?: boolean;
  }): Observable<{ data: Office[]; totalItems: number }> {
    const queryParams: string[] = [];
    queryParams.push(`page=${params.page}`, `limit=${params.limit}`);
    if (params.search?.trim()) {
      queryParams.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params.ids?.length) {
      queryParams.push(`ids=${params.ids.map((id) => encodeURIComponent(id)).join(',')}`);
    }
    if (params.division?.trim()) {
      queryParams.push(`division=${encodeURIComponent(params.division.trim())}`);
    }
    if (params.includePpaPlanCount) {
      queryParams.push('includePpaPlanCount=true');
    }
    const url = `${API_ENDPOINT.offices}?${queryParams.join('&')}`;
    return this.httpService.get<OfficeListResponse | Office[]>(url).pipe(
      map((res: OfficeListResponse | Office[]) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];
        const totalItems =
          !Array.isArray(res) && res
            ? res.totalItems ?? res.total ?? data.length
            : data.length;
        return { data, totalItems };
      }),
      catchError(this.httpService.handleError)
    );
  }

  getOfficesForNavigation(): Observable<Office[]> {
    return this.getOffices({
      page: 1,
      limit: 1000,
      includePpaPlanCount: true,
    }).pipe(map((res) => res.data));
  }

  /** Fetch a single office by ID. */
  getById(id: string): Observable<Office> {
    return this.httpService
      .get<Office | { data: Office }>(`${API_ENDPOINT.offices}/${id}`)
      .pipe(
        map((res: Office | { data: Office }) =>
          res && typeof res === 'object' && 'data' in res ? (res as { data: Office }).data : res
        ),
        catchError(this.httpService.handleError)
      );
  }

  /** Create a new office. */
  create(office: Partial<Office>): Observable<Office> {
    return this.httpService
      .post<Office>(API_ENDPOINT.offices, office)
      .pipe(catchError(this.httpService.handleError));
  }

  /** Update an existing office. */
  update(id: string, office: Partial<Office>): Observable<Office> {
    return this.httpService
      .put<Office>(`${API_ENDPOINT.offices}/${id}`, office)
      .pipe(catchError(this.httpService.handleError));
  }

  /** Delete an office. */
  delete(id: string): Observable<void> {
    return this.httpService
      .delete<void>(`${API_ENDPOINT.offices}/${id}`)
      .pipe(catchError(this.httpService.handleError));
  }
}
