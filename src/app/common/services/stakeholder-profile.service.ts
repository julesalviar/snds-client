import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../api-endpoints';
import { HttpService } from './http.service';
import {
  ListStakeholderProfilesParams,
  StakeholderProfileListResponse,
  StakeholderProfileStatisticsParams,
  StakeholderProfileStatisticsResponse,
} from '../model/stakeholder-profile.model';

@Injectable({
  providedIn: 'root',
})
export class StakeholderProfileService {
  constructor(private readonly httpService: HttpService) {}

  listProfiles(
    params: ListStakeholderProfilesParams,
  ): Observable<StakeholderProfileListResponse> {
    const query: string[] = [];

    if (params.page != null && params.page >= 1) {
      query.push(`page=${Math.floor(params.page)}`);
    }
    if (params.limit != null && params.limit >= 1) {
      query.push(`limit=${Math.floor(params.limit)}`);
    }
    if (params.search?.trim()) {
      query.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params.sector?.trim()) {
      query.push(`sector=${encodeURIComponent(params.sector.trim())}`);
    }
    if (params.schoolYear?.trim()) {
      query.push(`schoolYear=${encodeURIComponent(params.schoolYear.trim())}`);
    }
    if (params.engaged === true) {
      query.push('engaged=true');
    } else if (params.engaged === false) {
      query.push('engaged=false');
    }
    if (params.includeReferenceAccounts === true) {
      query.push('includeReferenceAccounts=true');
    }

    const url =
      query.length > 0
        ? `${API_ENDPOINT.stakeholderProfiles}?${query.join('&')}`
        : API_ENDPOINT.stakeholderProfiles;

    return this.httpService.get<StakeholderProfileListResponse>(url);
  }

  getStatistics(
    params: StakeholderProfileStatisticsParams,
  ): Observable<StakeholderProfileStatisticsResponse> {
    const query: string[] = [];

    if (params.sector?.trim()) {
      query.push(`sector=${encodeURIComponent(params.sector.trim())}`);
    }
    if (params.schoolYear?.trim()) {
      query.push(`schoolYear=${encodeURIComponent(params.schoolYear.trim())}`);
    }
    if (params.includeReferenceAccounts === true) {
      query.push('includeReferenceAccounts=true');
    }

    const url =
      query.length > 0
        ? `${API_ENDPOINT.stakeholderProfiles}/statistics?${query.join('&')}`
        : `${API_ENDPOINT.stakeholderProfiles}/statistics`;

    return this.httpService.get<StakeholderProfileStatisticsResponse>(url);
  }
}
