import { Injectable } from '@angular/core';
import { TenantService } from '../../config/tenant.service';

const DISMISSED_KEY_PREFIX = 'snds-dismissed-announcements';

@Injectable({ providedIn: 'root' })
export class AnnouncementDismissalService {
  constructor(private readonly tenantService: TenantService) {}

  private storageKey(): string {
    return `${DISMISSED_KEY_PREFIX}-${this.tenantService.getCurrentDomainTenant()}`;
  }

  private loadMap(): Record<string, true> {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private saveMap(map: Record<string, true>): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(map));
    } catch {
      // ignore quota / private mode errors
    }
  }

  isDismissed(id: string): boolean {
    return !!this.loadMap()[id];
  }

  markDismissed(id: string): void {
    const map = this.loadMap();
    map[id] = true;
    this.saveMap(map);
  }
}
