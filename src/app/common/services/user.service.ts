import {Injectable} from '@angular/core';
import {BehaviorSubject, catchError, Observable} from 'rxjs';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from '../../../environments/environment';
import {TenantService} from "../../config/tenant.service";
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {SchoolNeed} from "../model/school-need.model";

@Injectable({
  providedIn: 'root',
})

export class UserService {
  private userRole: string = 'schoolAdmin'; // Example role: schoolAdmin, divisionAdmin, stakeholder
  private readonly registeredUser: { name: string; email: string; password: string } | null = null;
  private readonly projectTitlesSubject = new BehaviorSubject<string[]>([]);
  projectTitles$ = this.projectTitlesSubject.asObservable();
  private readonly schoolsSubject = new BehaviorSubject<any[]>([]);
  schools$ = this.schoolsSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly tenantService: TenantService,
    private readonly httpService: HttpService) { }

  login(userName: string, password: string) {
    const tenant = this.tenantService.getCurrentDomainTenant();
    const headers = new HttpHeaders()
      .set('tenant', tenant)
      .set('Content-Type', 'application/json');

    const loginData = { userName, password };
    return this.http.post(`${environment.API_URL}/auth/login`, loginData, { headers });
}

  setProjectTitles(titles: string[]) {
    this.projectTitlesSubject.next(titles);
  }

  private readonly contributionData = new BehaviorSubject<any>(null);
  currentContribution = this.contributionData.asObservable();
  setContribution(data: any) {
    this.contributionData.next(data);
  }

  register(userData: any) {
    console.log('User registered:', userData);

    return this.httpService.post(API_ENDPOINT.auth.register, userData);
  }

  getUserName(): string {
    return this.registeredUser ? this.registeredUser.name : '';
  }

  getRegisteredUser() {
    return this.registeredUser;
  }

  getRole() {
    return this.userRole;
  }

  setRole(role: string) {
    this.userRole = role;
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

  changePassword(currentPassword: string, newPassword: string) {
      const payload = { currentPassword, newPassword };
      return this.httpService.patch(`${API_ENDPOINT.users}/change-password`, payload).pipe(
        catchError(this.httpService.handleError)
      );
  }
}
