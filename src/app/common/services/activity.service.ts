import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { API_ENDPOINT } from '../api-endpoints';
import { HttpService } from './http.service';
import { Activity, ActivityListResponse } from '../model/activity.model';

export interface ActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  active?: boolean;
  stakeholderId?: string;
  schoolId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  constructor(private readonly httpService: HttpService) {}

  getList(params: ActivityListParams = {}): Observable<{ data: Activity[]; totalItems: number }> {
    const queryParams: string[] = [];
    if (params.page != null) queryParams.push(`page=${params.page}`);
    if (params.limit != null) queryParams.push(`limit=${params.limit}`);
    if (params.search?.trim()) {
      queryParams.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params.type?.trim()) {
      queryParams.push(`type=${encodeURIComponent(params.type.trim())}`);
    }
    if (params.active !== undefined) {
      queryParams.push(`active=${params.active}`);
    }
    if (params.stakeholderId?.trim()) {
      queryParams.push(`stakeholderId=${encodeURIComponent(params.stakeholderId.trim())}`);
    }
    if (params.schoolId?.trim()) {
      queryParams.push(`schoolId=${encodeURIComponent(params.schoolId.trim())}`);
    }
    const url =
      queryParams.length > 0 ? `${API_ENDPOINT.activity}?${queryParams.join('&')}` : API_ENDPOINT.activity;
    return this.httpService
      .get<Activity[] | ActivityListResponse | { data?: unknown; meta?: { totalItems?: number } }>(url)
      .pipe(
        map((res) => {
          let data: Activity[] = [];
          if (Array.isArray(res)) {
            data = res;
          } else {
            const r = res as Record<string, unknown>;
            const d = r?.['data'];
            data = Array.isArray(d)
              ? d
              : d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>)['data'])
                ? ((d as Record<string, unknown>)['data'] as Activity[])
                : d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>)['items'])
                  ? ((d as Record<string, unknown>)['items'] as Activity[])
                  : [];
          }
          const meta = (res as Record<string, unknown>)?.['meta'] as { totalItems?: number } | undefined;
          const totalItems =
            (res as ActivityListResponse)?.totalItems ??
            (res as ActivityListResponse)?.total ??
            meta?.totalItems ??
            data.length;
          return { data, totalItems };
        }),
        catchError(this.httpService.handleError)
      );
  }

  getById(id: string): Observable<Activity> {
    return this.httpService
      .get<Activity | { data: Activity }>(`${API_ENDPOINT.activity}/${id}`)
      .pipe(
        map((res: Activity | { data: Activity }) =>
          res && typeof res === 'object' && 'data' in res ? (res as { data: Activity }).data : res
        ),
        catchError(this.httpService.handleError)
      );
  }

  create(activity: Partial<Activity>): Observable<Activity> {
    return this.httpService
      .post<Activity>(API_ENDPOINT.activity, activity)
      .pipe(catchError(this.httpService.handleError));
  }

  update(id: string, activity: Partial<Activity>): Observable<Activity> {
    return this.httpService
      .put<Activity>(`${API_ENDPOINT.activity}/${id}`, activity)
      .pipe(catchError(this.httpService.handleError));
  }

  delete(id: string): Observable<void> {
    return this.httpService
      .delete<void>(`${API_ENDPOINT.activity}/${id}`)
      .pipe(catchError(this.httpService.handleError));
  }
}
