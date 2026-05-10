import {Injectable} from '@angular/core';
import {API_ENDPOINT} from "../common/api-endpoints";
import {HttpService} from "../common/services/http.service";
import {catchError, Observable, tap, throwError} from "rxjs";
import {AuthResponse} from "./auth-response.model";
import {JwtPayload} from "../common/model/jwt-payload.model";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly httpService: HttpService) {
  }

  login(credentials: { userName: string; password: string }): Observable<AuthResponse> {
    const screen = this.buildLoginScreenContext();
    const body = {
      ...credentials,
      ...(screen ? { clientContext: screen } : {}),
    };
    return this.httpService.post<AuthResponse>(
      API_ENDPOINT.auth.login,
      body
    ).pipe(
      tap(authResponse => {
        const token = authResponse?.access_token ?? (authResponse as unknown as Record<string, string>)?.['accessToken'];
        if (!token) {
          throw new Error('Login response missing token');
        }
        localStorage.setItem('token', token);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  /**
   * Whether the current JWT allows API access for email verification.
   * Matches backend JwtAuthGuard: `false` blocks; `true` or omitted (legacy token) allows.
   */
  isEmailVerifiedForAccess(): boolean {
    const payload = this.getTokenPayload();
    if (!this.isTokenValid(payload)) {
      return false;
    }
    if (payload?.emailVerified === false) {
      return false;
    }
    return true;
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

  getOfficeIds(): string[] {
    const payload = this.getTokenPayload();
    if (!this.isTokenValid(payload)) return [];
    const oids = payload?.['oids'];
    if (oids == null) return [];
    if (Array.isArray(oids)) {
      return oids.map((id) => String(id ?? '').trim()).filter(Boolean);
    }
    if (typeof oids === 'string') {
      return oids.split(',').map((id) => id.trim()).filter(Boolean);
    }
    return [];
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

  /** Screen dimensions for login audit (`${width}x${height}` on server). */
  private buildLoginScreenContext():
    | { screenWidth: number; screenHeight: number }
    | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const w = window.screen?.width;
    const h = window.screen?.height;
    if (w == null || h == null || w <= 0 || h <= 0) {
      return undefined;
    }
    return { screenWidth: w, screenHeight: h };
  }
}
