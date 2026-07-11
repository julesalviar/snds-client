import {Injectable} from '@angular/core';
import {BehaviorSubject, catchError, map, Observable} from 'rxjs';
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {getSchoolYear} from '../date-utils';
import {AccountProfile, UpdateMyProfilePayload} from '../model/account-profile.model';

@Injectable({
  providedIn: 'root',
})

export class UserService {
  private readonly projectTitlesSubject = new BehaviorSubject<string[]>([]);
  private readonly schoolYearSubject = new BehaviorSubject<string>(getSchoolYear());
  private readonly contributionData = new BehaviorSubject<any>(null);
  projectTitles$ = this.projectTitlesSubject.asObservable();
  schoolYear$ = this.schoolYearSubject.asObservable();
  currentContribution$ = this.contributionData.asObservable();

  constructor(private readonly httpService: HttpService) { }

  setContribution(data: any) {
    this.contributionData.next(data);
  }

  getContributionSnapshot(): { name?: string; specificContribution?: string } | null {
    return this.contributionData.getValue();
  }

  getSchoolYearSnapshot(): string {
    return this.schoolYearSubject.getValue();
  }

  setSchoolYear(schoolYear: string) {
    this.schoolYearSubject.next(schoolYear);
  }

  register(userData: any): Observable<{ success: boolean; message: string }> {
    return this.httpService.post<{ success: boolean; message: string }>(
      API_ENDPOINT.auth.register,
      userData,
    );
  }

  /**
   * List users with server-side pagination and search.
   * GET /users?page=1&limit=25&search=john
   */
  getUsers(params: {
    page: number;
    limit: number;
    search?: string;
    roles?: string[];
    includeReferenceAccounts?: boolean;
    tag?: string;
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
    if (params.tag?.trim()) {
      queryParams.push(`tag=${encodeURIComponent(params.tag.trim())}`);
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

  /** Division/system admin: update a user's email and login username. PATCH /users/:id/email */
  updateManagedUserEmail(userId: string, email: string): Observable<{ success: boolean }> {
    return this.httpService
      .patch<{ success: boolean }>(`${API_ENDPOINT.users.list}/${userId}/email`, { email })
      .pipe(catchError(this.httpService.handleError));
  }

  /** Division/system admin: assign tags to a user. PATCH /users/:id/tags */
  updateManagedUserTags(userId: string, tags: string[]): Observable<{ success: boolean }> {
    return this.httpService
      .patch<{ success: boolean }>(`${API_ENDPOINT.users.list}/${userId}/tags`, { tags })
      .pipe(catchError(this.httpService.handleError));
  }

  /**
   * Update a user's roles and optional school/office assignment.
   * POST /auth/users/:userId/assign-roles with body { roles, schoolId?, officeIds?, sector?, subsector? }
   */
  updateUserRoles(
    userId: string,
    payload: {
      roles: string[];
      schoolId?: string;
      officeIds?: string[];
      sector?: string;
      subsector?: string;
    }
  ): Observable<any> {
    return this.httpService.post(`${API_ENDPOINT.auth.assignRoles}/${userId}/assign-roles`, payload).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getMyProfile(): Observable<AccountProfile> {
    return this.httpService.get<AccountProfile>(API_ENDPOINT.users.profile).pipe(
      catchError(this.httpService.handleError),
    );
  }

  updateMyProfile(payload: UpdateMyProfilePayload): Observable<{ success: boolean; data: AccountProfile }> {
    return this.httpService
      .patch<{ success: boolean; data: AccountProfile }>(
        API_ENDPOINT.users.updateProfile,
        payload,
      )
      .pipe(catchError(this.httpService.handleError));
  }

  changePassword(currentPassword: string, newPassword: string) {
      const payload = { currentPassword, newPassword };
      return this.httpService.patch(API_ENDPOINT.users.changePassword, payload).pipe(
        catchError(this.httpService.handleError)
      );
  }
}
