import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter, interval, Observable, Subscription } from 'rxjs';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';
import { environment } from '../../../environments/environment';

export interface VisitorCountDataDto {
  count: number;
  tenantCode: string;
}

export interface ActiveVisitorCountDataDto {
  activeCount: number;
  tenantCode: string;
}

export interface OnlineVisitorUserDto {
  userId: string;
  displayName: string;
  activeRole: string;
  lastSeen: string;
  sessionCount: number;
}

export interface OnlineUsersDataDto {
  tenantCode: string;
  activeCount: number;
  signedInUserCount: number;
  anonymousSessionCount: number;
  users: OnlineVisitorUserDto[];
}

export interface OnlineUsersSnapshot {
  activeCount: number;
  signedInUserCount: number;
  anonymousSessionCount: number;
  users: OnlineVisitorUserDto[];
}

export interface VisitorCountResponse {
  success: boolean;
  data: VisitorCountDataDto;
  meta: { timestamp: string };
}

export interface ActiveVisitorCountResponse {
  success: boolean;
  data: ActiveVisitorCountDataDto;
  meta: { timestamp: string };
}

export interface OnlineUsersResponse {
  success: boolean;
  data: OnlineUsersDataDto;
  meta: { timestamp: string };
}

@Injectable({
  providedIn: 'root',
})
export class VisitorCountService implements OnDestroy {
  private readonly visitorCountSubject = new BehaviorSubject<number | null>(null);
  private readonly activeVisitorCountSubject = new BehaviorSubject<number | null>(
    null,
  );
  private readonly onlineUsersSubject = new BehaviorSubject<
    OnlineUsersSnapshot | null
  >(null);
  private readonly isHomeRouteSubject = new BehaviorSubject<boolean>(
    this.isHomeUrl(this.router.url),
  );
  private heartbeatIntervalSub?: Subscription;
  private onlineUsersPollSub?: Subscription;
  private onlineUsersPollingActive = false;
  private visibilityListener?: () => void;
  private lastActiveHeartbeatAt = 0;
  private readonly activeHeartbeatMinIntervalMs = 120_000;
  private readonly activeCountPollIntervalMs = 60_000;

  readonly visitorCount$ = this.visitorCountSubject.asObservable();
  readonly activeVisitorCount$ = this.activeVisitorCountSubject.asObservable();
  readonly onlineUsers$ = this.onlineUsersSubject.asObservable();
  readonly isHomeRoute$ = this.isHomeRouteSubject.asObservable();

  constructor(
    private readonly httpService: HttpService,
    private readonly router: Router,
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const isHome = this.isHomeUrl(event.urlAfterRedirects);
        this.isHomeRouteSubject.next(isHome);
        this.recordVisitorHitAndUpdateCount();
        const heartbeatSent = this.sendActiveHeartbeatAndUpdateCount();
        this.syncHomeActiveCount(isHome, heartbeatSent);
      });

    this.startHeartbeatInterval();
    this.registerVisibilityHandling();
    this.syncHomeActiveCount(this.isHomeUrl(this.router.url), false);
  }

  ngOnDestroy(): void {
    this.stopHeartbeatInterval();
    this.stopOnlineUsersPolling(false);
    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = undefined;
    }
  }

  recordVisitorHit(): Observable<VisitorCountResponse> {
    return this.httpService.post<VisitorCountResponse>(
      API_ENDPOINT.widget.visitorCountHit,
      {},
    );
  }

  sendActiveHeartbeat(): Observable<ActiveVisitorCountResponse> {
    const extraHeaders = environment.production
      ? undefined
      : { 'X-Snds-Dev-Session': '1' };

    return this.httpService.post<ActiveVisitorCountResponse>(
      API_ENDPOINT.widget.visitorActiveHeartbeat,
      { sessionId: this.getActiveSessionId() },
      extraHeaders,
    );
  }

  getActiveVisitorCount(): Observable<ActiveVisitorCountResponse> {
    return this.httpService.get<ActiveVisitorCountResponse>(
      API_ENDPOINT.widget.visitorActiveCount,
    );
  }

  getOnlineUsers(): Observable<OnlineUsersResponse> {
    return this.httpService.get<OnlineUsersResponse>(
      API_ENDPOINT.widget.visitorOnlineUsers,
    );
  }

  startOnlineUsersPolling(): void {
    this.stopOnlineUsersPolling(false);
    this.onlineUsersPollingActive = true;
    this.fetchOnlineUsers();

    this.onlineUsersPollSub = interval(this.activeCountPollIntervalMs).subscribe(() => {
      this.fetchOnlineUsers();
    });
  }

  stopOnlineUsersPolling(resumeActiveCount = true): void {
    this.onlineUsersPollSub?.unsubscribe();
    this.onlineUsersPollSub = undefined;
    this.onlineUsersPollingActive = false;
    this.onlineUsersSubject.next(null);
    if (resumeActiveCount && this.isHomeUrl(this.router.url)) {
      this.syncHomeActiveCount(true, false);
    }
  }

  private fetchOnlineUsers(): void {
    if (this.isDocumentHidden()) {
      return;
    }
    this.getOnlineUsers().subscribe({
      next: (response) => {
        const signedInUserCount = response.data.signedInUserCount ?? 0;
        const anonymousSessionCount = response.data.anonymousSessionCount ?? 0;
        const activeTotal = signedInUserCount + anonymousSessionCount;

        this.onlineUsersSubject.next({
          activeCount: activeTotal,
          signedInUserCount,
          anonymousSessionCount,
          users: response.data.users,
        });
        this.activeVisitorCountSubject.next(activeTotal);
      },
      error: () => {
        this.onlineUsersSubject.next({
          activeCount: 0,
          signedInUserCount: 0,
          anonymousSessionCount: 0,
          users: [],
        });
        this.activeVisitorCountSubject.next(0);
      },
    });
  }

  private recordVisitorHitAndUpdateCount(): void {
    this.recordVisitorHit().subscribe({
      next: (response) => {
        this.visitorCountSubject.next(response.data.count);
      },
    });
  }

  /**
   * Sends a heartbeat unless throttled or the tab is hidden.
   * Returns whether a request was actually issued so callers can avoid
   * firing a redundant active-count fetch for the same navigation.
   */
  private sendActiveHeartbeatAndUpdateCount(force = false): boolean {
    if (this.isDocumentHidden()) {
      return false;
    }

    const now = Date.now();
    if (
      !force &&
      now - this.lastActiveHeartbeatAt < this.activeHeartbeatMinIntervalMs
    ) {
      return false;
    }

    this.lastActiveHeartbeatAt = now;
    this.sendActiveHeartbeat().subscribe({
      next: (response) => {
        this.activeVisitorCountSubject.next(response.data.activeCount);
      },
    });
    return true;
  }

  /**
   * Populates the active count on the home route with a single request.
   * Ongoing updates come from the 120s heartbeat (which also returns the
   * count), so there is no separate recurring count poll to avoid the
   * heartbeat + poll double-fetch. Skipped when a heartbeat was just sent,
   * when the who's-online widget is polling (it returns the count too), or
   * when the tab is hidden.
   */
  private syncHomeActiveCount(isHome: boolean, heartbeatSent: boolean): void {
    if (
      !isHome ||
      heartbeatSent ||
      this.onlineUsersPollingActive ||
      this.isDocumentHidden()
    ) {
      return;
    }

    this.getActiveVisitorCount().subscribe({
      next: (response) => {
        this.activeVisitorCountSubject.next(response.data.activeCount);
      },
    });
  }

  private startHeartbeatInterval(): void {
    this.stopHeartbeatInterval();
    this.heartbeatIntervalSub = interval(
      this.activeHeartbeatMinIntervalMs,
    ).subscribe(() => {
      this.sendActiveHeartbeatAndUpdateCount();
    });
  }

  private stopHeartbeatInterval(): void {
    this.heartbeatIntervalSub?.unsubscribe();
    this.heartbeatIntervalSub = undefined;
  }

  private registerVisibilityHandling(): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.visibilityListener = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  /**
   * Pauses all monitoring traffic while the tab is backgrounded and resumes
   * (with an immediate refresh) when it becomes visible again. Background tabs
   * were a primary driver of app-wide heartbeat/poll fan-out.
   */
  private handleVisibilityChange(): void {
    if (this.isDocumentHidden()) {
      this.stopHeartbeatInterval();
      this.onlineUsersPollSub?.unsubscribe();
      this.onlineUsersPollSub = undefined;
      return;
    }

    this.startHeartbeatInterval();
    const heartbeatSent = this.sendActiveHeartbeatAndUpdateCount(true);
    if (this.onlineUsersPollingActive) {
      this.fetchOnlineUsers();
      this.onlineUsersPollSub = interval(
        this.activeCountPollIntervalMs,
      ).subscribe(() => {
        this.fetchOnlineUsers();
      });
    } else {
      this.syncHomeActiveCount(this.isHomeUrl(this.router.url), heartbeatSent);
    }
  }

  private isDocumentHidden(): boolean {
    return (
      typeof document !== 'undefined' && document.visibilityState === 'hidden'
    );
  }

  private getActiveSessionId(): string {
    const storageKey = 'snds:active-visitor-session';
    let sessionId = sessionStorage.getItem(storageKey);

    if (!sessionId) {
      sessionId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
  }

  private isHomeUrl(url: string): boolean {
    const path = url.split(/[?#;]/)[0];
    return path === '/home' || path === '/';
  }
}
