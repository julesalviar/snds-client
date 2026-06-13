import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService, private readonly router: Router) {}
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAccess(route, state.url);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAccess(childRoute, state.url);
  }

  private checkAccess(route: ActivatedRouteSnapshot, url: string): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/sign-in'], { queryParams: { returnUrl: url } });
      return false;
    }

    if (!this.authService.isEmailVerifiedForAccess()) {
      this.authService.logout();
      this.router.navigate(['/sign-in'], {
        queryParams: { returnUrl: url, needEmailVerification: '1' },
      });
      return false;
    }

    const routeData = this.getInheritedRouteData(route);
    const roleType = routeData['roleType'];
    const allowedRoles = routeData['allowedRoles'] || (roleType ? [roleType] : null);

    if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      const activeRole = this.authService.getActiveRole();
      if (!allowedRoles.includes(activeRole)) {
        this.router.navigate(['/home']);
        return false;
      }
    }

    return true;
  }

  private getInheritedRouteData(route: ActivatedRouteSnapshot): Record<string, unknown> {
    return route.pathFromRoot.reduce<Record<string, unknown>>((merged, snapshot) => {
      return { ...merged, ...snapshot.data };
    }, {});
  }
}
