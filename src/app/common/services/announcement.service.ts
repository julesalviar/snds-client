import { Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';
import {
  Announcement,
  AnnouncementAiStatus,
  AnnouncementListResponse,
  AnnouncementResponse,
  GenerateAnnouncementContentRequest,
  GenerateAnnouncementImageResponse,
  RoleSubordinatesResponse,
} from '../model/announcement.model';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  constructor(private readonly httpService: HttpService) {}

  getActive(location = 'home'): Observable<Announcement[]> {
    const url = `${API_ENDPOINT.announcements}/active?location=${encodeURIComponent(location)}`;
    return this.httpService.get<AnnouncementListResponse | Announcement[]>(url).pipe(
      map((res) => (Array.isArray(res) ? res : res?.data ?? [])),
      catchError(this.httpService.handleError)
    );
  }

  getAnnouncements(params: {
    page: number;
    limit: number;
    search?: string;
  }): Observable<{ data: Announcement[]; totalItems: number }> {
    const query = [`page=${params.page}`, `limit=${params.limit}`];
    if (params.search?.trim()) {
      query.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    const url = `${API_ENDPOINT.announcements}?${query.join('&')}`;
    return this.httpService.get<AnnouncementListResponse>(url).pipe(
      map((res) => ({
        data: res?.data ?? [],
        totalItems: res?.meta?.totalItems ?? res?.data?.length ?? 0,
      })),
      catchError(this.httpService.handleError)
    );
  }

  getById(id: string): Observable<Announcement> {
    return this.httpService.get<AnnouncementResponse | Announcement>(`${API_ENDPOINT.announcements}/${id}`).pipe(
      map((res) => ('data' in res && res.data ? res.data : res as Announcement)),
      catchError(this.httpService.handleError)
    );
  }

  create(payload: Partial<Announcement>): Observable<Announcement> {
    return this.httpService.post<AnnouncementResponse | Announcement>(API_ENDPOINT.announcements, payload).pipe(
      map((res) => ('data' in res && res.data ? res.data : res as Announcement)),
      catchError(this.httpService.handleError)
    );
  }

  update(id: string, payload: Partial<Announcement>): Observable<Announcement> {
    return this.httpService.put<AnnouncementResponse | Announcement>(`${API_ENDPOINT.announcements}/${id}`, payload).pipe(
      map((res) => ('data' in res && res.data ? res.data : res as Announcement)),
      catchError(this.httpService.handleError)
    );
  }

  delete(id: string): Observable<unknown> {
    return this.httpService.delete(`${API_ENDPOINT.announcements}/${id}`).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getRoleSubordinates(): Observable<RoleSubordinatesResponse> {
    return this.httpService.get<RoleSubordinatesResponse>(API_ENDPOINT.users.rolesSubordinates).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getAiStatus(): Observable<AnnouncementAiStatus> {
    return this.httpService.get<AnnouncementAiStatus>(`${API_ENDPOINT.announcements}/ai/status`).pipe(
      catchError(this.httpService.handleError)
    );
  }

  generateContent(payload: GenerateAnnouncementContentRequest): Observable<GenerateAnnouncementImageResponse> {
    return this.httpService.post<GenerateAnnouncementImageResponse>(
      `${API_ENDPOINT.announcements}/ai/generate`,
      payload,
    ).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
