import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINT } from '../api-endpoints';
import { HttpService } from './http.service';
import { PillarConfigResponse, PillarItem } from '../model/pillar-config.model';

@Injectable({ providedIn: 'root' })
export class PillarConfigService {
  private pillars: PillarItem[] = [];
  private initialized = false;

  constructor(private readonly http: HttpService) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const config = await firstValueFrom(
      this.http.get<PillarConfigResponse>(`${API_ENDPOINT.pillarConfigs}/current`),
    );
    this.pillars = config?.pillars ?? [];
    this.initialized = true;
  }

  getPillars(): PillarItem[] {
    return this.pillars;
  }

  /** Canonical value for DB / API (pillar `name`). Handles legacy displayName. */
  resolveStoredValue(stored: string | null | undefined): string {
    if (!stored?.trim()) {
      return '';
    }
    const trimmed = stored.trim();
    const byName = this.pillars.find((p) => p.name === trimmed);
    if (byName) {
      return byName.name;
    }
    const byDisplay = this.pillars.find((p) => p.displayName === trimmed);
    if (byDisplay) {
      return byDisplay.name;
    }
    return trimmed;
  }

  /** Human-readable label for UI (pillar `displayName`). */
  getDisplayLabel(stored: string | null | undefined): string {
    if (!stored?.trim()) {
      return '';
    }
    const trimmed = stored.trim();
    const byName = this.pillars.find((p) => p.name === trimmed);
    if (byName) {
      return byName.displayName;
    }
    const byDisplay = this.pillars.find((p) => p.displayName === trimmed);
    if (byDisplay) {
      return byDisplay.displayName;
    }
    return trimmed;
  }

  invalidate(): void {
    this.initialized = false;
    this.pillars = [];
  }
}
