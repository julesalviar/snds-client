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
      case 'tacurong.local' :
      case 'tacurong.mysnds.com':
      case 'sdotacurong.mysnds.com':
        return Tenant.TACURONG;
      case 'gensan.local' :
      case 'gensan.mysnds.com':
      case 'sdogensan.mysnds.com':
        return Tenant.GENSAN;
      case 'dev.local':
      case 'dev.mysnds.com':
      default:
        return Tenant.DEV;
    }
  }
}

