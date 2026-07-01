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
  private idleTimeoutId?: ReturnType<typeof setTimeout>;
  private userIdle = false;
  private readonly activityRemovers: Array<() => void> = [];
  private readonly activityListenerOptions: AddEventListenerOptions = {
    passive: true,
    capture: true,
  };
  private readonly activityEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'touchmove',
    'wheel',
  ] as const;
  private lastActiveHeartbeatAt = 0;
  private readonly activeHeartbeatMinIntervalMs = 120_000;
  private readonly activeCountPollIntervalMs = 60_000;
  /** Aligns with server active-visitor Mongo TTL (5 min). */
  private readonly idleThresholdMs = 5 * 60_000;

  readonly visitorCount$ = this.visitorCountSubject.asObservable();
  readonly activeVisitorCount$ = this.activeVisitorCountSubject.asObservable();
  readonly onlineUsers$ = this.onlineUsersSubject.asObservable();
  readonly isHomeRoute$ = this.isHomeRouteSubject.asObservable();

  constructor(
    private readonly httpService: HttpService,
    private readonly router: Router,
  ) {
    this.registerActivityTracking();
    this.scheduleIdleTimeout();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.bumpActivity();
        const isHome = this.isHomeUrl(event.urlAfterRedirects);
        this.isHomeRouteSubject.next(isHome);
        this.recordVisitorHitAndUpdateCount();
        const heartbeatSent = this.sendActiveHeartbeatAndUpdateCount();
        this.syncHomeActiveCount(isHome, heartbeatSent);
      });

    this.registerVisibilityHandling();
    this.resumeMonitoringIntervals();
    this.syncHomeActiveCount(this.isHomeUrl(this.router.url), false);
  }

  ngOnDestroy(): void {
    this.pauseMonitoringIntervals();
    this.clearIdleTimeout();
    for (const remove of this.activityRemovers) {
      remove();
    }
    this.activityRemovers.length = 0;
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
    if (!this.shouldSendMonitoringTraffic()) {
      return;
    }
    this.startOnlineUsersPollInterval();
    this.fetchOnlineUsers();
  }

  stopOnlineUsersPolling(resumeActiveCount = true): void {
    this.onlineUsersPollSub?.unsubscribe();
    this.onlineUsersPollSub = undefined;
    this.onlineUsersPollingActive = false;
    this.onlineUsersSubject.next(null);
    if (resumeActiveCount && this.shouldSendMonitoringTraffic() && this.isHomeUrl(this.router.url)) {
      this.syncHomeActiveCount(true, false);
    }
  }

  private fetchOnlineUsers(): void {
    if (!this.shouldSendMonitoringTraffic()) {
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
    if (!this.shouldSendMonitoringTraffic()) {
      return;
    }
    this.recordVisitorHit().subscribe({
      next: (response) => {
        this.visitorCountSubject.next(response.data.count);
      },
    });
  }

  /**
   * Sends a heartbeat unless throttled, the tab is hidden, or the user is idle.
   * Returns whether a request was actually issued so callers can avoid
   * firing a redundant active-count fetch for the same navigation.
   */
  private sendActiveHeartbeatAndUpdateCount(force = false): boolean {
    if (!this.shouldSendMonitoringTraffic()) {
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

  private syncHomeActiveCount(isHome: boolean, heartbeatSent: boolean): void {
    if (
      !isHome ||
      heartbeatSent ||
      this.onlineUsersPollingActive ||
      !this.shouldSendMonitoringTraffic()
    ) {
      return;
    }

    this.getActiveVisitorCount().subscribe({
      next: (response) => {
        this.activeVisitorCountSubject.next(response.data.activeCount);
      },
    });
  }

  private shouldSendMonitoringTraffic(): boolean {
    return !this.isDocumentHidden() && !this.userIdle;
  }

  private bumpActivity(resumeIfWasIdle = true): void {
    const wasIdle = this.userIdle;
    this.userIdle = false;
    this.scheduleIdleTimeout();
    if (resumeIfWasIdle && wasIdle && !this.isDocumentHidden()) {
      this.resumeMonitoringIntervals();
    }
  }

  private scheduleIdleTimeout(): void {
    this.clearIdleTimeout();
    this.idleTimeoutId = setTimeout(() => {
      this.idleTimeoutId = undefined;
      this.userIdle = true;
      this.pauseMonitoringIntervals();
    }, this.idleThresholdMs);
  }

  private clearIdleTimeout(): void {
    if (this.idleTimeoutId !== undefined) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = undefined;
    }
  }

  private pauseMonitoringIntervals(): void {
    this.stopHeartbeatInterval();
    this.onlineUsersPollSub?.unsubscribe();
    this.onlineUsersPollSub = undefined;
  }

  /**
   * Restarts heartbeat / online-users polling and sends an immediate heartbeat
   * when the tab becomes visible again or the user returns from idle.
   */
  private resumeMonitoringIntervals(): void {
    if (!this.shouldSendMonitoringTraffic()) {
      return;
    }

    this.startHeartbeatInterval();
    const heartbeatSent = this.sendActiveHeartbeatAndUpdateCount(true);
    if (this.onlineUsersPollingActive) {
      this.startOnlineUsersPollInterval();
      this.fetchOnlineUsers();
    } else {
      this.syncHomeActiveCount(this.isHomeUrl(this.router.url), heartbeatSent);
    }
  }

  private startOnlineUsersPollInterval(): void {
    this.onlineUsersPollSub?.unsubscribe();
    this.onlineUsersPollSub = interval(this.activeCountPollIntervalMs).subscribe(
      () => {
        this.fetchOnlineUsers();
      },
    );
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

  private registerActivityTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const bump = () => this.bumpActivity();
    for (const event of this.activityEvents) {
      window.addEventListener(event, bump, this.activityListenerOptions);
      this.activityRemovers.push(() =>
        window.removeEventListener(event, bump, this.activityListenerOptions),
      );
    }
  }

  private registerVisibilityHandling(): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.visibilityListener = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  private handleVisibilityChange(): void {
    if (this.isDocumentHidden()) {
      this.clearIdleTimeout();
      this.pauseMonitoringIntervals();
      return;
    }

    this.bumpActivity(false);
    this.resumeMonitoringIntervals();
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
