import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { signInSessionExpiredQueryParams } from '../../auth/sign-in-session.util';

const AUTH_BOOTSTRAP_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/signup',
  '/auth/logout',
];

function isAuthBootstrapRequest(url: string): boolean {
  return AUTH_BOOTSTRAP_PATHS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthBootstrapRequest(req.url)) {
        authService.clearSession();
        const onSignIn = router.url.split(/[?#]/)[0] === '/sign-in';
        if (!onSignIn) {
          void router.navigate(['/sign-in'], {
            queryParams: signInSessionExpiredQueryParams(),
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
