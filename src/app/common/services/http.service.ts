import {Injectable} from "@angular/core";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {TenantService} from "../../config/tenant.service";
import {Observable, throwError} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private readonly tenant = this.tenantService.getCurrentDomainTenant();

  constructor(
    private readonly tenantService: TenantService,
    private readonly http: HttpClient
  ) {}

  private getHeaders(): HttpHeaders {
    const tenant = this.tenantService.getCurrentDomainTenant();
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      tenant: tenant,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  post<T>(url: string, data: any): Observable<T> {
    console.log(`posting url: ${url} data: ${JSON.stringify(data)}`);
    return this.http.post<T>(url, data, { headers: this.getHeaders() });
  }

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(url, { headers: this.getHeaders() });
  }

  public handleError(error: any): Observable<never> {
    console.error(error);
    let message = 'An unexpected error occurred';
    if (error.error instanceof ErrorEvent) {
      message = `Client Error: ${error.error.message}`;
    } else {
      message = `Server Error: ${error.status} ${error.message}`;
    }
    console.error(message);
    return throwError(() => new Error(message));
  }
}
