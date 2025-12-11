import {Injectable} from "@angular/core";
import {catchError, Observable} from "rxjs";
import {MyContributionsResponse} from "../model/my-contribution.model";
import {EngagementsResponse} from "../model/engagement.model";
import {API_ENDPOINT} from "../api-endpoints";
import {AuthService} from "../../auth/auth.service";
import {HttpService} from "./http.service";

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
    schoolId?: string
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

    url += `?${params.join('&')}`;

    return this.httpService.get<EngagementsResponse>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  deleteEngagement(id: string): Observable<any> {
    return this.httpService.delete(`${API_ENDPOINT.engagements}/${id}`).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
