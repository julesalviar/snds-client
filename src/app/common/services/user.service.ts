import {Injectable} from '@angular/core';
import {BehaviorSubject, catchError, map, Observable, of} from 'rxjs';
import {environment} from '../../../environments/environment';
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {getSchoolYear} from '../date-utils';

export interface UsersByRoleMeta {
  count: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  role?: string;
  search?: string;
}

export interface UsersByRoleResponse {
  data: any[];
  meta: UsersByRoleMeta;
}

export interface GetUsersByRoleParams {
  page?: number;
  limit?: number;
  search?: string;
  stakeholderInfo?: boolean;
  engaged?: boolean;
}

function normalizeUsersByRoleResponse(res: any): UsersByRoleResponse {
  if (Array.isArray(res)) {
    const len = res.length;
    return {
      data: res,
      meta: {
        count: len,
        totalItems: len,
        currentPage: 1,
        totalPages: len > 0 ? 1 : 0,
      },
    };
  }
  const data = Array.isArray(res?.data) ? res.data : [];
  const m = res?.meta;
  return {
    data,
    meta: {
      count: m?.count ?? data.length,
      totalItems: m?.totalItems ?? data.length,
      currentPage: m?.currentPage ?? 1,
      totalPages: m?.totalPages ?? (data.length > 0 ? 1 : 0),
      role: m?.role,
      search: m?.search,
    },
  };
}

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
    console.log('Setting school year:', schoolYear);
    this.schoolYearSubject.next(schoolYear);
  }

  register(userData: any) {
    console.log('User registered:', userData);

    return this.httpService.post(API_ENDPOINT.auth.register, userData);
  }

  getUsersByRole(role: string, params?: GetUsersByRoleParams): Observable<UsersByRoleResponse> {
    let url = `${environment.API_URL}/users/by-role/${role}`;
    const p = params ?? {};
    const query: string[] = [];

    if (p.page != null && p.page >= 1) {
      query.push(`page=${Math.floor(p.page)}`);
    }
    if (p.limit != null && p.limit >= 1) {
      query.push(`limit=${Math.floor(p.limit)}`);
    }
    if (p.search != null && String(p.search).trim() !== '') {
      query.push(`search=${encodeURIComponent(String(p.search).trim())}`);
    }
    if (p.stakeholderInfo !== undefined) {
      query.push(`stakeholderInfo=${p.stakeholderInfo ? 'true' : 'false'}`);
    }
    if (p.engaged != undefined) {
      query.push(`engaged=${p.engaged ? 'true' : 'false'}`);
    }

    if (query.length > 0) {
      url += `?${query.join('&')}`;
    }

    return this.httpService.get<any>(url).pipe(map(normalizeUsersByRoleResponse));
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

  /** Division/system admin: update a user's email and login username. PATCH /users/:id/email */
  updateManagedUserEmail(userId: string, email: string): Observable<{ success: boolean }> {
    return this.httpService
      .patch<{ success: boolean }>(`${API_ENDPOINT.users.list}/${userId}/email`, { email })
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
