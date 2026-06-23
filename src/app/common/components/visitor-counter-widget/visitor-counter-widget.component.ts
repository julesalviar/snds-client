import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { combineLatest, map } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { UserType, getRoleLabel } from '../../../registration/user-type.enum';
import { getRoleIcon } from '../../../registration/user-type-icons';
import { getRoleChartColor } from '../../utils/material-chart-colors';
import {
  OnlineVisitorUserDto,
  VisitorCountService,
} from '../../services/visitor-count.service';

export interface OnlineUsersDisplay {
  total: number;
  users: OnlineVisitorUserDto[];
  overflowCount: number;
}

@Component({
  selector: 'app-visitor-counter-widget',
  imports: [AsyncPipe, DecimalPipe, MatIcon],
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
    map((users) => (users ? this.buildOnlineUsersDisplay(users) : null)),
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
      this.authService.getActiveRole() === UserType.DivisionAdmin;

    if (this.showOnlineUsers) {
      this.visitorCountService.startOnlineUsersPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.showOnlineUsers) {
      this.visitorCountService.stopOnlineUsersPolling();
    }
  }

  private buildOnlineUsersDisplay(
    users: OnlineVisitorUserDto[],
  ): OnlineUsersDisplay {
    const maxSlots = this.onlineUsersDisplayMax;
    const overflowSlotReserved = maxSlots > 1 ? 1 : 0;
    const maxVisibleUsers = maxSlots - overflowSlotReserved;

    if (users.length <= maxVisibleUsers) {
      return { total: users.length, users, overflowCount: 0 };
    }

    return {
      total: users.length,
      users: users.slice(0, maxVisibleUsers),
      overflowCount: users.length - maxVisibleUsers,
    };
  }
}
