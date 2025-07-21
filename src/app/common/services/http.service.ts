import {Injectable} from "@angular/core";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {TenantService} from "../../config/tenant.service";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private readonly tenant = this.tenantService.getCurrentDomainTenant();
  private readonly headers = new HttpHeaders({
    tenant: this.tenant,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  constructor(
    private readonly tenantService: TenantService,
    private readonly http: HttpClient
  ) {}

  post<T>(url: string, data: any): Observable<T> {
    console.log(`posting url: ${url} data: ${JSON.stringify(data)}`);
    return this.http.post<T>(url, data, { headers: this.headers });
  }

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(url, { headers: this.headers });
  }
}
