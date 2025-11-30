import {Injectable} from '@angular/core';
import {API_ENDPOINT} from "../common/api-endpoints";
import {HttpService} from "../common/services/http.service";
import {catchError, map, Observable, tap, throwError} from "rxjs";
import {AuthResponse} from "./auth-response.model";
import {JwtPayload} from "../common/model/jwt-payload.model";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly httpService: HttpService) {}

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
    return this.isTokenValid(this.getTokenPayload());
  }

  getUsername(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? payload?.username ?? '' : '';
  }

  getName(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? payload?.['name'] ?? '' : '';
  }

  getSchoolId(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? payload?.['sid'] ?? '' : '';
  }

  getActiveRole(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? payload?.activeRole ?? (payload?.role ?? '') : '';
  }

  getUserRoles(): string[] {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? payload?.roles ?? [] : [];
  }

  getUserId(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? payload?.['sub'] ?? payload?.['userId'] ?? '' : '';
  }

  private getTokenPayload(): JwtPayload | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private isTokenValid(token: JwtPayload | null): boolean {
    if (!token) return false;

    const now = Math.floor(Date.now() / 1000);
    return token.exp > now;
  }
}
