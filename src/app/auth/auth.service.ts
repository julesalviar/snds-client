import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { API_ENDPOINT } from '../common/api-endpoints';
import { HttpService } from '../common/services/http.service';
import {
  BehaviorSubject,
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { AuthResponse } from './auth-response.model';
import { JwtPayload } from '../common/model/jwt-payload.model';
import { TokenHolder } from './token-holder';
import { signInSessionExpiredQueryParams } from './sign-in-session.util';
import {
  getRefreshBufferSeconds,
  MIN_REFRESH_INTERVAL_MS,
  shouldRefreshTokenSoon,
} from './auth-session.util';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private sessionToken: string | null = null;
  private readonly authStateSubject = new BehaviorSubject<boolean>(false);
  private refreshInFlight: Observable<boolean> | null = null;
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private lastRefreshAtMs = 0;

  readonly authState$ = this.authStateSubject.asObservable();

  constructor(
    private readonly httpService: HttpService,
    private readonly router: Router,
  ) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (
          document.visibilityState === 'visible' &&
          this.isLoggedIn() &&
          this.shouldRefreshSoon()
        ) {
          this.refreshSession().subscribe();
        }
      });
    }
  }

  initializeSession(): Observable<AuthResponse | null> {
    const hadStoredToken = !!TokenHolder.getToken();
    this.restoreTokenFromStorage();

    if (this.isLoggedIn() && !this.shouldRefreshSoon()) {
      const token = TokenHolder.getToken();
      return of(
        token
          ? ({ authenticated: true, access_token: token } as AuthResponse)
          : null,
      );
    }

    return this.refreshSession({ force: !this.isLoggedIn() }).pipe(
      map((authenticated) => {
        if (authenticated) {
          const token = TokenHolder.getToken();
          return token
            ? ({ authenticated: true, access_token: token } as AuthResponse)
            : null;
        }
        this.invalidateStaleSession(hadStoredToken);
        return null;
      }),
    );
  }

  refreshSession(options?: { force?: boolean }): Observable<boolean> {
    if (
      !options?.force &&
      this.lastRefreshAtMs > 0 &&
      Date.now() - this.lastRefreshAtMs < MIN_REFRESH_INTERVAL_MS
    ) {
      return of(this.isLoggedIn());
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.httpService
      .post<AuthResponse>(API_ENDPOINT.auth.refresh, {})
      .pipe(
        map((authResponse) => {
          if (authResponse?.authenticated && authResponse.access_token) {
            this.applyAuthResponse(authResponse);
            this.lastRefreshAtMs = Date.now();
            return true;
          }
          return false;
        }),
        catchError(() => of(false)),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight;
  }

  login(credentials: {
    userName: string;
    password: string;
  }): Observable<AuthResponse> {
    const screen = this.buildLoginScreenContext();
    const body = {
      ...credentials,
      ...(screen ? { clientContext: screen } : {}),
    };
    return this.httpService.post<AuthResponse>(API_ENDPOINT.auth.login, body).pipe(
      tap((authResponse) => this.applyAuthResponse(authResponse)),
      catchError((error) => throwError(() => error)),
    );
  }

  logout(): void {
    this.clearSession();
    this.httpService.post(API_ENDPOINT.auth.logout, {}).subscribe();
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
    TokenHolder.setSessionToken(token);
    this.syncAuthState();
    this.scheduleProactiveRefresh();
  }

  clearSession(): void {
    this.sessionToken = null;
    TokenHolder.clear();
    localStorage.removeItem('userProfile');
    this.lastRefreshAtMs = 0;
    this.clearProactiveRefresh();
    this.syncAuthState();
  }

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
    return this.isTokenValid(payload) ? (payload?.username ?? '') : '';
  }

  getName(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? (payload?.['name'] ?? '') : '';
  }

  getSchoolId(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? (payload?.['sid'] ?? '') : '';
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
    return this.isTokenValid(payload)
      ? (payload?.activeRole ?? payload?.role ?? '')
      : '';
  }

  getUserRoles(): string[] {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload) ? (payload?.roles ?? []) : [];
  }

  getUserId(): string {
    const payload = this.getTokenPayload();
    return this.isTokenValid(payload)
      ? (payload?.['sub'] ?? payload?.['userId'] ?? '')
      : '';
  }

  getAuthorizationHeader(): string | null {
    const token = this.sessionToken ?? TokenHolder.getToken();
    return token ? `Bearer ${token}` : null;
  }

  private invalidateStaleSession(redirectToSignIn: boolean): void {
    this.clearSession();
    if (redirectToSignIn) {
      void this.router.navigate(['/sign-in'], {
        queryParams: signInSessionExpiredQueryParams(),
      });
    }
  }

  private restoreTokenFromStorage(): boolean {
    const token = TokenHolder.getToken();
    if (!token) {
      return false;
    }

    const payload = this.decodeToken(token);
    if (!this.isTokenValid(payload)) {
      this.clearSession();
      return false;
    }

    this.sessionToken = token;
    TokenHolder.setSessionToken(token);
    this.syncAuthState();
    this.scheduleProactiveRefresh();
    return true;
  }

  private syncAuthState(): void {
    this.authStateSubject.next(this.isLoggedIn());
  }

  private applyAuthResponse(authResponse: AuthResponse): void {
    const token =
      authResponse?.access_token ??
      (authResponse as unknown as Record<string, string>)?.['accessToken'];
    if (!token) {
      return;
    }
    this.setSessionToken(token);
  }

  private getTokenPayload(): JwtPayload | null {
    const token = this.sessionToken ?? TokenHolder.getToken();
    return this.decodeToken(token);
  }

  private decodeToken(token: string | null): JwtPayload | null {
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

  private shouldRefreshSoon(): boolean {
    return shouldRefreshTokenSoon(this.getTokenPayload());
  }

  private scheduleProactiveRefresh(): void {
    this.clearProactiveRefresh();
    const payload = this.getTokenPayload();
    if (!payload?.exp) {
      return;
    }

    const bufferSeconds = getRefreshBufferSeconds(payload);
    const now = Math.floor(Date.now() / 1000);
    const delayMs = Math.max(0, (payload.exp - bufferSeconds - now) * 1000);
    this.refreshTimerId = setTimeout(() => {
      this.refreshSession().subscribe();
    }, delayMs);
  }

  private clearProactiveRefresh(): void {
    if (this.refreshTimerId != null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

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
