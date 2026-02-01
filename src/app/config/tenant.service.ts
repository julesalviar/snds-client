import {Tenant} from "./tenants.enum";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  getCurrentDomainTenant(): Tenant {
    const domain = window.location.hostname;
    switch (domain) {
      case 'cotabato.local' :
      case 'cotabato.mysnds.com':
      case 'sdocotabato.mysnds.com':
        return Tenant.COTABATO;
      case 'gensan.local' :
      case 'gensan.mysnds.com':
      case 'sdogensan.mysnds.com':
        return Tenant.GENSAN;
      case 'kidapawan.local' :
      case 'kidapawan.mysnds.com':
      case 'sdokidapawan.mysnds.com':
        return Tenant.KIDAPAWAN;
      case 'koronadal.local' :
      case 'koronadal.mysnds.com':
      case 'sdokoronadal.mysnds.com':
        return Tenant.KORONADAL;
      case 'sarangani.local' :
      case 'sarangani.mysnds.com':
      case 'sdosarangani.mysnds.com':
        return Tenant.SARANGANI;
      case 'southcotabato.local' :
      case 'southcotabato.mysnds.com':
      case 'sdosouthcotabato.mysnds.com':
        return Tenant.SOUTH_COTABATO;
      case 'sultankudarat.local' :
      case 'sultankudarat.mysnds.com':
      case 'sdosultankudarat.mysnds.com':
        return Tenant.SULTAN_KUDARAT;
      case 'tacurong.local' :
      case 'tacurong.mysnds.com':
      case 'sdotacurong.mysnds.com':
        return Tenant.TACURONG;
      case 'davaodelsur.local' :
      case 'davaodelsur.mysnds.com':
      case 'sdodavaodelsur.mysnds.com':
        return Tenant.DAVAO_DEL_SUR;
      case 'dev.local':
      case 'dev.mysnds.com':
      default:
        return Tenant.DEV;
    }
  }
}

