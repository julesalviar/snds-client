import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { API_ENDPOINT } from '../api-endpoints';
import { HttpService } from './http.service';
import { PpaPlan, PpaPlanListResponse } from '../model/ppa-plan.model';

export interface PpaPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  classification?: string;
  implementationStatus?: string;
  assignedUserId?: string;
  officeId?: string;
  stakeholderUserId?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PpaPlanService {
  constructor(private readonly httpService: HttpService) {}

  getList(params: PpaPlanListParams = {}): Observable<{ data: PpaPlan[]; totalItems: number }> {
    const queryParams: string[] = [];
    if (params.page != null) queryParams.push(`page=${params.page}`);
    if (params.limit != null) queryParams.push(`limit=${params.limit}`);
    if (params.search?.trim()) {
      queryParams.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params.classification?.trim()) {
      queryParams.push(`classification=${encodeURIComponent(params.classification.trim())}`);
    }
    if (params.implementationStatus?.trim()) {
      queryParams.push(
        `implementationStatus=${encodeURIComponent(params.implementationStatus.trim())}`
      );
    }
    if (params.assignedUserId?.trim()) {
      queryParams.push(`assignedUserId=${encodeURIComponent(params.assignedUserId.trim())}`);
    }
    if (params.officeId?.trim()) {
      queryParams.push(`officeId=${encodeURIComponent(params.officeId.trim())}`);
    }
    if (params.stakeholderUserId?.trim()) {
      queryParams.push(`stakeholderUserId=${encodeURIComponent(params.stakeholderUserId.trim())}`);
    }
    if (params.startDateFrom) {
      queryParams.push(`startDateFrom=${encodeURIComponent(params.startDateFrom)}`);
    }
    if (params.startDateTo) {
      queryParams.push(`startDateTo=${encodeURIComponent(params.startDateTo)}`);
    }
    const url =
      queryParams.length > 0 ? `${API_ENDPOINT.ppaPlan}?${queryParams.join('&')}` : API_ENDPOINT.ppaPlan;
    return this.httpService.get<PpaPlan[] | PpaPlanListResponse | { data?: unknown; meta?: { totalItems?: number } }>(url).pipe(
      map((res) => {
        let data: PpaPlan[] = [];
        if (Array.isArray(res)) {
          data = res;
        } else {
          const r = res as Record<string, unknown>;
          const d = r?.['data'];
          data = Array.isArray(d) ? d : (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>)['data']))
            ? ((d as Record<string, unknown>)['data'] as PpaPlan[])
            : (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>)['items']))
              ? ((d as Record<string, unknown>)['items'] as PpaPlan[])
              : [];
        }
        const meta = (res as Record<string, unknown>)?.['meta'] as { totalItems?: number } | undefined;
        const totalItems =
          (res as PpaPlanListResponse)?.totalItems ??
          (res as PpaPlanListResponse)?.total ??
          meta?.totalItems ??
          data.length;
        return { data, totalItems };
      }),
      catchError(this.httpService.handleError)
    );
  }

  getById(id: string): Observable<PpaPlan> {
    return this.httpService
      .get<PpaPlan>(`${API_ENDPOINT.ppaPlan}/${id}`)
      .pipe(catchError(this.httpService.handleError));
  }

  create(plan: PpaPlan): Observable<PpaPlan> {
    return this.httpService
      .post<PpaPlan>(API_ENDPOINT.ppaPlan, plan)
      .pipe(catchError(this.httpService.handleError));
  }

  update(id: string, plan: Partial<PpaPlan>): Observable<PpaPlan> {
    return this.httpService
      .put<PpaPlan>(`${API_ENDPOINT.ppaPlan}/${id}`, plan)
      .pipe(catchError(this.httpService.handleError));
  }

  delete(id: string): Observable<void> {
    return this.httpService
      .delete<void>(`${API_ENDPOINT.ppaPlan}/${id}`)
      .pipe(catchError(this.httpService.handleError));
  }
}
