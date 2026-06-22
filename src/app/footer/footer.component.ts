import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { VisitorCounterWidgetComponent } from '../common/components/visitor-counter-widget/visitor-counter-widget.component';
import { VisitorCountService } from '../common/services/visitor-count.service';

@Component({
  selector: 'app-footer',
  imports: [AsyncPipe, VisitorCounterWidgetComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly isHomeRoute$ = this.visitorCountService.isHomeRoute$;

  constructor(private readonly visitorCountService: VisitorCountService) {}
}
