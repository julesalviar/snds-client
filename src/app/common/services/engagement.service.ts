import {Injectable} from "@angular/core";
import {catchError, Observable} from "rxjs";
import {MyContributionsResponse} from "../model/my-contribution.model";
import {
  Engagement,
  EngagementRatingSummaryResponse,
  EngagementsResponse,
  EngagementStatisticsQuery,
  EngagementStatisticsResponse,
} from "../model/engagement.model";
import {API_ENDPOINT} from "../api-endpoints";
import {AuthService} from "../../auth/auth.service";
import {HttpService} from "./http.service";

export type EngagementRatingStatus = 'all' | 'rated' | 'unrated';

@Injectable({
  providedIn: 'root',
})
export class EngagementService {
  constructor(
    private readonly authService: AuthService,
    private readonly httpService: HttpService
  ) { }

  getMyContributions(schoolYear?: string): Observable<MyContributionsResponse> {
    const userId = this.authService.getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }

    let url = `${API_ENDPOINT.engagements}/my-contributions/`;

    // Add schoolYear query parameter if provided
    if (schoolYear) {
      url += `?schoolYear=${encodeURIComponent(schoolYear)}`;
    }

    return this.httpService.get<MyContributionsResponse>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getAllEngagement(
    page: number,
    limit: number,
    stakeholderUserId?: string,
    schoolYear?: string,
    specificContribution?: string,
    schoolId?: string,
    startDate?: string,
    endDate?: string,
    sector?: string,
    ratingStatus?: EngagementRatingStatus,
  ): Observable<EngagementsResponse> {
    let url = API_ENDPOINT.engagements;
    const params: string[] = [];

    if (page) {
      params.push(`page=${page}`);
    }

    if (limit) {
      params.push(`limit=${limit}`);
    }

    if (stakeholderUserId) {
      params.push(`stakeholderUserId=${encodeURIComponent(stakeholderUserId)}`);
    }

    if (schoolYear) {
      params.push(`schoolYear=${encodeURIComponent(schoolYear)}`);
    }

    if (specificContribution) {
      params.push(`specificContribution=${encodeURIComponent(specificContribution)}`);
    }

    if (schoolId) {
      params.push(`schoolId=${encodeURIComponent(schoolId)}`);
    }

    if (startDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
    }

    if (endDate) {
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (sector) {
      params.push(`sector=${encodeURIComponent(sector)}`);
    }

    if (ratingStatus && ratingStatus !== 'all') {
      params.push(`ratingStatus=${encodeURIComponent(ratingStatus)}`);
    }

    url += `?${params.join('&')}`;

    return this.httpService.get<EngagementsResponse>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getRatingSummary(filters?: {
    stakeholderUserId?: string;
    schoolYear?: string;
    specificContribution?: string;
    schoolId?: string;
    startDate?: string;
    endDate?: string;
    sector?: string;
  }): Observable<EngagementRatingSummaryResponse> {
    let url = `${API_ENDPOINT.engagements}/rating-summary`;
    const params: string[] = [];
    const q = filters ?? {};

    if (q.stakeholderUserId) {
      params.push(`stakeholderUserId=${encodeURIComponent(q.stakeholderUserId)}`);
    }
    if (q.schoolYear) {
      params.push(`schoolYear=${encodeURIComponent(q.schoolYear)}`);
    }
    if (q.specificContribution) {
      params.push(`specificContribution=${encodeURIComponent(q.specificContribution)}`);
    }
    if (q.schoolId) {
      params.push(`schoolId=${encodeURIComponent(q.schoolId)}`);
    }
    if (q.startDate) {
      params.push(`startDate=${encodeURIComponent(q.startDate)}`);
    }
    if (q.endDate) {
      params.push(`endDate=${encodeURIComponent(q.endDate)}`);
    }
    if (q.sector) {
      params.push(`sector=${encodeURIComponent(q.sector)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.httpService.get<EngagementRatingSummaryResponse>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getEngagementStatistics(
    query?: EngagementStatisticsQuery
  ): Observable<EngagementStatisticsResponse> {
    let url = `${API_ENDPOINT.engagements}/statistics`;
    const params: string[] = [];
    const q = query ?? {};

    if (q.schoolYear) {
      params.push(`schoolYear=${encodeURIComponent(q.schoolYear)}`);
    }
    if (q.sector) {
      params.push(`sector=${encodeURIComponent(q.sector)}`);
    }
    if (q.schoolId) {
      params.push(`schoolId=${encodeURIComponent(q.schoolId)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.httpService.get<EngagementStatisticsResponse>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  deleteEngagement(id: string): Observable<any> {
    return this.httpService.delete(`${API_ENDPOINT.engagements}/${id}`).pipe(
      catchError(this.httpService.handleError)
    );
  }

  updateEngagement(id: string, data: Partial<Engagement>): Observable<any> {
    return this.httpService.patch(`${API_ENDPOINT.engagements}/${id}`, data).pipe(
      catchError(this.httpService.handleError)
    );
  }

  submitRating(engagementId: string, rating: number | null): Observable<any> {
    return this.httpService
      .patch(`${API_ENDPOINT.engagements}/${engagementId}/rating`, { rating })
      .pipe(catchError(this.httpService.handleError));
  }
}
