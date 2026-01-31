import {Injectable} from '@angular/core';
import {BehaviorSubject, catchError, map, Observable, of} from 'rxjs';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from '../../../environments/environment';
import {TenantService} from "../../config/tenant.service";
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {SchoolNeed} from "../model/school-need.model";
import {MyContributionsResponse} from "../model/my-contribution.model";
import {AuthService} from "../../auth/auth.service";

@Injectable({
  providedIn: 'root',
})

export class UserService {
  private readonly projectTitlesSubject = new BehaviorSubject<string[]>([]);
  private readonly contributionData = new BehaviorSubject<any>(null);
  projectTitles$ = this.projectTitlesSubject.asObservable();

  constructor(private readonly httpService: HttpService) { }
  currentContribution = this.contributionData.asObservable();

  setContribution(data: any) {
    this.contributionData.next(data);
  }

  register(userData: any) {
    console.log('User registered:', userData);

    return this.httpService.post(API_ENDPOINT.auth.register, userData);
  }

  getUsersByRole(role: string, search?: string, limit?: number) {
    let url = `${environment.API_URL}/users/by-role/${role}`;
    const params: string[] = [];

    if (search) {
      params.push(`search=${encodeURIComponent(search)}`);
    }

    if (limit) {
      params.push(`limit=${limit}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.httpService.get<any[]>(url);
  }

  /**
   * List users with server-side pagination and search.
   * GET /users?page=1&limit=25&search=john
   * Backend returns { data: UserListItem[], totalItems?: number } or { data: [], total?: number }.
   */
  getUsers(params: {
    page: number;
    limit: number;
    search?: string;
    roles?: string[];
    includeReferenceAccounts?: boolean;
  }): Observable<{ data: any[]; totalItems: number }> {
    const queryParams: string[] = [];
    queryParams.push(`page=${params.page}`);
    queryParams.push(`limit=${params.limit}`);
    if (params.search?.trim()) {
      queryParams.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params.roles?.length) {
      queryParams.push(`roles=${params.roles.map((r) => encodeURIComponent(r)).join(',')}`);
    }
    if (params.includeReferenceAccounts === true) {
      queryParams.push('includeReferenceAccounts=true');
    }
    const url = `${API_ENDPOINT.users.list}?${queryParams.join('&')}`;
    return this.httpService.get<any>(url).pipe(
      map((res: any) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];
        const totalItems =
          res?.totalItems ?? res?.total ?? res?.meta?.totalItems ?? res?.meta?.total ?? data.length;
        return { data, totalItems };
      }),
      catchError(this.httpService.handleError)
    );
  }

  deleteUser(id: string): Observable<any> {
    return this.httpService.delete(`${API_ENDPOINT.users.list}/${id}`).pipe(
      catchError(this.httpService.handleError)
    );
  }

   getSchoolProfile(): any {
    const user = this.httpService.get(API_ENDPOINT.schools).pipe(
      catchError(this.httpService.handleError)
    );
    // return JSON.parse(localStorage.getItem('userProfile') ?? '{}');
     return user;
  }


  updateUserProfile(profileData: any): Observable<any> {
    localStorage.setItem('userProfile', JSON.stringify(profileData));
    return of(profileData);
  }


  changePassword(currentPassword: string, newPassword: string) {
      const payload = { currentPassword, newPassword };
      return this.httpService.patch(API_ENDPOINT.users.changePassword, payload).pipe(
        catchError(this.httpService.handleError)
      );
  }
}
