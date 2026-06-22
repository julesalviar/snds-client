import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { combineLatest, map } from 'rxjs';
import { VisitorCountService } from '../../services/visitor-count.service';

@Component({
  selector: 'app-visitor-counter-widget',
  imports: [AsyncPipe, DecimalPipe, MatIcon],
  templateUrl: './visitor-counter-widget.component.html',
  styleUrl: './visitor-counter-widget.component.css',
})
export class VisitorCounterWidgetComponent {
  @Input() variant: 'footer' | 'home' = 'footer';
  @Input() alwaysShow = false;

  readonly visitorCount$ = this.visitorCountService.visitorCount$;
  readonly activeVisitorCount$ = this.visitorCountService.activeVisitorCount$;
  readonly homeStats$ = combineLatest([
    this.visitorCount$,
    this.activeVisitorCount$,
  ]).pipe(
    map(([visitorCount, activeVisitorCount]) => ({
      visitorCount,
      activeVisitorCount,
    })),
  );

  constructor(private readonly visitorCountService: VisitorCountService) {}
}
