import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../common/services/http.service';
import { API_ENDPOINT } from '../common/api-endpoints';

export interface ConfirmEmailVerifyResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailConfirmationService {
  constructor(private readonly httpService: HttpService) {}

  /** Triggers POST /mail/confirm-email (new token + queue/send). */
  resendConfirmationEmail(to: string): Observable<unknown> {
    const normalized = to.trim().toLowerCase();
    return this.httpService.post(API_ENDPOINT.mail.confirmEmail, { to: normalized });
  }

  /** POST /mail/confirm-email/verify — marks the account email as verified. */
  verifyEmailToken(token: string): Observable<ConfirmEmailVerifyResponse> {
    return this.httpService.post<ConfirmEmailVerifyResponse>(
      API_ENDPOINT.mail.confirmEmailVerify,
      { token: token.trim() },
    );
  }
}
