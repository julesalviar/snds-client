import {Injectable} from "@angular/core";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {TenantService} from "../../config/tenant.service";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  constructor(
    private readonly tenantService: TenantService,
    private http: HttpClient
  ) {}

  post<T>(url: string, data: any): Observable<T> {
    const tenant = this.tenantService.getCurrentDomainTenant();
    const headers = this.getHeaders(tenant);

    return this.http.post<T>(url, data, { headers });
  }

  getHeaders(tenant: string): HttpHeaders {
    return new HttpHeaders()
      .set('tenant', tenant)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
  }
}
