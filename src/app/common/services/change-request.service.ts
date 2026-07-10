import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_ENDPOINT } from '../api-endpoints';
import {
  ChangeRequest,
  ChangeRequestsResponse,
  ListChangeRequestsParams,
} from '../model/change-request.model';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root',
})
export class ChangeRequestService {
  constructor(private readonly httpService: HttpService) {}

  createEmailChangeRequest(requestedEmail: string): Observable<ChangeRequest> {
    return this.httpService
      .post<ChangeRequest>(API_ENDPOINT.changeRequests.base, { requestedEmail })
      .pipe(catchError(this.httpService.handleError));
  }

  getMyRequests(params?: ListChangeRequestsParams): Observable<ChangeRequestsResponse> {
    const queryParams = this.buildQueryParams(params);
    const url =
      queryParams.length > 0
        ? `${API_ENDPOINT.changeRequests.mine}?${queryParams.join('&')}`
        : API_ENDPOINT.changeRequests.mine;
    return this.httpService
      .get<ChangeRequestsResponse>(url)
      .pipe(catchError(this.httpService.handleError));
  }

  cancelRequest(id: string): Observable<ChangeRequest> {
    return this.httpService
      .patch<ChangeRequest>(`${API_ENDPOINT.changeRequests.base}/${id}/cancel`, {})
      .pipe(catchError(this.httpService.handleError));
  }

  getRequests(params?: ListChangeRequestsParams): Observable<ChangeRequestsResponse> {
    const queryParams = this.buildQueryParams(params);
    const url =
      queryParams.length > 0
        ? `${API_ENDPOINT.changeRequests.base}?${queryParams.join('&')}`
        : API_ENDPOINT.changeRequests.base;
    return this.httpService
      .get<ChangeRequestsResponse>(url)
      .pipe(catchError(this.httpService.handleError));
  }

  approveRequest(id: string): Observable<ChangeRequest> {
    return this.httpService
      .patch<ChangeRequest>(`${API_ENDPOINT.changeRequests.base}/${id}/approve`, {})
      .pipe(catchError(this.httpService.handleError));
  }

  declineRequest(id: string, reviewNote?: string): Observable<ChangeRequest> {
    return this.httpService
      .patch<ChangeRequest>(`${API_ENDPOINT.changeRequests.base}/${id}/decline`, {
        reviewNote,
      })
      .pipe(catchError(this.httpService.handleError));
  }

  private buildQueryParams(params?: ListChangeRequestsParams): string[] {
    const queryParams: string[] = [];
    if (params?.page != null) queryParams.push(`page=${params.page}`);
    if (params?.limit != null) queryParams.push(`limit=${params.limit}`);
    if (params?.status) queryParams.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.type) queryParams.push(`type=${encodeURIComponent(params.type)}`);
    if (params?.search?.trim()) {
      queryParams.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    return queryParams;
  }
}
