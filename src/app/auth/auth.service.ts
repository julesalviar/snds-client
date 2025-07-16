import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {TenantService} from "../config/tenant.service";
import {API_ENDPOINT} from "../common/api-endpoints";
import {HttpService} from "../common/services/http.service";
import {catchError, map, Observable, Subscription, tap, throwError} from "rxjs";
import {AuthResponse} from "./auth-response.model";
import {response} from "express";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private readonly httpService: HttpService
  ) {
  }

  login(credentials: { userName: string; password: string }): Observable<void> {
    return this.httpService.post<AuthResponse>(
      API_ENDPOINT.auth.login,
      credentials
    ).pipe(
      tap(authResponse => {
        localStorage.setItem('token', authResponse.access_token)
      }),
      map(() => void 0), // Not exposing the token here
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    return expiry > now;
  }
}
