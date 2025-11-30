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

  private getUploadHeaders(): HttpHeaders {
    const tenant = this.tenantService.getCurrentDomainTenant();
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      tenant: tenant,
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  post<T>(url: string, data: any): Observable<T> {
    return this.http.post<T>(url, data, { headers: this.getHeaders() });
  }

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(url, { headers: this.getHeaders() });
  }

  put<T>(url: string, data: any): Observable<T> {
    return this.http.put<T>(url, data, { headers: this.getHeaders() });
  }

  patch<T>(url: string, data: any): Observable<T> {
    return this.http.patch<T>(url, data, { headers: this.getHeaders() });
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url, { headers: this.getHeaders() });
  }

  uploadFile<T>(url: string, formData: FormData): Observable<T> {
    return this.http.post<T>(url, formData, { headers: this.getUploadHeaders() });
  }

  public handleError(error: any): Observable<never> {
    console.error('HTTP Error:', error);

    // Preserve the original error structure so components can extract the actual error response
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      console.error(`Client Error: ${error.error.message}`);
    } else {
      // Server-side error - preserve the error response body
      console.error(`Server Error: ${error.status} ${error.statusText}`);
      if (error.error) {
        console.error('Error response body:', error.error);
      }
    }

    // Return the original error to preserve the response body
    return throwError(() => error);
  }
}
