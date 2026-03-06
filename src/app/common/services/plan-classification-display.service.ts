import { Injectable } from '@angular/core';
import { TenantService } from '../../config/tenant.service';
import { Tenant } from '../../config/tenants.enum';
import { PLAN_CLASSIFICATION_GENSAN_DISPLAY_MAP } from '../enums/plan-classification.enum';

/**
 * Shared display labels for PPA plan classification.
 * For Gensan/Dev tenants uses Project Champ labels; otherwise 5 Point Reform Agenda.
 * Stored/API values remain the same; only display text and column title vary.
 */
@Injectable({
  providedIn: 'root',
})
export class PlanClassificationDisplayService {
  constructor(private readonly tenantService: TenantService) {}

  private get useGensanDisplay(): boolean {
    const t = this.tenantService.getCurrentDomainTenant();
    return t === Tenant.GENSAN || t === Tenant.DEV;
  }

  /** Display text for a classification value (e.g. in table cells and dropdowns). */
  getDisplayText(value: string | null | undefined): string {
    if (value == null || value === '') return value ?? '';
    if (this.useGensanDisplay) {
      return PLAN_CLASSIFICATION_GENSAN_DISPLAY_MAP[value as keyof typeof PLAN_CLASSIFICATION_GENSAN_DISPLAY_MAP] ?? value;
    }
    return value;
  }

  /** Column/label title for the classification field. */
  getDisplayTitle(): string {
    return this.useGensanDisplay ? 'DEPED PILLAR (Project Champ)' : '5 Point Reform Agenda';
  }
}
