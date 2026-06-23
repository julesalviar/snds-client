import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpContext,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { signInSessionExpiredQueryParams } from '../../auth/sign-in-session.util';
import { AUTH_RETRY_CONTEXT } from '../../auth/auth-retry.context';
import { TokenHolder } from '../../auth/token-holder';

const AUTH_BOOTSTRAP_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/signup',
  '/auth/logout',
];

function isAuthBootstrapRequest(url: string): boolean {
  return AUTH_BOOTSTRAP_PATHS.some((path) => url.includes(path));
}

function handleSessionExpired(
  authService: AuthService,
  router: Router,
): void {
  authService.clearSession();
  const onSignIn = router.url.split(/[?#]/)[0] === '/sign-in';
  if (!onSignIn) {
    void router.navigate(['/sign-in'], {
      queryParams: signInSessionExpiredQueryParams(),
    });
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthBootstrapRequest(req.url)) {
        return throwError(() => error);
      }

      if (req.context.get(AUTH_RETRY_CONTEXT)) {
        handleSessionExpired(authService, router);
        return throwError(() => error);
      }

      return authService.refreshSession({ force: true }).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            handleSessionExpired(authService, router);
            return throwError(() => error);
          }

          const token = TokenHolder.getToken();
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const retryReq = req.clone({
            context: new HttpContext().set(AUTH_RETRY_CONTEXT, true),
            setHeaders: headers,
          });
          return next(retryReq);
        }),
      );
    }),
  );
};
