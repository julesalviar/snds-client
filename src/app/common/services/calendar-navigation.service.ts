import { Injectable } from '@angular/core';
import { PpaPlan } from '../model/ppa-plan.model';

@Injectable({ providedIn: 'root' })
export class CalendarNavigationService {
  private planToOpen: PpaPlan | null = null;

  setPlanToOpen(plan: PpaPlan): void {
    this.planToOpen = plan;
  }

  getAndClearPlanToOpen(): PpaPlan | null {
    const plan = this.planToOpen;
    this.planToOpen = null;
    return plan;
  }
}
