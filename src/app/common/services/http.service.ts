import {Injectable} from "@angular/core";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {TenantService} from "../../config/tenant.service";
import {Observable, throwError} from "rxjs";
import {TokenHolder} from "../../auth/token-holder";
import {isAuthBootstrapUrl} from "../../auth/auth-bootstrap.util";
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private readonly withCredentials = { withCredentials: true };

  constructor(
    private readonly tenantService: TenantService,
    private readonly http: HttpClient,
  ) {}

  private getHeaders(url: string): HttpHeaders {
    const tenant = this.tenantService.getCurrentDomainTenant();
    let headers = new HttpHeaders({
      tenant: tenant,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (!isAuthBootstrapUrl(url)) {
      const token = TokenHolder.getValidToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  private getUploadHeaders(url: string): HttpHeaders {
    const tenant = this.tenantService.getCurrentDomainTenant();
    let headers = new HttpHeaders({
      tenant: tenant,
      'Accept': 'application/json'
    });

    if (!isAuthBootstrapUrl(url)) {
      const token = TokenHolder.getValidToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  post<T>(url: string, data: any, extraHeaders?: Record<string, string>): Observable<T> {
    let headers = this.getHeaders(url);
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        headers = headers.set(key, value);
      }
    }

    return this.http.post<T>(url, data, {
      headers,
      ...this.withCredentials,
    });
  }

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(url, {
      headers: this.getHeaders(url),
      ...this.withCredentials,
    });
  }

  put<T>(url: string, data: any): Observable<T> {
    return this.http.put<T>(url, data, {
      headers: this.getHeaders(url),
      ...this.withCredentials,
    });
  }

  patch<T>(url: string, data: any): Observable<T> {
    return this.http.patch<T>(url, data, {
      headers: this.getHeaders(url),
      ...this.withCredentials,
    });
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url, {
      headers: this.getHeaders(url),
      ...this.withCredentials,
    });
  }

  uploadFile<T>(url: string, formData: FormData): Observable<T> {
    return this.http.post<T>(url, formData, {
      headers: this.getUploadHeaders(url),
      ...this.withCredentials,
    });
  }

  public handleError(error: any): Observable<never> {
    if (!environment.production) {
      console.error('HTTP Error:', error);
      if (error.error instanceof ErrorEvent) {
        console.error(`Client Error: ${error.error.message}`);
      } else if (error.status) {
        console.error(`Server Error: ${error.status} ${error.statusText}`);
      }
    }

    return throwError(() => error);
  }
}
