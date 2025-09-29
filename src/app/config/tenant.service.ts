import {Tenant} from "./tenants.enum";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  getCurrentDomainTenant(): Tenant {
    const domain = window.location.hostname;
    // console.log(domain);
    switch (domain) {
      case 'dev.local':
      case 'dev.mysnds.com':
        return Tenant.DEV;
      case 'tacurong.local' :
      case 'tacurong.mysnds.com':
      case 'sdotacurong.mysnds.com':
        return Tenant.TACURONG;
      default:
        return Tenant.GENSAN;
    }
  }
}

