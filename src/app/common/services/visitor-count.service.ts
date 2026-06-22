import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter, interval, Observable, Subscription } from 'rxjs';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';

export interface VisitorCountDataDto {
  count: number;
  tenantCode: string;
}

export interface ActiveVisitorCountDataDto {
  activeCount: number;
  tenantCode: string;
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

@Injectable({
  providedIn: 'root',
})
export class VisitorCountService implements OnDestroy {
  private readonly visitorCountSubject = new BehaviorSubject<number | null>(null);
  private readonly activeVisitorCountSubject = new BehaviorSubject<number | null>(
    null,
  );
  private readonly isHomeRouteSubject = new BehaviorSubject<boolean>(
    this.isHomeUrl(this.router.url),
  );
  private heartbeatIntervalSub?: Subscription;
  private activePollSub?: Subscription;

  readonly visitorCount$ = this.visitorCountSubject.asObservable();
  readonly activeVisitorCount$ = this.activeVisitorCountSubject.asObservable();
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

    this.heartbeatIntervalSub = interval(60_000).subscribe(() => {
      this.sendActiveHeartbeatAndUpdateCount();
    });

    this.syncHomeActivePolling(this.isHomeUrl(this.router.url));
  }

  ngOnDestroy(): void {
    this.heartbeatIntervalSub?.unsubscribe();
    this.activePollSub?.unsubscribe();
  }

  recordVisitorHit(): Observable<VisitorCountResponse> {
    return this.httpService.post<VisitorCountResponse>(
      API_ENDPOINT.widget.visitorCountHit,
      {},
    );
  }

  sendActiveHeartbeat(): Observable<ActiveVisitorCountResponse> {
    return this.httpService.post<ActiveVisitorCountResponse>(
      API_ENDPOINT.widget.visitorActiveHeartbeat,
      { sessionId: this.getActiveSessionId() },
    );
  }

  getActiveVisitorCount(): Observable<ActiveVisitorCountResponse> {
    return this.httpService.get<ActiveVisitorCountResponse>(
      API_ENDPOINT.widget.visitorActiveCount,
    );
  }

  private recordVisitorHitAndUpdateCount(): void {
    this.recordVisitorHit().subscribe({
      next: (response) => {
        this.visitorCountSubject.next(response.data.count);
      },
    });
  }

  private sendActiveHeartbeatAndUpdateCount(): void {
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

    this.activePollSub = interval(30_000).subscribe(() => {
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
