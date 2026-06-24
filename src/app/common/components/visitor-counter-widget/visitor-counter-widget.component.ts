import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { combineLatest, map } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { getRoleLabel } from '../../../registration/user-type.enum';
import { getRoleIcon } from '../../../registration/user-type-icons';
import { getRoleChartColor } from '../../utils/material-chart-colors';
import {
  buildOnlineUsersDisplay,
  OnlineUsersDisplay,
} from '../../utils/visitor-counter-online-display.util';
import { canShowHomeVisitorCounterWidget } from '../../utils/visitor-counter-visibility.util';
import { VisitorCountService } from '../../services/visitor-count.service';

@Component({
  selector: 'app-visitor-counter-widget',
  imports: [AsyncPipe, DecimalPipe, MatIcon, MatIconButton, MatTooltipModule],
  templateUrl: './visitor-counter-widget.component.html',
  styleUrl: './visitor-counter-widget.component.css',
})
export class VisitorCounterWidgetComponent implements OnInit, OnDestroy {
  @Input() variant: 'footer' | 'home' = 'footer';
  @Input() alwaysShow = false;

  readonly visitorCount$ = this.visitorCountService.visitorCount$;
  readonly activeVisitorCount$ = this.visitorCountService.activeVisitorCount$;
  readonly onlineUsers$ = this.visitorCountService.onlineUsers$;
  /** Max chips in the row, including the optional “N more” overflow chip. */
  private readonly onlineUsersDisplayMax = 10;
  readonly onlineUsersDisplay$ = this.onlineUsers$.pipe(
    map((snapshot) =>
      snapshot ? this.buildOnlineUsersDisplay(snapshot) : null,
    ),
  );
  readonly homeStats$ = combineLatest([
    this.visitorCount$,
    this.activeVisitorCount$,
  ]).pipe(
    map(([visitorCount, activeVisitorCount]) => ({
      visitorCount,
      activeVisitorCount,
    })),
  );

  showOnlineUsers = false;
  readonly getRoleLabel = getRoleLabel;
  readonly getRoleIcon = getRoleIcon;
  readonly getRoleChartColor = getRoleChartColor;

  constructor(
    private readonly visitorCountService: VisitorCountService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.showOnlineUsers =
      this.variant === 'home' &&
      canShowHomeVisitorCounterWidget(this.authService.getActiveRole());

    if (this.showOnlineUsers) {
      this.visitorCountService.startOnlineUsersPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.showOnlineUsers) {
      this.visitorCountService.stopOnlineUsersPolling();
    }
  }

  buildOnlineUsersDisplay(
    snapshot: Parameters<typeof buildOnlineUsersDisplay>[0],
  ): OnlineUsersDisplay {
    return buildOnlineUsersDisplay(snapshot, this.onlineUsersDisplayMax);
  }

  guestChipTitle(anonymousSessionCount: number): string {
    const label =
      anonymousSessionCount === 1 ? 'anonymous session' : 'anonymous sessions';
    return `Guests · ${anonymousSessionCount} ${label}`;
  }

  onlineUsersHelpTooltip(display: OnlineUsersDisplay | null): string {
    if (!display) {
      return 'Signed-in users and guest browsers active on the site right now.';
    }

    const parts: string[] = [];
    if (display.users.length > 0) {
      const count = display.users.length;
      parts.push(`${count} signed-in user${count === 1 ? '' : 's'}`);
    }
    if (display.anonymousSessionCount > 0) {
      const count = display.anonymousSessionCount;
      parts.push(`${count} guest session${count === 1 ? '' : 's'}`);
    }

    const breakdown =
      parts.length > 0 ? parts.join(' and ') : 'No active sessions right now';
    return breakdown;
  }
}
