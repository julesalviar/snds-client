import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';

/** Row from `GET /widget/resource-generations`. */
export interface ResourceGenerationRowDto {
  totalAmount: number;
  sector: string;
}

export interface ResourceGenerationsMetaDto {
  count: number;
  timestamp: string;
}

export interface ResourceGenerationsResponse {
  success: boolean;
  data: ResourceGenerationRowDto[];
  meta: ResourceGenerationsMetaDto;
}

/** Row from `GET /widgets/partners`. */
export interface PartnerSectorRowDto {
  count: number;
  sector: string;
}

export interface PartnersResponse {
  success: boolean;
  data: PartnerSectorRowDto[];
  meta: ResourceGenerationsMetaDto;
}

@Injectable({
  providedIn: 'root',
})
export class WidgetService {
  constructor(private readonly httpService: HttpService) {}

  private appendSchoolYearQuery(url: string, schoolYear?: string): string {
    if (!schoolYear?.trim()) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}schoolYear=${encodeURIComponent(schoolYear.trim())}`;
  }

  /**
   * Division (or shared) widget: resource generation totals by sector.
   * Optional `schoolYear` is sent as a query param when provided (e.g. `2025-2026`).
   */
  getResourceGenerations(schoolYear?: string): Observable<ResourceGenerationsResponse> {
    const url = this.appendSchoolYearQuery(API_ENDPOINT.widget.resourceGenerations, schoolYear);
    return this.httpService.get<ResourceGenerationsResponse>(url);
  }

  /** Partner counts by sector for the partners pie chart. */
  getPartners(schoolYear?: string): Observable<PartnersResponse> {
    const url = this.appendSchoolYearQuery(API_ENDPOINT.widget.partners, schoolYear);
    return this.httpService.get<PartnersResponse>(url);
  }
}
