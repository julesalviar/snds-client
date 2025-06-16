import {Tenant} from "./tenants.enum";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  getCurrentTenant(): Tenant {
    const domain = window.location.hostname;
    console.log(domain);
    switch (domain) {
      case 'tacurong.local' :
      case 'tacurong.mysnds.com':
        return Tenant.TACURONG;
      default:
        return Tenant.GENSAN;
    }
  }
}

