import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import { API_ENDPOINT } from '../api-endpoints';
import { getDefaultSchoolYear } from '../date-utils';

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

/** Row from `GET /widgets/aip-status-stats`. */
export interface AipStatusStatsRowDto {
  status: string;
  count: number;
  percentage: number;
  /** Pre-formatted percentage from the API (e.g. "100", "33.33"). */
  percentageDisplay: string;
}

export interface AipStatusStatsDataDto {
  total: number;
  byStatus: AipStatusStatsRowDto[];
}

export interface AipStatusStatsResponse {
  success: boolean;
  data: AipStatusStatsDataDto;
  meta: ResourceGenerationsMetaDto;
}

/** Row from `GET /widgets/school-need-contribution-counts`. */
export interface SchoolNeedContributionCountRowDto {
  specificContribution: string;
  count: number;
}

export interface SchoolNeedContributionCountsResponse {
  success: boolean;
  data: SchoolNeedContributionCountRowDto[];
  meta: ResourceGenerationsMetaDto;
}

@Injectable({
  providedIn: 'root',
})
export class WidgetService {
  constructor(private readonly httpService: HttpService) {}

  private appendSchoolYearQuery(url: string, schoolYear?: string): string {
    const year = schoolYear?.trim() || getDefaultSchoolYear();
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}schoolYear=${encodeURIComponent(year)}`;
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

  /** AIP implementation status counts and percentages for the home widget. */
  getAipStatusStats(
    schoolYear?: string,
    schoolId?: string,
  ): Observable<AipStatusStatsResponse> {
    let url = this.appendSchoolYearQuery(API_ENDPOINT.widget.aipStatusStats, schoolYear);
    if (schoolId?.trim()) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}schoolId=${encodeURIComponent(schoolId.trim())}`;
    }
    return this.httpService.get<AipStatusStatsResponse>(url);
  }

  /** Unmet school-need counts per contribution category for the home tree widget. */
  getSchoolNeedContributionCounts(
    schoolYear?: string,
    schoolId?: string,
  ): Observable<SchoolNeedContributionCountsResponse> {
    let url = this.appendSchoolYearQuery(
      API_ENDPOINT.widget.schoolNeedContributionCounts,
      schoolYear,
    );
    if (schoolId?.trim()) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}schoolId=${encodeURIComponent(schoolId.trim())}`;
    }
    return this.httpService.get<SchoolNeedContributionCountsResponse>(url);
  }
}
