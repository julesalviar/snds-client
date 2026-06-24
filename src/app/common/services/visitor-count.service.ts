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
}

export interface OnlineUsersDataDto {
  tenantCode: string;
  activeCount: number;
  anonymousSessionCount: number;
  users: OnlineVisitorUserDto[];
}

export interface OnlineUsersSnapshot {
  activeCount: number;
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
  private activePollSub?: Subscription;
  private onlineUsersPollSub?: Subscription;
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
        this.sendActiveHeartbeatAndUpdateCount();
        this.syncHomeActivePolling(isHome);
      });

    this.heartbeatIntervalSub = interval(this.activeHeartbeatMinIntervalMs).subscribe(() => {
      this.sendActiveHeartbeatAndUpdateCount();
    });

    this.syncHomeActivePolling(this.isHomeUrl(this.router.url));
  }

  ngOnDestroy(): void {
    this.heartbeatIntervalSub?.unsubscribe();
    this.activePollSub?.unsubscribe();
    this.stopOnlineUsersPolling();
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
    this.stopOnlineUsersPolling();
    this.fetchOnlineUsers();

    this.onlineUsersPollSub = interval(this.activeCountPollIntervalMs).subscribe(() => {
      this.fetchOnlineUsers();
    });
  }

  stopOnlineUsersPolling(): void {
    this.onlineUsersPollSub?.unsubscribe();
    this.onlineUsersPollSub = undefined;
    this.onlineUsersSubject.next(null);
  }

  private fetchOnlineUsers(): void {
    this.getOnlineUsers().subscribe({
      next: (response) => {
        this.onlineUsersSubject.next({
          activeCount: response.data.activeCount,
          anonymousSessionCount: response.data.anonymousSessionCount,
          users: response.data.users,
        });
      },
      error: () => {
        this.onlineUsersSubject.next({
          activeCount: 0,
          anonymousSessionCount: 0,
          users: [],
        });
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

  private sendActiveHeartbeatAndUpdateCount(force = false): void {
    const now = Date.now();
    if (
      !force &&
      now - this.lastActiveHeartbeatAt < this.activeHeartbeatMinIntervalMs
    ) {
      return;
    }

    this.lastActiveHeartbeatAt = now;
    this.sendActiveHeartbeat().subscribe({
      next: (response) => {
        this.activeVisitorCountSubject.next(response.data.activeCount);
      },
    });
  }

  private syncHomeActivePolling(isHome: boolean): void {
    this.activePollSub?.unsubscribe();

    if (!isHome) {
      return;
    }

    this.getActiveVisitorCount().subscribe({
      next: (response) => {
        this.activeVisitorCountSubject.next(response.data.activeCount);
      },
    });

    this.activePollSub = interval(this.activeCountPollIntervalMs).subscribe(() => {
      this.getActiveVisitorCount().subscribe({
        next: (response) => {
          this.activeVisitorCountSubject.next(response.data.activeCount);
        },
      });
    });
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
