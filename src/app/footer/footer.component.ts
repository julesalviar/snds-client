import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { VisitorCounterWidgetComponent } from '../common/components/visitor-counter-widget/visitor-counter-widget.component';
import { VisitorCountService } from '../common/services/visitor-count.service';
import { canShowHomeVisitorCounterWidget } from '../common/utils/visitor-counter-visibility.util';

@Component({
  selector: 'app-footer',
  imports: [AsyncPipe, VisitorCounterWidgetComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly showFooterVisitorCounter$ = this.visitorCountService.isHomeRoute$.pipe(
    map(
      (isHome) =>
        !isHome ||
        !canShowHomeVisitorCounterWidget(this.authService.getActiveRole()),
    ),
  );

  constructor(
    private readonly visitorCountService: VisitorCountService,
    private readonly authService: AuthService,
  ) {}
}
