import {Injectable} from "@angular/core";
import {catchError, Observable} from "rxjs";
import {MyContributionsResponse} from "../model/my-contribution.model";
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

    let url = `${API_ENDPOINT.engagements}/my-contributions/summary`;
    
    // Add schoolYear query parameter if provided
    if (schoolYear) {
      url += `?schoolYear=${encodeURIComponent(schoolYear)}`;
    }
    
    return this.httpService.get<MyContributionsResponse>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
