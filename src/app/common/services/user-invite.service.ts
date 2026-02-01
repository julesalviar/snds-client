import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';
import { UserInvitesResponse } from '../model/user-invite.model';

export interface GetInvitesParams {
  page?: number;
  limit?: number;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserInviteService {
  constructor(private readonly httpService: HttpService) {}

  sendInvite(emails: string[]): Observable<unknown> {
    const trimmed = emails.map((e) => e.trim()).filter((e) => e.length > 0);
    return this.httpService
      .post(API_ENDPOINT.mail.invite, { emails: trimmed })
      .pipe(catchError(this.httpService.handleError));
  }

  getInvites(params?: GetInvitesParams): Observable<UserInvitesResponse> {
    const queryParams: string[] = [];
    if (params?.page != null) queryParams.push(`page=${params.page}`);
    if (params?.limit != null) queryParams.push(`limit=${params.limit}`);
    if (params?.email?.trim()) {
      queryParams.push(`email=${encodeURIComponent(params.email.trim())}`);
    }
    const url =
      queryParams.length > 0
        ? `${API_ENDPOINT.userInvites}?${queryParams.join('&')}`
        : API_ENDPOINT.userInvites;
    return this.httpService
      .get<UserInvitesResponse>(url)
      .pipe(catchError(this.httpService.handleError));
  }
}
